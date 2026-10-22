import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JiraTicket } from '../types';
import { useJiraTicket } from './useJiraTicket';

const api = { getJiraTicket: vi.fn() };
vi.mock('./useApi', () => ({ useApi: () => api }));

const jira = (summary: string): JiraTicket => ({
    summary,
    description: '',
    creator: 'Ada',
    parent: '',
    priority: 'High',
});

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
};

describe('useJiraTicket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('is idle without a ticket number', () => {
        const { result } = renderHook(() => useJiraTicket(undefined));
        expect(result.current).toEqual({
            jiraTicket: null,
            loading: false,
            error: null,
        });
        expect(api.getJiraTicket).not.toHaveBeenCalled();
    });

    it('loads the ticket, showing loading in the meantime', async () => {
        api.getJiraTicket.mockResolvedValue(jira('Add login'));
        const { result } = renderHook(() => useJiraTicket('ABC-1'));

        expect(result.current.loading).toBe(true);
        await waitFor(() =>
            expect(result.current.jiraTicket?.summary).toBe('Add login')
        );
        expect(result.current.loading).toBe(false);
        expect(api.getJiraTicket).toHaveBeenCalledWith('ABC-1');
    });

    it('reports an error when loading fails', async () => {
        api.getJiraTicket.mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useJiraTicket('ABC-1'));

        await waitFor(() =>
            expect(result.current.error).toBe(
                'Could not load Jira details for ABC-1.'
            )
        );
        expect(result.current.jiraTicket).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('clears the previous ticket as soon as the ticket changes', async () => {
        api.getJiraTicket.mockResolvedValueOnce(jira('First'));
        const second = deferred<JiraTicket>();
        api.getJiraTicket.mockReturnValueOnce(second.promise);

        const { result, rerender } = renderHook(
            ({ ticket }) => useJiraTicket(ticket),
            { initialProps: { ticket: 'ABC-1' } }
        );
        await waitFor(() =>
            expect(result.current.jiraTicket?.summary).toBe('First')
        );

        rerender({ ticket: 'ABC-2' });
        expect(result.current).toEqual({
            jiraTicket: null,
            loading: true,
            error: null,
        });

        second.resolve(jira('Second'));
        await waitFor(() =>
            expect(result.current.jiraTicket?.summary).toBe('Second')
        );
    });

    it('ignores a late response for a ticket that is no longer selected', async () => {
        const first = deferred<JiraTicket>();
        api.getJiraTicket.mockReturnValueOnce(first.promise);
        api.getJiraTicket.mockResolvedValueOnce(jira('Second'));

        const { result, rerender } = renderHook(
            ({ ticket }) => useJiraTicket(ticket),
            { initialProps: { ticket: 'ABC-1' } }
        );
        rerender({ ticket: 'ABC-2' });
        await waitFor(() =>
            expect(result.current.jiraTicket?.summary).toBe('Second')
        );

        first.resolve(jira('First'));
        await Promise.resolve();
        expect(result.current.jiraTicket?.summary).toBe('Second');
    });

    it('goes back to idle when the ticket is deselected', async () => {
        api.getJiraTicket.mockResolvedValue(jira('Add login'));
        const { result, rerender } = renderHook(
            ({ ticket }: { ticket?: string }) => useJiraTicket(ticket),
            { initialProps: { ticket: 'ABC-1' as string | undefined } }
        );
        await waitFor(() => expect(result.current.jiraTicket).not.toBeNull());

        rerender({ ticket: undefined });
        expect(result.current.jiraTicket).toBeNull();
    });
});
