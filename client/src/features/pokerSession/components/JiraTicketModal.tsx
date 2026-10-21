import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import ErrorAlert from '../../../components/ErrorAlert';
import { JiraTicket } from '../../../types';

export const JIRA_MODAL_ID = 'jiraTicketModal';

type JiraTicketModalProps = {
    jiraTicket: JiraTicket | null;
    loading: boolean;
    error: string | null;
};

const JiraTicketDetails = ({ jiraTicket }: { jiraTicket: JiraTicket }) => {
    // Jira's rendered HTML is untrusted, so strip scripts and event handlers
    const safeDescription = useMemo(
        () => DOMPurify.sanitize(jiraTicket.description ?? ''),
        [jiraTicket.description]
    );

    return (
        <>
            <p>
                <strong>Epic:</strong> {jiraTicket.parent || 'No Parent Ticket'}
            </p>
            <p>
                <strong>Created By:</strong> {jiraTicket.creator}
            </p>
            <p>
                <strong>Priority:</strong>{' '}
                {jiraTicket.priority || 'No Priority'}
            </p>
            <div dangerouslySetInnerHTML={{ __html: safeDescription }}></div>
        </>
    );
};

/** Bootstrap modal, opened by any element with data-bs-target="#jiraTicketModal" */
const JiraTicketModal = ({
    jiraTicket,
    loading,
    error,
}: JiraTicketModalProps) => (
    <div
        className="modal fade"
        id={JIRA_MODAL_ID}
        tabIndex={-1}
        aria-labelledby="jiraTicketModalLabel"
        aria-hidden="true"
    >
        <div className="modal-dialog modal-xl">
            <div className="modal-content">
                <div className="modal-header">
                    <h1 className="modal-title fs-5" id="jiraTicketModalLabel">
                        {loading ? 'Loading…' : jiraTicket?.summary}
                    </h1>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="modal-body">
                    <ErrorAlert message={error} />
                    {loading && (
                        <p className="text-muted">Loading Jira details…</p>
                    )}
                    {jiraTicket && (
                        <JiraTicketDetails jiraTicket={jiraTicket} />
                    )}
                </div>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        data-bs-dismiss="modal"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default JiraTicketModal;
