import { useEffect, useState } from 'react';
import { JiraTicket } from '../types';
import { useApi } from './useApi';

type JiraTicketState = {
    jiraTicket: JiraTicket | null;
    loading: boolean;
    error: string | null;
};

const IDLE: JiraTicketState = { jiraTicket: null, loading: false, error: null };

export const useJiraTicket = (
    ticketNumber: string | undefined,
): JiraTicketState => {
    const api = useApi();
    const [state, setState] = useState<JiraTicketState>(IDLE);

    useEffect(() => {
        if (!ticketNumber) {
            setState(IDLE);
            return;
        }

        // ignore responses for a ticket that is no longer selected
        let cancelled = false;
        setState({ jiraTicket: null, loading: true, error: null });

        api.getJiraTicket(ticketNumber)
            .then((jiraTicket) => {
                if (!cancelled)
                    setState({ jiraTicket, loading: false, error: null });
            })
            .catch((error) => {
                console.error('Failed to load Jira ticket:', error);
                if (!cancelled) {
                    setState({
                        jiraTicket: null,
                        loading: false,
                        error: `Could not load Jira details for ${ticketNumber}.`,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [api, ticketNumber]);

    return state;
};
