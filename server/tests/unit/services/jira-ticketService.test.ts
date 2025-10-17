import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type Mock,
} from 'vitest';

// Mock environment variables first
const mockEnv = {
    ATLASSIAN_DOMAIN: 'testdomain',
    ATLASSIAN_EMAIL: 'test@example.com',
    ATLASSIAN_API_KEY: 'test-api-key',
};

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchJiraTicket } from '../../../src/services/jira-ticketService';

describe('jira-ticketService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set environment variables for each test
        vi.stubEnv('ATLASSIAN_DOMAIN', mockEnv.ATLASSIAN_DOMAIN);
        vi.stubEnv('ATLASSIAN_EMAIL', mockEnv.ATLASSIAN_EMAIL);
        vi.stubEnv('ATLASSIAN_API_KEY', mockEnv.ATLASSIAN_API_KEY);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetAllMocks();
    });

    describe('fetchJiraTicket', () => {
        const validTicketId = 'TEST-123';
        const mockJiraResponse = {
            id: '12345',
            key: 'TEST-123',
            fields: {
                summary: 'Test ticket summary',
                description: 'Test description',
                creator: {
                    displayName: 'John Doe',
                    emailAddress: 'john@example.com',
                },
                priority: {
                    name: 'High',
                    id: '2',
                },
            },
            renderedFields: {
                description: '<p>Test description</p>',
            },
        };

        it('should successfully fetch a JIRA ticket', async () => {
            // Mock successful API response
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockJiraResponse),
            });

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJiraResponse);
            expect(result.error).toBeUndefined();
            expect(result.message).toBeUndefined();

            // Verify fetch was called with correct parameters
            expect(mockFetch).toHaveBeenCalledWith(
                `https://${mockEnv.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/issue/${validTicketId}?fields=description,summary,creator,parent,priority&expand=renderedFields`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Basic ${Buffer.from(
                            `${mockEnv.ATLASSIAN_EMAIL}:${mockEnv.ATLASSIAN_API_KEY}`
                        ).toString('base64')}`,
                        Accept: 'application/json',
                    },
                }
            );
        });

        it('should handle JIRA API error responses', async () => {
            const errorResponse = {
                errorMessages: ['Ticket not found'],
                errors: {},
            };

            mockFetch.mockResolvedValue({
                ok: false,
                status: 404,
                json: vi.fn().mockResolvedValue(errorResponse),
            });

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toEqual(errorResponse);
            expect(result.message).toBe('Error fetching JIRA ticket');
            expect(result.status).toBe(404);
            expect(result.data).toBeUndefined();
        });

        it('should handle missing ATLASSIAN_DOMAIN configuration', async () => {
            vi.stubEnv('ATLASSIAN_DOMAIN', '');

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing JIRA configuration');
            expect(result.message).toBe('JIRA API configuration is incomplete');
            expect(result.status).toBe(500);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle missing ATLASSIAN_EMAIL configuration', async () => {
            vi.stubEnv('ATLASSIAN_EMAIL', '');

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing JIRA configuration');
            expect(result.message).toBe('JIRA API configuration is incomplete');
            expect(result.status).toBe(500);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle missing ATLASSIAN_API_KEY configuration', async () => {
            vi.stubEnv('ATLASSIAN_API_KEY', '');

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing JIRA configuration');
            expect(result.message).toBe('JIRA API configuration is incomplete');
            expect(result.status).toBe(500);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle undefined environment variables', async () => {
            vi.stubEnv('ATLASSIAN_DOMAIN', undefined);
            vi.stubEnv('ATLASSIAN_EMAIL', undefined);
            vi.stubEnv('ATLASSIAN_API_KEY', undefined);

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing JIRA configuration');
            expect(result.message).toBe('JIRA API configuration is incomplete');
            expect(result.status).toBe(500);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network request failed');
            mockFetch.mockRejectedValue(networkError);

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toBe(networkError);
            expect(result.message).toBe(
                'Internal server error while fetching JIRA ticket'
            );
            expect(result.status).toBe(500);
        });

        it('should handle JSON parsing errors', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
            });

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.message).toBe(
                'Internal server error while fetching JIRA ticket'
            );
            expect(result.status).toBe(500);
        });

        it('should handle different HTTP error status codes', async () => {
            const unauthorizedError = {
                errorMessages: ['Unauthorized'],
            };

            mockFetch.mockResolvedValue({
                ok: false,
                status: 401,
                json: vi.fn().mockResolvedValue(unauthorizedError),
            });

            const result = await fetchJiraTicket(validTicketId);

            expect(result.success).toBe(false);
            expect(result.error).toEqual(unauthorizedError);
            expect(result.message).toBe('Error fetching JIRA ticket');
            expect(result.status).toBe(401);
        });

        it('should create correct authorization header', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockJiraResponse),
            });

            await fetchJiraTicket(validTicketId);

            const expectedAuth = `Basic ${Buffer.from(
                `${mockEnv.ATLASSIAN_EMAIL}:${mockEnv.ATLASSIAN_API_KEY}`
            ).toString('base64')}`;

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                    }),
                })
            );
        });

        it('should construct correct JIRA API URL', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockJiraResponse),
            });

            await fetchJiraTicket(validTicketId);

            const expectedUrl = `https://${mockEnv.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/issue/${validTicketId}?fields=description,summary,creator,parent,priority&expand=renderedFields`;

            expect(mockFetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.any(Object)
            );
        });

        it('should handle empty ticket ID', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockJiraResponse),
            });

            const result = await fetchJiraTicket('');

            // Service doesn't validate empty ticketId, so it should still make the request
            expect(mockFetch).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should handle special characters in ticket ID', async () => {
            const specialTicketId = 'PROJECT-123@#$%';
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockJiraResponse),
            });

            await fetchJiraTicket(specialTicketId);

            const expectedUrl = `https://${mockEnv.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/issue/${specialTicketId}?fields=description,summary,creator,parent,priority&expand=renderedFields`;

            expect(mockFetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.any(Object)
            );
        });
    });
});
