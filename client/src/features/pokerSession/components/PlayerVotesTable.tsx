import classNames from 'classnames';
import { NO_IDEA_VOTE } from '../../../constants';
import { TicketForVoting, UserModel } from '../../../types';
import { findVote, getDisplayName } from '../../../utils';

type PlayerVotesTableProps = {
    ticket: TicketForVoting;
    users: UserModel[];
    currentUserSub: string | undefined;
    showVotes: boolean;
    /** refinement mode: hide the current user's vote too */
    hideOwnVote?: boolean;
};

const describeVote = (vote: number | null, isVisible: boolean): string => {
    if (vote === null) return 'Not Voted';
    if (!isVisible) return 'Voted';
    return vote === NO_IDEA_VOTE ? 'No Idea' : vote.toString();
};

const voteBadgeClass = (vote: number | null, isVisible: boolean) =>
    classNames('badge rounded-pill vote-badge', {
        'text-bg-light text-secondary': vote === null,
        'text-bg-success': vote !== null && !isVisible,
        'text-bg-primary': vote !== null && isVisible,
    });

const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase();

/** Compact list of players with their (possibly hidden) votes */
const PlayerVotesTable = ({
    ticket,
    users,
    currentUserSub,
    showVotes,
    hideOwnVote = false,
}: PlayerVotesTableProps) => (
    <ul className="list-unstyled mb-0 player-votes">
        {users.map((player) => {
            const isMe = player.auth0_sub === currentUserSub;
            const name = getDisplayName(player) ?? '';
            const vote = findVote(ticket, player.auth0_sub);
            const isVisible = showVotes || (isMe && !hideOwnVote);
            return (
                <li key={player.auth0_sub} className="player-row">
                    <span className="player-avatar" aria-hidden="true">
                        {initialsOf(name)}
                    </span>
                    <span
                        className={classNames('player-name', {
                            'fw-bold': isMe,
                        })}
                        title={name}
                    >
                        {name}
                    </span>
                    <span className={voteBadgeClass(vote, isVisible)}>
                        {describeVote(vote, isVisible)}
                    </span>
                </li>
            );
        })}
    </ul>
);

export default PlayerVotesTable;
