import classNames from 'classnames';
import { votingValues } from '../constants';

type VoteValueButtonsProps = {
    selected: number | null | undefined;
    onSelect: (value: number) => void;
    buttonClassName?: string;
    showTooltips?: boolean;
};

/** One button per card in the voting scale, highlighting the selected value */
const VoteValueButtons = ({
    selected,
    onSelect,
    buttonClassName,
    showTooltips = false,
}: VoteValueButtonsProps) => (
    <>
        {votingValues.map(({ value, label, tooltip }) => (
            <button
                key={value}
                className={classNames('btn mx-2', buttonClassName, {
                    'btn-primary': selected === value,
                    'btn-outline-primary': selected !== value,
                })}
                onClick={() => onSelect(value)}
                title={showTooltips ? tooltip : undefined}
            >
                {label}
            </button>
        ))}
    </>
);

export default VoteValueButtons;
