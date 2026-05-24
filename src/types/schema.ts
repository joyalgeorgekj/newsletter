export interface Subscriber {
    email: string;
    verified: boolean;
    subscribe: boolean;
    token: string;
    lastNewsletterId: string | null;
}
