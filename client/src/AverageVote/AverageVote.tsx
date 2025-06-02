import classNames from 'classnames';
import { TicketForVoting } from '../PokerSession/types';

type AverageVoteProps = {
    currentTicket: TicketForVoting;
};

type StandardDeviationThreshold = {
    type: StandardDeviationThresholdType;
    header: StandardDeviationThresholdHeader;
    message: StandardDeviationThresholdMessage;
};
enum StandardDeviationThresholdType {
    'success' = 'success',
    'warning' = 'warning',
    'danger' = 'danger',
}
enum StandardDeviationThresholdHeader {
    'strong' = 'Strong agreement in the estimate.',
    'moderate' = 'Moderate agreement in the estimate.',
    'weak' = 'Wide disagreement in the estimate.',
}

enum StandardDeviationThresholdMessage {
    'strong' = 'The votes are closely clustered around the average, suggesting an estimate close to the average would be appropriate.',
    'moderate' = 'The votes show some spread, indicating differing opinions. This may require further discussion or a compromise estimate.',
    'weak' = 'The votes are widely spread, indicating significant disagreement. A more thorough discussion may be needed to reach a consensus.',
}

const AverageVote = ({ currentTicket }: AverageVoteProps) => {
    if (
        !currentTicket ||
        !currentTicket.average_vote ||
        currentTicket.standard_deviation !== null
    ) {
        return null;
    }
    const standardDeviationThreshold: StandardDeviationThreshold = {
        type: StandardDeviationThresholdType.success,
        header: StandardDeviationThresholdHeader.strong,
        message: StandardDeviationThresholdMessage.strong,
    };
    if (
        currentTicket.standard_deviation > 1.6 &&
        currentTicket.standard_deviation <= 3
    ) {
        standardDeviationThreshold.type =
            StandardDeviationThresholdType.warning;
        standardDeviationThreshold.header =
            StandardDeviationThresholdHeader.moderate;
        standardDeviationThreshold.message =
            StandardDeviationThresholdMessage.moderate;
    } else if (currentTicket.standard_deviation > 3) {
        standardDeviationThreshold.type = StandardDeviationThresholdType.danger;
        standardDeviationThreshold.header =
            StandardDeviationThresholdHeader.weak;
        standardDeviationThreshold.message =
            StandardDeviationThresholdMessage.weak;
    }

    return (
        <div className="text-center">
            <h5 className="text-center pb-4">
                Average Vote {currentTicket.average_vote} &plusmn;{' '}
                {currentTicket.standard_deviation}
            </h5>
            <div
                className={classNames('alert w-50 d-inline-block', {
                    'alert-success':
                        standardDeviationThreshold.type ===
                        StandardDeviationThresholdType.success,
                    'alert-warning':
                        standardDeviationThreshold.type ===
                        StandardDeviationThresholdType.warning,
                    'alert-danger':
                        standardDeviationThreshold.type ===
                        StandardDeviationThresholdType.danger,
                })}
                role="alert"
            >
                <h6>{standardDeviationThreshold.header}</h6>
                <p>{standardDeviationThreshold.message}</p>
            </div>
        </div>
    );
};

export default AverageVote;
