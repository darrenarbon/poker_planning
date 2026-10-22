import classNames from 'classnames';
import Tooltip from '../../../components/Tooltip';
import { usePokerSession } from '../../../context';

/** Facilitator-only settings that apply to the whole session, whichever ticket is selected */
const SessionControls = () => {
    const {
        isAdmin,
        refinementMode,
        toggleRefinementMode,
        room,
        tickets,
        setRoomHidden,
        archiveSprint,
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

    const startNewSprint = () => {
        if (
            confirm(
                'Start a new sprint? All current tickets will move to Past sprints. The room link stays the same.'
            )
        ) {
            archiveSprint();
        }
    };

    return (
        <section className="session-controls d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <span className="small fw-semibold text-secondary text-uppercase">
                Session controls
            </span>
            <div className="d-flex flex-wrap gap-2">
                <Tooltip text="For screen sharing. Hides your own vote until votes are shown, hides the delete and facilitator controls, and moves everyone to each ticket you select.">
                    <button
                        className={classNames('btn btn-sm', {
                            'btn-dark': refinementMode,
                            'btn-outline-dark': !refinementMode,
                        })}
                        onClick={toggleRefinementMode}
                        aria-pressed={refinementMode}
                    >
                        Refinement mode: {refinementMode ? 'On' : 'Off'}
                    </button>
                </Tooltip>
                <Tooltip text="Moves every current ticket to Past sprints so you can plan the next sprint. The room link stays the same.">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={startNewSprint}
                        disabled={tickets.length === 0}
                    >
                        Start new sprint
                    </button>
                </Tooltip>
                {room.hidden ? (
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setRoomHidden(false)}
                    >
                        Unhide room
                    </button>
                ) : (
                    <Tooltip text="Ends the session and hides this room and its tickets from everyone's room lists. Anyone with the link can still open it, and you can unhide it.">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={finishAndHide}
                        >
                            End session and hide room
                        </button>
                    </Tooltip>
                )}
            </div>
        </section>
    );
};

export default SessionControls;
