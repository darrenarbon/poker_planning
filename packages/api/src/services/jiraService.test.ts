import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getIssue,
    getIssuesNeedingEstimates,
    setStoryPoints,
} from './jiraService.js';

const fetchMock = vi.fn();
const expectedAuth = `Basic ${Buffer.from('jira@example.com:jira-key').toString(
    'base64'
)}`;

const lastRequest = () => {
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init, headers: init.headers as Record<string, string> };
};

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ key: 'PP-1' }), { status: 200 })
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
});

describe('jiraService', () => {
    it('getIssue fetches the issue with basic auth', async () => {
        await expect(getIssue('PP-1')).resolves.toEqual({ key: 'PP-1' });

        const { url, init, headers } = lastRequest();
        expect(url).toBe(
            'https://example.atlassian.net/rest/api/3/issue/PP-1?fields=description,summary,creator,parent,priority&expand=renderedFields'
        );
        expect(init.method).toBeUndefined();
        expect(headers.Authorization).toBe(expectedAuth);
        expect(headers['Content-Type']).toBeUndefined();
    });

    it('getIssue encodes the ticket id', async () => {
        await getIssue('../evil');
        expect(lastRequest().url).toContain('/issue/..%2Fevil?');
    });

    it('setStoryPoints PUTs the story points field', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

        await expect(setStoryPoints('PP-1', 5)).resolves.toBeNull();

        const { url, init, headers } = lastRequest();
        expect(url).toBe(
            'https://example.atlassian.net/rest/api/3/issue/PP-1?overrideScreenSecurity=true'
        );
        expect(init.method).toBe('PUT');
        expect(headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(String(init.body))).toEqual({
            fields: { customfield_10024: 5 },
        });
    });

    it('getIssuesNeedingEstimates searches by label', async () => {
        await getIssuesNeedingEstimates();
        expect(lastRequest().url).toBe(
            'https://example.atlassian.net/rest/api/3/search?jql=labels=Needs-estimating'
        );
    });

    it("throws an AppError with Jira's status on failure", async () => {
        fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));
        await expect(getIssue('PP-404')).rejects.toMatchObject({
            status: 404,
            message: 'Error communicating with JIRA',
            cause: 'nope',
        });
    });
});
