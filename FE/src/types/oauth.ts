export interface ConnectedProvider {
    provider: 'github' | 'linkedin';
    username: string | null;
    connectedAt: string; // ISO date string
}
