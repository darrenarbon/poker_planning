import { useEffect, useState } from 'react';
import { JiraTicket } from '../types';
import { EMPTY_JIRA_TICKET } from '../utils';
import { useApi } from './useApi';

export const useJiraTicket = (ticketNumber: string | undefined): JiraTicket => {
    const api = useApi();
    const [jiraTicket, setJiraTicket] = useState<JiraTicket>(EMPTY_JIRA_TICKET);

    useEffect(() => {
        if (!ticketNumber) return;
        api.getJiraTicket(ticketNumber)
            .then(setJiraTicket)
            .catch((error) =>
                console.error('Failed to load Jira ticket:', error),
            );
    }, [api, ticketNumber]);

    return jiraTicket;
};
