import { JiraTicket } from '../../../types';

export const JIRA_MODAL_ID = 'jiraTicketModal';

type JiraTicketModalProps = {
    jiraTicket: JiraTicket;
};

/** Bootstrap modal, opened by any element with data-bs-target="#jiraTicketModal" */
const JiraTicketModal = ({ jiraTicket }: JiraTicketModalProps) => (
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
                        {jiraTicket.summary}
                    </h1>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="modal-body">
                    <p>
                        <strong>Epic:</strong>{' '}
                        {jiraTicket.parent || 'No Parent Ticket'}
                    </p>
                    <p>
                        <strong>Created By:</strong> {jiraTicket.creator}
                    </p>
                    <p>
                        <strong>Priority:</strong>{' '}
                        {jiraTicket.priority || 'No Priority'}
                    </p>
                    <p
                        dangerouslySetInnerHTML={{
                            __html: jiraTicket.description,
                        }}
                    ></p>
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
