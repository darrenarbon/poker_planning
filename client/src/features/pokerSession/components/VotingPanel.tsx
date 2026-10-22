import VoteValueButtons from '../../../components/VoteValueButtons';
import { usePokerSession } from '../../../context';
import { useVoteShortcuts } from '../../../hooks';
import { findVote } from '../../../utils';
import JiraTicketModal, { JIRA_MODAL_ID } from './JiraTicketModal';

const VotingPanel = () => {
    const { currentTicket, user, jira, submitVote, refinementMode } =
        usePokerSession();
    useVoteShortcuts(submitVote, !!currentTicket && !refinementMode);

    if (!currentTicket) return null;

    return (
        <>
            <section className="card dashboard-card">
                <div className="card-body p-3 p-md-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                        <div>
                            <div className="text-secondary small text-uppercase fw-semibold">
                                Voting on ticket
                            </div>
                            <h2 className="h3 fw-bold mb-0">
                                {currentTicket.ticket_number}
                            </h2>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            data-bs-toggle="modal"
                            data-bs-target={`#${JIRA_MODAL_ID}`}
                        >
                            Open Jira Ticket Preview
                        </button>
                    </div>
                    {refinementMode ? (
                        <p className="small mb-0 refinement-note">
                            Refinement mode is on, so voting is turned off for
                            you. Press Show Votes when the team is ready.
                        </p>
                    ) : (
                        <>
                            <p className="text-secondary small mb-3">
                                Pick a card, or type its number (0 for No Idea).
                                Hover over a card to see what it means.
                            </p>
                            <div className="vote-cards">
                                <VoteValueButtons
                                    selected={findVote(
                                        currentTicket,
                                        user?.sub
                                    )}
                                    onSelect={submitVote}
                                    buttonClassName="vote-card"
                                    showTooltips
                                />
                            </div>
                        </>
                    )}
                </div>
            </section>
            <JiraTicketModal {...jira} />
        </>
    );
};

export default VotingPanel;
