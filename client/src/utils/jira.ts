import { JiraTicket, JiraTicketResponse } from '../types';

export const mapJiraTicket = ({
    fields,
    renderedFields,
}: JiraTicketResponse): JiraTicket => ({
    summary: fields.summary,
    description: renderedFields.description,
    creator: fields.creator.displayName,
    parent: fields.parent?.fields.summary || '',
    priority: fields.priority.name,
});
