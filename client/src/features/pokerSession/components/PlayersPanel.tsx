import { usePokerSession } from '../../../context';
import { findVote } from '../../../utils';
import PlayerVotesTable from './PlayerVotesTable';

/** Everyone in the room and their vote, in its own scrolling panel */
const PlayersPanel = () => {
    const { currentTicket, user, users, showVotes, hideOwnVote } =
        usePokerSession();

    if (!currentTicket) return null;

    const votedCount = users.filter(
        (player) => findVote(currentTicket, player.auth0_sub) !== null
    ).length;
    const progress = users.length ? (votedCount / users.length) * 100 : 0;

    return (
        <section className="card dashboard-card players-panel">
            <div className="card-body p-3 d-flex flex-column">
                <div className="d-flex align-items-baseline justify-content-between mb-2">
                    <h2 className="h6 fw-bold mb-0">Players</h2>
                    <span className="text-secondary small">
                        {votedCount} of {users.length} voted
                    </span>
                </div>
                <div
                    className="progress mb-3"
                    role="progressbar"
                    aria-label="Players voted"
                    aria-valuenow={votedCount}
                    aria-valuemin={0}
                    aria-valuemax={users.length}
                    style={{ height: '0.375rem' }}
                >
                    <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="players-scroll">
                    <PlayerVotesTable
                        ticket={currentTicket}
                        users={users}
                        currentUserSub={user?.sub}
                        showVotes={showVotes}
                        hideOwnVote={hideOwnVote}
                    />
                </div>
            </div>
        </section>
    );
};

export default PlayersPanel;
