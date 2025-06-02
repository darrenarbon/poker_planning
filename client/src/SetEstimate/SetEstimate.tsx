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
            <h4>Set Final Estimate</h4>
            <div>
                <button
                    className="btn btn-warning mx-2"
                    onClick={() => setEstimate(0)}
                >
                    Reset Estimate
                </button>
                {votingValues.map((value) => (
                    <button
                        className={classNames('btn mx-2', {
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
