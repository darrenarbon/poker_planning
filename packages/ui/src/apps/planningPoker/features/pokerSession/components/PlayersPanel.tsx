import { usePokerSession } from '../../../context';
import { findVote } from '../../../utils';
import PlayerVotesTable from './PlayerVotesTable';

/** Everyone in the room and their vote, in its own scrolling panel */
const PlayersPanel = () => {
    const { currentTicket, user, users, onlineSubs, showVotes, hideOwnVote } =
        usePokerSession();

    if (!currentTicket) return null;

    // only the people here now count towards the progress
    const online = users.filter((player) =>
        onlineSubs.includes(player.auth0_sub ?? '')
    );
    const votedCount = online.filter(
        (player) => findVote(currentTicket, player.auth0_sub) !== null
    ).length;
    const progress = online.length ? (votedCount / online.length) * 100 : 0;

    return (
        <section className="card dashboard-card players-panel">
            <div className="card-body p-3 d-flex flex-column">
                <div className="d-flex align-items-baseline justify-content-between mb-2">
                    <h2 className="h6 fw-bold mb-0">Players</h2>
                    <span className="text-secondary small">
                        {votedCount} of {online.length} online voted
                    </span>
                </div>
                <div
                    className="progress mb-3"
                    role="progressbar"
                    aria-label="Players voted"
                    aria-valuenow={votedCount}
                    aria-valuemin={0}
                    aria-valuemax={online.length}
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
                        onlineSubs={onlineSubs}
                    />
                </div>
            </div>
        </section>
    );
};

export default PlayersPanel;
