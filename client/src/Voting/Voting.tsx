import classNames from 'classnames';
import { votingValues } from './votingHelper';
import { UserModel } from '../User/User';
import { TicketForVoting } from '../PokerSession/types';

interface VotingProps {
    submitVote: (vote: number) => void;
    currentTicket: TicketForVoting;
    userSub: string | undefined;
    allUsers: UserModel[];
    showVotes: boolean;
}

const Voting = ({
    submitVote,
    currentTicket,
    userSub,
    allUsers,
    showVotes,
}: VotingProps) => {
    const getRawVoteForUser = (userSub: string | undefined): number | null => {
        const vote = currentTicket.votes.find((v) => v.userSub === userSub);
        return vote ? vote.vote : null;
    };

    const getVoteForUser = (currentUserSub: string | undefined): string => {
        const vote = currentTicket.votes.find(
            (v) => v.userSub === currentUserSub
        );
        if (!vote) {
            return 'Not Voted';
        }

        if (showVotes || vote?.userSub === userSub) {
            return vote.vote.toString();
        } else {
            return 'Voted';
        }
    };
    return (
        <div className="mx-auto">
            <div>
                {votingValues.map((value) => (
                    <button
                        className={classNames('btn btn-xl mx-2', {
                            'btn-primary': getRawVoteForUser(userSub) === value,
                            'btn-outline-primary':
                                getRawVoteForUser(userSub) !== value,
                        })}
                        key={value}
                        onClick={() => submitVote(value)}
                    >
                        {value}
                    </button>
                ))}
            </div>
            <div className="mt-3 w-75 mx-auto">
                <table className="w-100">
                    <thead className="bg-light">
                        <tr>
                            <th>Player</th>
                            <th>Vote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allUsers.map((user) => {
                            const displayName = user.givenName
                                ? `${user.givenName} ${user.familyName}`
                                : user.nickname;
                            return (
                                <tr key={user.sub}>
                                    <td
                                        className={classNames({
                                            'fw-bold': user.sub === userSub,
                                        })}
                                    >
                                        {displayName}
                                    </td>
                                    <td>{getVoteForUser(user.sub)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Voting;
