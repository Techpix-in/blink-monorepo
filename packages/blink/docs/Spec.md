Real-Time Update Service

This document outlines the key components and functionality of our real-time update service, focusing on client connections, group subscriptions, and the refined tag-based message routing strategy.

Client Connection
Clients join the real-time update service through a WebSocket connection, which provides a persistent, full-duplex communication channel between the client and the server.

To establish a connection:
1. The client initiates a WebSocket connection to the server.
2. The server authenticates the client using a token or session ID. For authentication, the service will trigger the user authentication webhook.
3. Upon successful authentication, the server establishes the WebSocket connection.

Brief Interruption Scenario
When a client disconnects briefly and then reconnects, we’ll implement the following process:
Connection Monitoring: The server continuously monitors the WebSocket connection status.
Disconnect Detection: When a disconnect is detected, the server starts a short-lived timer (e.g., 30 seconds).
Client Reconnection: If the client reconnects within the timer period:
The server validates the client’s authentication.
If successful, the server restores the client’s previous subscriptions and tag associations.
The server sends any missed messages from the brief disconnection period.
Session Restoration: The client receives a session restoration confirmation and resumes normal operation.
Long Disconnect Scenario
For scenarios where a client is disconnected for an extended period, we’ll implement the following:
Inactivity Timer: When a client disconnects, the server starts an inactivity timer (e.g., 15 minutes).
Client Removal: If the client doesn’t reconnect before the timer expires:
The server removes the client from all subscribed groups.
The server clears the client’s session data and tag associations.
Reactivation Process: If the client reconnects after being removed:
The client must re-authenticate and establish a new WebSocket connection.
The server treats this as a new connection, requiring the client to re-subscribe to groups and re-establish tag associations.

Webhook Configuration

Webhook Endpoints
When integrating this service on a backend system, the backend should expose the following webhook endpoints:
User Authentication Webhook
Endpoint: `/webhook/auth`
Method: POST
Purpose: Validate user credentials and return user permissions and groups

Request
{
  "auth_type": "TOKEN_AUTH",
  "token_type": "JWT",
  "token": "string",
}
Response
Success Response
Status code: 200
body
{
  "success": true,
  "data": {
    "client_identifier": “string”
    "permissions": ["permission1", "permission2"],
    "groups": ["group1", "group2"]
  }
}
Failure Response
Status code != 200


Group Subscriptions

Clients can subscribe to specific groups or channels to receive updates relevant to their interests.

To subscribe to a group:
1. The client sends a subscription request to the server
2. The service fetches the user groups available with it (from the User auth webhook invocation during connection)
3a. If the group is not allowed, the request is aborted with a message indicating inability to authenticate the user.
3b. If the group is allowed, the requested group is verified against the allowed groups. If permitted, the server adds the client to the group's subscriber list along with their associated tags.
Tag-Based Message Routing

Our routing strategy uses tags to determine which users in a group should receive a particular message or event. An event is routed to a user only when the event's tags are a complete match or a subset of the user's tags.

Key aspects of this strategy:

1. User Tags: Each user has a set of tags associated with them.
2. Event Tags: When an event is sent to a group, it includes a set of tags that define its target audience.
3. Routing Logic: An event is routed to a user if and only if the event's tags are a complete match or a subset of the user's tags.

Example Scenarios

1. Broad Event:
   - Event tags: ['developer']
   - User tags: ['developer', 'frontend', 'react']
   - Result: User receives the event

2. Specific Event:
   - Event tags: ['frontend', 'react']
   - User tags: ['developer', 'frontend', 'react', 'typescript']
   - Result: User receives the event

3. Mismatched Event:
   - Event tags: ['backend', 'database']
   - User tags: ['developer', 'frontend', 'react']
   - Result: User does not receive the event

4. Partial Match Event:
   - Event tags: ['frontend', 'angular']
   - User tags: ['developer', 'frontend', 'react']
   - Result: User does not receive the event (despite 'frontend' match)

Implications of the Routing Logic
1. Precision: This approach ensures that users only receive messages that are highly relevant to their specific tag set.
2. Reduced Noise: Users are less likely to receive messages that are only partially relevant to their interests.
3. Hierarchical Tags: This system supports hierarchical tag structures where broader categories can encompass more specific ones.
4. Tag Strategy: Event publishers need to be strategic about their tag usage to maximize reach while ensuring relevance.

