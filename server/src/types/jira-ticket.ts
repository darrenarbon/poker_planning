/**
 * JIRA API response types
 */
export interface JiraTicketResponse {
    id: string;
    key: string;
    fields: {
        summary?: string;
        description?: any;
        creator?: {
            displayName: string;
            emailAddress: string;
        };
        parent?: {
            key: string;
            fields: {
                summary: string;
            };
        };
        priority?: {
            name: string;
            id: string;
        };
    };
    renderedFields?: {
        description?: string;
    };
}

/**
 * Service result types
 */
export interface JiraTicketResult {
    success: boolean;
    data?: JiraTicketResponse;
    error?: any;
    message?: string;
    status?: number;
}

/**
 * JIRA API configuration
 */
export interface JiraConfig {
    domain: string;
    email: string;
    apiKey: string;
}
