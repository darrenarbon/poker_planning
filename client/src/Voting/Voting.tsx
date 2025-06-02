import classNames from 'classnames';
import { votingValues } from './votingHelper';
import { UserModel } from '../Users/SingleUser/SingleUser';
import { TicketForVoting, VoteModel } from '../PokerSession/types';

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
        const vote = currentTicket.votes.find((v) => v.usersub === userSub);
        return vote ? vote.vote : null;
    };

    const getVoteForUser = (currentUserSub: string | undefined): string => {
        const vote = currentTicket.votes.find(
            (v: VoteModel) => v.usersub === currentUserSub
        );
        if (!vote) {
            return 'Not Voted';
        }

        if (showVotes || vote?.usersub === userSub) {
            return vote.vote.toString();
        } else {
            return 'Voted';
        }
    };
    return (
        <>
            <h4 className="text-center pb-4">
                Voting on ticket: {currentTicket.ticket_number}
            </h4>
            <div>
                <div className="w-75 mx-auto text-center">
                    {votingValues.map((value) => (
                        <button
                            className={classNames('btn btn-xl mx-2', {
                                'btn-primary':
                                    getRawVoteForUser(userSub) === value,
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
                                const displayName = user.given_name
                                    ? `${user.given_name} ${user.family_name}`
                                    : user.nickname;
                                return (
                                    <tr key={user.auth0_sub}>
                                        <td
                                            className={classNames({
                                                'fw-bold':
                                                    user.auth0_sub === userSub,
                                            })}
                                        >
                                            {displayName}
                                        </td>
                                        <td>
                                            {getVoteForUser(user.auth0_sub)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default Voting;
