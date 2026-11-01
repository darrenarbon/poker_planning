import classNames from 'classnames';
import { MouseEvent } from 'react';

type FavouriteButtonProps = {
    favourite: boolean;
    onToggle: () => void;
    roomName: string;
    className?: string;
};

/** Star toggle for adding a room to the user's favourites */
const FavouriteButton = ({
    favourite,
    onToggle,
    roomName,
    className,
}: FavouriteButtonProps) => (
    <button
        type="button"
        className={classNames('favourite-button', className, {
            active: favourite,
        })}
        aria-pressed={favourite}
        aria-label={
            favourite
                ? `Remove ${roomName} from favourites`
                : `Add ${roomName} to favourites`
        }
        title={favourite ? 'Remove from favourites' : 'Add to favourites'}
        onClick={(e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
        }}
    >
        {favourite ? '★' : '☆'}
    </button>
);

export default FavouriteButton;
