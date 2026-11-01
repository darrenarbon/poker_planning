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
    /** auth0 subs of players with the room open; everyone else is greyed out */
    onlineSubs?: string[];
};

const describeVote = (vote: number | null, isVisible: boolean): string => {
    if (vote === null) return 'Not Voted';
    if (!isVisible) return 'Voted';
    return vote === NO_IDEA_VOTE ? 'No Idea' : vote.toString();
};

const voteBadgeClass = (vote: number | null, isVisible: boolean) =>
    classNames('badge rounded-pill vote-badge', {
        'bg-body-secondary text-secondary': vote === null,
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
    onlineSubs,
}: PlayerVotesTableProps) => {
    const isOnline = (player: UserModel) =>
        !onlineSubs || onlineSubs.includes(player.auth0_sub ?? '');
    // online players first, keeping the original order within each group
    const players = [
        ...users.filter(isOnline),
        ...users.filter((player) => !isOnline(player)),
    ];
    return (
        <ul className="list-unstyled mb-0 player-votes">
            {players.map((player) => {
                const online = isOnline(player);
                const isMe = player.auth0_sub === currentUserSub;
                const name = getDisplayName(player) ?? '';
                const vote = findVote(ticket, player.auth0_sub);
                const isVisible = showVotes || (isMe && !hideOwnVote);
                return (
                    <li
                        key={player.auth0_sub}
                        className={classNames('player-row', {
                            'player-offline': !online,
                        })}
                    >
                        <span className="player-avatar" aria-hidden="true">
                            {initialsOf(name)}
                            {onlineSubs && (
                                <span
                                    className={classNames('presence-dot', {
                                        online,
                                    })}
                                />
                            )}
                        </span>
                        <span
                            className={classNames('player-name', {
                                'fw-bold': isMe,
                            })}
                            title={name}
                        >
                            {name}
                            {!online && (
                                <span className="visually-hidden">
                                    {' '}
                                    (offline)
                                </span>
                            )}
                        </span>
                        <span className={voteBadgeClass(vote, isVisible)}>
                            {describeVote(vote, isVisible)}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

export default PlayerVotesTable;
