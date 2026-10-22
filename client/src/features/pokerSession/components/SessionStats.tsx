import Tooltip from '../../../components/Tooltip';
import { usePokerSession } from '../../../context';
import { UserModel } from '../../../types';
import { calculateSessionStats, getDisplayName } from '../../../utils';

type AwardProps = {
    emoji: string;
    label: string;
    value: string;
    detail: string;
    /** how the award is worked out */
    explanation: string;
};

const Award = ({ emoji, label, value, detail, explanation }: AwardProps) => (
    <div className="vote-stat">
        <div className="session-award-emoji" aria-hidden="true">
            {emoji}
        </div>
        <div className="vote-stat-label">
            {label}{' '}
            <Tooltip text={explanation}>
                <span
                    className="session-award-info"
                    tabIndex={0}
                    role="img"
                    aria-label={`How ${label.toLowerCase()} is worked out: ${explanation}`}
                >
                    ⓘ
                </span>
            </Tooltip>
        </div>
        <div className="session-award-value">{value}</div>
        <div className="small text-secondary">{detail}</div>
    </div>
);

const points = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;

/** End-of-sprint awards, shown once every ticket has been revealed */
const SessionStats = () => {
    const { tickets, users, closeStats } = usePokerSession();
    const stats = calculateSessionStats(tickets);

    const nameOf = (sub: string) => {
        const user = users.find((u: UserModel) => u.auth0_sub === sub);
        return (user && getDisplayName(user)) ?? 'Someone';
    };

    const { alignedPair, boldest, longestStreak, consensusCount, ticketCount } =
        stats;

    return (
        <section className="card dashboard-card" aria-label="Sprint stats">
            <div className="card-body p-3 position-relative">
                <button
                    type="button"
                    className="btn-close position-absolute top-0 end-0 m-3"
                    aria-label="Close sprint stats"
                    onClick={closeStats}
                />
                <h2 className="h5 fw-bold text-center mb-1">
                    That's a wrap! 🎉
                </h2>
                <p className="text-secondary text-center small">
                    All {ticketCount} tickets estimated. Here's how it went.
                </p>
                <div className="vote-stats session-awards">
                    <Award
                        emoji="🤝"
                        label="Most aligned pair"
                        explanation="The two people whose votes were closest together, on average, across the tickets they both voted on (at least 2). No Idea votes don't count."
                        value={
                            alignedPair
                                ? alignedPair.subs.map(nameOf).join(' & ')
                                : '–'
                        }
                        detail={
                            alignedPair
                                ? alignedPair.averageGap === 0
                                    ? `Identical on all ${alignedPair.sharedTickets} tickets`
                                    : `${points(alignedPair.averageGap)} apart on average`
                                : 'Not enough shared votes'
                        }
                    />
                    <Award
                        emoji="🎲"
                        label="Boldest estimator"
                        explanation="The person whose votes were furthest from the room's average on each ticket, on average. Going high or low both count. Needs votes on at least 2 tickets; No Idea votes don't count."
                        value={boldest ? nameOf(boldest.sub) : '–'}
                        detail={
                            boldest
                                ? `${points(boldest.averageDistance)} from the room on average`
                                : 'Everyone played it safe'
                        }
                    />
                    <Award
                        emoji="🔥"
                        label="Consensus streak"
                        explanation="The most tickets in a row, in list order, where everyone voted the same card. A ticket with fewer than 2 votes, a split vote or an all No Idea vote breaks the streak."
                        value={`${longestStreak} in a row`}
                        detail={`${consensusCount} of ${ticketCount} tickets unanimous`}
                    />
                </div>
            </div>
        </section>
    );
};

export default SessionStats;