Considerations for Implementation
1. Tag Management: Implement a system for users to update their tags and for administrators to manage global tags.
2. Performance Optimization: For large groups or complex tag structures, consider using more efficient data structures or algorithms for subset checking.
3. Audit Trail: Keep a snapshot of user tags everytime they are updated. Keep a list of all events received with the tags.

Message Routing and Delivery
To ensure reliable and ordered delivery of messages to clients, we’ll implement a client-specific message queue system with acknowledgment-based delivery. This system will work in conjunction with our existing tag-based message routing strategy.

Message Queue per Client
When an event is routed to a client based on the tag-matching logic, instead of sending it immediately, it will be added to a client-specific message queue.
Each client will have its own dedicated message queue on the server side.
The message queue will maintain the order of events as they are received for that specific client.
Event Delivery Process
Queue Processing: The server will process each client’s message queue sequentially.
Single Event Delivery: The server will send the first event in the queue to the client over the WebSocket connection.
Acknowledgment Waiting: After sending an event, the server will wait for an acknowledgment from the client before sending the next event.
Client Acknowledgment: Upon receiving and processing an event, the client must send an acknowledgment message back to the server.
Next Event: Once the server receives the acknowledgment, it will remove the acknowledged event from the queue and proceed to send the next event.
Retry Mechanism: If the server doesn’t receive an acknowledgment within a specified timeout period, it will attempt to resend the event a certain number of times before considering it failed.


Server-Side Implementation
The server will need to implement:
Client-Specific Queues: Maintain a separate message queue for each connected client.
Queue Management: Add events to the appropriate client queues based on tag-matching logic.
Event Sending: Implement a mechanism to send events from the queue one by one.
Acknowledgment Handling: Process acknowledgments from clients and remove acknowledged events from the queue.
Timeout and Retry Logic: Implement a system to resend events if acknowledgments are not received within a specified timeframe.

// Server to Client: Event Message
{
  "type": "event",
  "eventId": "unique-event-id",
  "data": {
    // Event data here
  }
}

Client-Side Implementation
Clients will need to implement the following:
Event Processing: Handle incoming events from the WebSocket connection.
Acknowledgment Sending: After successfully processing an event, send an acknowledgment message back to the server.
Error Handling: Implement error handling for cases where event processing fails, and decide whether to acknowledge the event or request a resend.

// Client to Server: Acknowledgment Message
{
  "type": "ack",
  "eventId": "unique-event-id"
}


Group Creation and Management
We’ll implement automatic group creation and management with an expiry mechanism. This approach allows for dynamic group handling based on user subscriptions.

Automatic Group Creation
When a user attempts to subscribe to a non-existent group, the service will automatically create the group:
	1.	Check if the group exists when a subscription request is received.
	2.	If the group doesn’t exist, create it with default settings.
	3.	Add the user to the newly created group.

Group Expiry Mechanism
To manage inactive groups:
	1.	Set an expiry timer for each group upon creation.
	2.	Reset the timer whenever a user subscribes to the group.
	3.	When the last user unsubscribes, start a countdown for group deletion.
	4.	If no new subscribers join before the countdown ends, delete the group.

Group Management APIs
Expose the following APIs for group management:
	1.	Create Group (also used internally for automatic creation)
	2.	Delete Group
	3.	Get Group Info
	4.	Update Group Settings
	5.	List All Groups

API Specifications
Create Group
POST /api/groups
Body: {
  "groupName": "string",
  "expiryTime": "number" // in milliseconds
}
Response: {
  "groupId": "string",
  "groupName": "string",
  "createdAt": "timestamp",
  "expiryTime": "number"
}
Delete Group
DELETE /api/groups/{groupId}
Response: {
  "success": true,
  "message": "Group deleted successfully"
}
Get Group Info
GET /api/groups/{groupId}
Response: {
  "groupId": "string",
  "groupName": "string",
  "createdAt": "timestamp",
  "expiryTime": "number",
  "subscriberCount": "number",
  "lastActivityAt": "timestamp"
}
Update Group Settings
PUT /api/groups/{groupId}
Body: {
  "groupName": "string",
  "expiryTime": "number"
}
Response: {
  "groupId": "string",
  "groupName": "string",
  "expiryTime": "number",
  "updatedAt": "timestamp"
}
List All Groups
GET /api/groups
Query Parameters:
  - page: number
  - limit: number
  - sortBy: string (e.g., "createdAt", "subscriberCount")
  - order: string ("asc" or "desc")
