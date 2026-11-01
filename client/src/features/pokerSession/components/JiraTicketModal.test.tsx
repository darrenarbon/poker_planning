import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JiraTicket } from '../../../types';
import JiraTicketModal from './JiraTicketModal';

const jiraTicket: JiraTicket = {
    summary: 'Add login',
    description: '<p>Some <strong>details</strong></p>',
    creator: 'Ada Lovelace',
    parent: 'Auth epic',
    priority: 'High',
};

const renderModal = (props: Partial<Parameters<typeof JiraTicketModal>[0]>) =>
    render(
        <JiraTicketModal
            jiraTicket={null}
            loading={false}
            error={null}
            {...props}
        />
    );

describe('JiraTicketModal', () => {
    it('shows the ticket details', () => {
        renderModal({ jiraTicket });
        expect(screen.getByText('Add login')).toBeInTheDocument();
        expect(screen.getByText('Auth epic')).toBeInTheDocument();
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('details').tagName).toBe('STRONG');
    });

    it('falls back when there is no parent or priority', () => {
        renderModal({
            jiraTicket: { ...jiraTicket, parent: '', priority: '' },
        });
        expect(screen.getByText('No Parent Ticket')).toBeInTheDocument();
        expect(screen.getByText('No Priority')).toBeInTheDocument();
    });

    it('strips scripts and event handlers from the description', () => {
        const { container } = renderModal({
            jiraTicket: {
                ...jiraTicket,
                description:
                    '<p>ok</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a>',
            },
        });
        const body = container.querySelector('.modal-body')!;
        expect(body.querySelector('script')).toBeNull();
        expect(body.querySelector('img')).not.toHaveAttribute('onerror');
        expect(screen.getByText('link')).not.toHaveAttribute(
            'href',
            'javascript:alert(1)'
        );
        expect(screen.getByText('ok')).toBeInTheDocument();
    });

    it('shows a loading state', () => {
        renderModal({ loading: true });
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        expect(screen.getByText('Loading Jira details…')).toBeInTheDocument();
    });

    it('shows an error', () => {
        renderModal({ error: 'Could not load Jira details for ABC-1.' });
        // the closed modal is aria-hidden, so include hidden elements
        expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(
            'Could not load Jira details for ABC-1.'
        );
    });
});
