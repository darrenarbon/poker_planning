import classNames from 'classnames';
import { FormEvent, useEffect, useState } from 'react';
import { usePokerSession } from '../../../context';

const PRESET_MINUTES = [1, 2, 3, 5];

const formatRemaining = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/** Milliseconds left until endsAt, ticking every half second while running */
const useRemaining = (endsAt: number | null) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (endsAt === null) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, [endsAt]);
    return endsAt === null ? null : Math.max(0, endsAt - now);
};

/** An optional countdown for discussing the current ticket, shared by everyone */
const DiscussionTimer = () => {
    const { timerEndsAt, isAdmin, startTimer, stopTimer } = usePokerSession();
    const remaining = useRemaining(timerEndsAt);
    const [customMinutes, setCustomMinutes] = useState('');

    if (remaining === null && !isAdmin) return null;

    const timeUp = remaining === 0;

    const startCustom = (event: FormEvent) => {
        event.preventDefault();
        const minutes = Number(customMinutes);
        if (minutes > 0 && minutes <= 60) {
            startTimer(Math.round(minutes * 60));
            setCustomMinutes('');
        }
    };

    return (
        <section
            className={classNames(
                'discussion-timer d-flex flex-wrap align-items-center justify-content-between gap-2',
                { 'time-up': timeUp }
            )}
            aria-label="Discussion timer"
        >
            <span className="small fw-semibold text-secondary text-uppercase">
                Discussion timer
            </span>
            {remaining !== null && (
                <span
                    className="timer-display fw-bold"
                    role="timer"
                    aria-live={timeUp ? 'assertive' : 'off'}
                >
                    {timeUp ? "Time's up" : formatRemaining(remaining)}
                </span>
            )}
            {isAdmin && (
                <div className="d-flex flex-wrap align-items-center gap-2">
                    {remaining !== null ? (
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={stopTimer}
                        >
                            {timeUp ? 'Clear' : 'Stop'}
                        </button>
                    ) : (
                        <>
                            {PRESET_MINUTES.map((minutes) => (
                                <button
                                    key={minutes}
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => startTimer(minutes * 60)}
                                >
                                    {minutes} min
                                </button>
                            ))}
                            <form
                                className="d-flex gap-1"
                                onSubmit={startCustom}
                            >
                                <input
                                    type="number"
                                    min="0.5"
                                    max="60"
                                    step="0.5"
                                    className="form-control form-control-sm timer-input"
                                    placeholder="min"
                                    aria-label="Custom minutes"
                                    value={customMinutes}
                                    onChange={(e) =>
                                        setCustomMinutes(e.target.value)
                                    }
                                />
                                <button
                                    type="submit"
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={!customMinutes}
                                >
                                    Start
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

export default DiscussionTimer;
