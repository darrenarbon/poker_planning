import { describe, expect, it } from 'vitest';
import { JiraTicketResponse } from '../types';
import { mapJiraTicket } from './jira';

const response: JiraTicketResponse = {
    fields: {
        summary: 'Add login',
        creator: { displayName: 'Ada Lovelace' },
        parent: { fields: { summary: 'Auth epic' } },
        priority: { name: 'High' },
    },
    renderedFields: { description: '<p>Details</p>' },
};

describe('mapJiraTicket', () => {
    it('maps the Jira response to a JiraTicket', () => {
        expect(mapJiraTicket(response)).toEqual({
            summary: 'Add login',
            description: '<p>Details</p>',
            creator: 'Ada Lovelace',
            parent: 'Auth epic',
            priority: 'High',
        });
    });

    it('uses an empty parent when the ticket has none', () => {
        const fields = { ...response.fields, parent: undefined };
        expect(mapJiraTicket({ ...response, fields }).parent).toBe('');
    });
});
