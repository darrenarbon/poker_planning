import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const baseUrl = () => `https://${env.atlassianDomain}.atlassian.net/rest/api/3`;

const authHeader = () =>
    `Basic ${Buffer.from(
        `${env.atlassianEmail}:${env.atlassianApiKey}`
    ).toString('base64')}`;

const jiraRequest = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: {
            Authorization: authHeader(),
            Accept: 'application/json',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    const text = await response.text();
    if (!response.ok) {
        throw new AppError(
            response.status,
            'Error communicating with JIRA',
            text
        );
    }
    return text ? JSON.parse(text) : null;
};

export const getIssue = (ticketId: string) =>
    jiraRequest(
        `/issue/${encodeURIComponent(ticketId)}?fields=description,summary,creator,parent,priority&expand=renderedFields`
    );

export const setStoryPoints = (ticketId: string, storyPoints: number) => {
    if (!env.jiraStoryPointsField) {
        throw new AppError(500, 'JIRA_STORY_POINTS_FIELD is not configured');
    }
    return jiraRequest(
        `/issue/${encodeURIComponent(ticketId)}?overrideScreenSecurity=true`,
        {
            method: 'PUT',
            body: JSON.stringify({
                fields: { [env.jiraStoryPointsField]: storyPoints },
            }),
        }
    );
};

export const getIssuesNeedingEstimates = () =>
    jiraRequest('/search?jql=labels=Needs-estimating');
