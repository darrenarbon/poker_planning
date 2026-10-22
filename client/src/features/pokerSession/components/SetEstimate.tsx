import VoteValueButtons from '../../../components/VoteValueButtons';

type SetEstimateProps = {
    chosenEstimate: number | undefined;
    onSetEstimate: (estimate: number) => void;
};

const SetEstimate = ({ chosenEstimate, onSetEstimate }: SetEstimateProps) => (
    <div className="mx-auto">
        <h4>Set Final Estimate</h4>
        <div>
            <button
                className="btn btn-warning mx-2"
                onClick={() => onSetEstimate(0)}
            >
                Reset Estimate
            </button>
            <VoteValueButtons
                selected={chosenEstimate}
                onSelect={onSetEstimate}
            />
        </div>
    </div>
);

export default SetEstimate;
