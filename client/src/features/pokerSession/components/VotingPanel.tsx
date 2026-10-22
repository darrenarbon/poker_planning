import VoteValueButtons from '../../../components/VoteValueButtons';
import { usePokerSession } from '../../../context';
import { findVote } from '../../../utils';
import JiraTicketModal, { JIRA_MODAL_ID } from './JiraTicketModal';
import PlayerVotesTable from './PlayerVotesTable';

const VotingPanel = () => {
    const { currentTicket, user, users, showVotes, jira, submitVote } =
        usePokerSession();

    if (!currentTicket) return null;

    return (
        <>
            <h4 className="text-center pb-4">
                Voting on ticket: {currentTicket.ticket_number}{' '}
                <button
                    type="button"
                    className="btn btn-primary ms-5"
                    data-bs-toggle="modal"
                    data-bs-target={`#${JIRA_MODAL_ID}`}
                >
                    Open Jira Ticket Preview
                </button>
            </h4>
            <JiraTicketModal {...jira} />
            <div>
                <div className="w-75 mx-auto text-center">
                    <VoteValueButtons
                        selected={findVote(currentTicket, user?.sub)}
                        onSelect={submitVote}
                        buttonClassName="btn-xl"
                        showTooltips
                    />
                </div>
                <div className="mt-3 w-75 mx-auto">
                    <PlayerVotesTable
                        ticket={currentTicket}
                        users={users}
                        currentUserSub={user?.sub}
                        showVotes={showVotes}
                    />
                </div>
            </div>
        </>
    );
};

export default VotingPanel;