Response: {
  "groups": [
    {
      "groupId": "string",
      "groupName": "string",
      "subscriberCount": "number",
      "createdAt": "timestamp"
    }
  ],
  "totalCount": "number",
  "page": "number",
  "limit": "number"
}

Admin Interface
To manage users, groups, and tags, we’ll introduce a new set of admin APIs:

User Management
GET /api/admin/users
POST /api/admin/users
GET /api/admin/users/{userId}
PUT /api/admin/users/{userId}
DELETE /api/admin/users/{userId}

Group Management
GET /api/admin/groups
POST /api/admin/groups
GET /api/admin/groups/{groupId}
PUT /api/admin/groups/{groupId}
DELETE /api/admin/groups/{groupId}

Tag Management
GET /api/admin/tags
POST /api/admin/tags
GET /api/admin/tags/{tagId}
PUT /api/admin/tags/{tagId}
DELETE /api/admin/tags/{tagId}



Audit Trail
The audit trail is a crucial component of our real-time update service, designed to maintain a comprehensive record of user tag updates and event deliveries. This feature enhances transparency, aids in troubleshooting, and supports compliance requirements.

User Tag Update Logging
Snapshot Creation:
Every time a user’s tags are updated, the system will create a snapshot of the user’s tag set.
This snapshot will include:
User ID
Timestamp of the update
Previous tag set
New tag set
Source of the update (e.g., user action, admin action, API call)
Storage:
These snapshots will be stored in a dedicated database table or collection, optimized for quick retrieval and long-term storage.
Consider using a time-series database for efficient storage and querying of time-based data.
Retention Policy:
Implement a configurable retention policy for tag update snapshots.
By default, retain snapshots for a minimum of 90 days, with the option to extend based on compliance requirements.

Event Delivery Logging
Event Receipt Logging:
For each event received by a user, log the following information:
Event ID
User ID
Timestamp of delivery
Event tags
User tags at the time of delivery
Group ID (if applicable)
Storage Strategy:
Use a scalable storage solution capable of handling high write volumes.
Consider using a distributed logging system like Elasticsearch or a cloud-based solution for efficient storage and querying.
Indexing:
Implement efficient indexing on frequently queried fields such as User ID, Event ID, and Timestamp to ensure fast retrieval of audit data.

Audit Trail API
Implement a set of APIs to access and manage the audit trail:

Get User Tag History
GET /api/audit/user-tags/{userId}
Query Parameters
`startDate`: ISO 8601 date string
`endDate`: ISO 8601 date string
`page`: number
`limit`: number
Response
{
  "userId": "string",
  "tagHistory": [
    {
      "timestamp": "ISO 8601 date string",
      "previousTags": ["tag1", "tag2"],
      "newTags": ["tag2", "tag3"],
      "updateSource": "string"
    }
  ],
  "totalCount": "number",
  "page": "number",
  "limit": "number"
}

Get User Event History
GET /api/audit/user-events/{userId}

Query Parameters
`startDate`: ISO 8601 date string
`endDate`: ISO 8601 date string
`page`: number
`limit`: number
Response
{
  "userId": "string",
  "eventHistory": [
    {
      "eventId": "string",
      "timestamp": "ISO 8601 date string",
      "eventTags": ["tag1", "tag2"],
      "userTags": ["tag2", "tag3"],
      "groupId": "string"
    }
  ],
  "totalCount": "number",
  "page": "number",
  "limit": "number"
}


Get Event Delivery History:
GET /api/audit/event-delivery/{eventId}

Query Params
`page`: number
`limit`: number

Response
{
  "eventId": "string",
  "deliveryHistory": [
    {
      "userId": "string",
      "timestamp": "ISO 8601 date string",
      "userTags": ["tag2", "tag3"],
      "groupId": "string"
    }
  ],
  "totalCount": "number",
  "page": "number",
  "limit": "number"
}













