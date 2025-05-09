import classNames from 'classnames';
import { votingValues } from '../Voting/votingHelper';
import { TicketForVoting } from '../PokerSession/types';

interface SetEstimateProps {
    setEstimate: (estimate: number) => void;
    currentTicket: TicketForVoting;
}

const SetEstimate = ({ setEstimate, currentTicket }: SetEstimateProps) => {
    return (
        <div className="mx-auto">
            <h2>Set Estimate</h2>
            <div>
                {votingValues.map((value) => (
                    <button
                        className={classNames('btn btn-xl mx-2', {
                            'btn-primary':
                                value === currentTicket.chosen_estimate,
                            'btn-outline-primary':
                                value !== currentTicket.chosen_estimate,
                        })}
                        key={value}
                        onClick={() => setEstimate(value)}
                    >
                        {value}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SetEstimate;
