export interface JiraTicket {
    summary: string;
    description: string;
    creator: string;
    parent: string;
    priority: string;
}

/** The subset of the Jira REST response the app reads */
export interface JiraTicketResponse {
    fields: {
        summary: string;
        creator: { displayName: string };
        parent?: { fields: { summary: string } };
        priority: { name: string };
    };
    renderedFields: { description: string };
}
