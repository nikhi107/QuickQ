export interface User {
    user_id: string;
    name: string;
    ticket_number?: string;
}

export interface QueueDefinition {
    queue_id: string;
    display_name: string;
    admin_subtitle: string;
    client_description: string;
    counter_label: string;
    accent_from: string;
    accent_to: string;
}

export interface QueueStatus {
    queue_id: string;
    active_users: User[];
    total_waiting: number;
    serving_user?: User | null;
    average_wait_time_seconds?: number;
}

export interface Metrics {
    average_wait_time_seconds: number;
    total_served: number;
}

export interface AnalyticsSplitResponse {
    all_time: Metrics;
    today: Metrics;
}

export interface CallNextResponse {
    queue_id: string;
    called_user: User | null;
    remaining_waiting: number;
}
