import classNames from 'classnames';
import Tooltip from '../../../components/Tooltip';
import { usePokerSession } from '../../../context';
import { useConfirm } from '../../../hooks';

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
    const [confirm, confirmModal] = useConfirm();

    if (!isAdmin || !room) return null;

    const finishAndHide = () =>
        confirm({
            title: 'End this session?',
            message:
                "The room and all its tickets will be hidden from everyone's room lists, including favourites. Anyone with the link can still open it, and you can unhide it later.",
            confirmLabel: 'End session',
            variant: 'danger',
            onConfirm: () => setRoomHidden(true),
        });

    const startNewSprint = () =>
        confirm({
            title: 'Start a new sprint?',
            message:
                'All current tickets will move to Past sprints. The room link stays the same.',
            confirmLabel: 'Start new sprint',
            onConfirm: archiveSprint,
        });

    return (
        <section className="session-controls d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <span className="small fw-semibold text-secondary text-uppercase">
                Session controls
            </span>
            <div className="d-flex flex-wrap gap-2">
                <Tooltip text="For screen sharing. Hides your own vote until votes are shown, hides the delete and facilitator controls, and moves everyone to each ticket you select.">
                    <button
                        className={classNames('btn btn-sm', {
                            'btn-secondary': refinementMode,
                            'btn-outline-secondary': !refinementMode,
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
            {confirmModal}
        </section>
    );
};

export default SessionControls;
