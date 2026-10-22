import classNames from 'classnames';
import { usePokerSession } from '../../../context';

/** Facilitator-only settings that apply to the whole session, whichever ticket is selected */
const SessionControls = () => {
    const {
        isAdmin,
        refinementMode,
        toggleRefinementMode,
        room,
        setRoomHidden,
    } = usePokerSession();

    if (!isAdmin || !room) return null;

    const finishAndHide = () => {
        if (
            confirm(
                "End this whole session? The room and all its tickets will be hidden from everyone's room lists, including favourites. Anyone with the link can still open it, and you can unhide it later."
            )
        ) {
            setRoomHidden(true);
        }
    };

    return (
        <section className="session-controls d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <span className="small fw-semibold text-secondary text-uppercase">
                Session controls
            </span>
            <div className="d-flex flex-wrap gap-2">
                <button
                    className={classNames('btn btn-sm', {
                        'btn-dark': refinementMode,
                        'btn-outline-dark': !refinementMode,
                    })}
                    onClick={toggleRefinementMode}
                    aria-pressed={refinementMode}
                    title="Hide your own vote until Show Votes is pressed, for the whole session. Use this when sharing your screen."
                >
                    Refinement mode: {refinementMode ? 'On' : 'Off'}
                </button>
                {room.hidden ? (
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setRoomHidden(false)}
                    >
                        Unhide room
                    </button>
                ) : (
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={finishAndHide}
                        title="Ends the whole session: hides this room and all its tickets from everyone's room lists"
                    >
                        End session and hide room
                    </button>
                )}
            </div>
        </section>
    );
};

export default SessionControls;
