import classNames from 'classnames';
import { NO_IDEA_VOTE } from '../../../constants';
import { TicketForVoting, UserModel } from '../../../types';
import { findVote, getDisplayName } from '../../../utils';

type PlayerVotesTableProps = {
    ticket: TicketForVoting;
    users: UserModel[];
    currentUserSub: string | undefined;
    showVotes: boolean;
};

const describeVote = (vote: number | null, isVisible: boolean): string => {
    if (vote === null) return 'Not Voted';
    if (!isVisible) return 'Voted';
    return vote === NO_IDEA_VOTE ? 'No Idea' : vote.toString();
};

const PlayerVotesTable = ({
    ticket,
    users,
    currentUserSub,
    showVotes,
}: PlayerVotesTableProps) => (
    <table className="w-100">
        <thead className="bg-light">
            <tr>
                <th>Player</th>
                <th>Vote</th>
            </tr>
        </thead>
        <tbody>
            {users.map((player) => {
                const isMe = player.auth0_sub === currentUserSub;
                return (
                    <tr key={player.auth0_sub}>
                        <td className={classNames({ 'fw-bold': isMe })}>
                            {getDisplayName(player)}
                        </td>
                        <td>
                            {describeVote(
                                findVote(ticket, player.auth0_sub),
                                showVotes || isMe
                            )}
                        </td>
                    </tr>
                );
            })}
        </tbody>
    </table>
);

export default PlayerVotesTable;
