export interface User {
    user_id: string;
    name: string;
}

export interface QueueStatus {
    queue_id: string;
    active_users: User[];
    total_waiting: number;
}

export interface CallNextResponse {
    queue_id: string;
    called_user: User | null;
    remaining_waiting: number;
}
