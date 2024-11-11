export interface Message {
    type: 'event';
    eventId: string;
    event: string;
    data: any;
    tags: string[];
}

export interface Acknowledgment {
    type: 'ack';
    eventId: string;
} 