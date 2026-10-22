import { useState } from 'react';
import Tooltip from '../../../components/Tooltip';
import { usePokerSession } from '../../../context';
import { useConfirm } from '../../../hooks';
import { UserModel } from '../../../types';
import { getDisplayName } from '../../../utils';

/** Owner-only: share facilitator rights, take them back, or hand the room over */
const FacilitatorsPanel = () => {
    const {
        isOwner,
        room,
        users,
        addCoFacilitator,
        removeCoFacilitator,
        handOver,
        refinementMode,
    } = usePokerSession();
    const [selectedSub, setSelectedSub] = useState('');
    const [confirm, confirmModal] = useConfirm();

    // hidden while screen sharing
    if (!isOwner || !room || refinementMode) return null;

    const coFacilitatorSubs = room.coFacilitatorSubs ?? [];
    const nameOf = (sub: string) => {
        const player = users.find((u) => u.auth0_sub === sub);
        return (player && getDisplayName(player)) ?? 'Unknown player';
    };
    const candidates = users.filter(
        (u: UserModel) => u.auth0_sub && u.auth0_sub !== room.adminSub
    );
    const selectedIsCo = coFacilitatorSubs.includes(selectedSub);

    const confirmHandOver = () =>
        confirm({
            title: 'Hand over room?',
            message: `Make ${nameOf(selectedSub)} the owner of this room? You will stay on as a co-facilitator.`,
            confirmLabel: 'Hand over',
            onConfirm: () => {
                handOver(selectedSub);
                setSelectedSub('');
            },
        });

    return (
        <section className="facilitators-panel mb-4">
            <div className="small fw-semibold text-secondary text-uppercase mb-2">
                Facilitators
            </div>
            <ul className="list-unstyled d-flex flex-wrap gap-2 mb-2">
                <li className="badge text-bg-dark">
                    {nameOf(room.adminSub)} (owner)
                </li>
                {coFacilitatorSubs.map((sub) => (
                    <li
                        key={sub}
                        className="badge bg-body-secondary text-body border d-flex align-items-center gap-1"
                    >
                        {nameOf(sub)}
                        <button
                            type="button"
                            className="btn-close btn-close-sm"
                            aria-label={`Remove ${nameOf(sub)} as co-facilitator`}
                            onClick={() => removeCoFacilitator(sub)}
                        />
                    </li>
                ))}
            </ul>
            {candidates.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                    <select
                        className="form-select form-select-sm w-auto"
                        aria-label="Player"
                        value={selectedSub}
                        onChange={(e) => setSelectedSub(e.target.value)}
                    >
                        <option value="">Choose a player…</option>
                        {candidates.map((u) => (
                            <option key={u.auth0_sub} value={u.auth0_sub}>
                                {getDisplayName(u)}
                            </option>
                        ))}
                    </select>
                    <Tooltip text="Gives the chosen player the same session controls as you. Only you, as owner, can remove them.">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={!selectedSub || selectedIsCo}
                            onClick={() => {
                                addCoFacilitator(selectedSub);
                                setSelectedSub('');
                            }}
                        >
                            Make co-facilitator
                        </button>
                    </Tooltip>
                    <Tooltip text="Makes the chosen player the room's owner. You stay on as a co-facilitator.">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={!selectedSub}
                            onClick={confirmHandOver}
                        >
                            Hand over room
                        </button>
                    </Tooltip>
                </div>
            )}
            {confirmModal}
        </section>
    );
};

export default FacilitatorsPanel;
