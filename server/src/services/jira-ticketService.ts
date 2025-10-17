import { JiraTicketResult, JiraConfig } from '../types/jira-ticket';

/**
 * Get JIRA configuration from environment variables
 */
const getJiraConfig = (): JiraConfig => {
    return {
        domain: process.env.ATLASSIAN_DOMAIN || '',
        email: process.env.ATLASSIAN_EMAIL || '',
        apiKey: process.env.ATLASSIAN_API_KEY || '',
    };
};

/**
 * Create Basic Auth header for JIRA API
 */
const createAuthHeader = (email: string, apiKey: string): string => {
    return `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`;
};

/**
 * Fetch a JIRA ticket by ID
 * @param ticketId - The JIRA ticket ID to fetch
 * @returns Promise with ticket data or error
 */
export const fetchJiraTicket = async (
    ticketId: string
): Promise<JiraTicketResult> => {
    try {
        const config = getJiraConfig();

        if (!config.domain || !config.email || !config.apiKey) {
            return {
                success: false,
                error: 'Missing JIRA configuration',
                message: 'JIRA API configuration is incomplete',
                status: 500,
            };
        }

        const url = `https://${config.domain}.atlassian.net/rest/api/3/issue/${ticketId}?fields=description,summary,creator,parent,priority&expand=renderedFields`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: createAuthHeader(config.email, config.apiKey),
                Accept: 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data,
                message: 'Error fetching JIRA ticket',
                status: response.status,
            };
        }

        return {
            success: true,
            data: data,
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error while fetching JIRA ticket',
            status: 500,
        };
    }
};
