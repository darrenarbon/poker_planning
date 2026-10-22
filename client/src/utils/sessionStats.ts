import { NO_IDEA_VOTE } from '../constants';
import { isConsensus } from '../hooks/useConsensusConfetti';
import { TicketForVoting } from '../types';

/** people must share this many voted tickets before they're compared */
const MIN_SHARED_TICKETS = 2;

export interface AlignedPair {
    subs: [string, string];
    /** mean gap between their votes, in points */
    averageGap: number;
    sharedTickets: number;
}

export interface BoldEstimator {
    sub: string;
    /** mean distance from the room's average, in points */
    averageDistance: number;
}

export interface SessionStats {
    alignedPair: AlignedPair | null;
    boldest: BoldEstimator | null;
    /** longest run of tickets in a row where everyone agreed */
    longestStreak: number;
    consensusCount: number;
    ticketCount: number;
}

/** a sprint is finished once it has tickets and every one has been revealed */
export const isSessionComplete = (tickets: TicketForVoting[]): boolean =>
    tickets.length > 0 && tickets.every((t) => t.votes_revealed);

/** each ticket's numeric votes keyed by voter, ignoring "No Idea" */
const votesBySub = (ticket: TicketForVoting): Map<string, number> =>
    new Map(
        ticket.votes
            .filter((v) => v.usersub && v.vote !== NO_IDEA_VOTE)
            .map((v) => [v.usersub as string, v.vote])
    );

const round = (n: number) => parseFloat(n.toFixed(2));

const findAlignedPair = (rounds: Map<string, number>[]): AlignedPair | null => {
    const subs = [...new Set(rounds.flatMap((r) => [...r.keys()]))].sort();
    let best: AlignedPair | null = null;

    for (let i = 0; i < subs.length; i++) {
        for (let j = i + 1; j < subs.length; j++) {
            const gaps = rounds
                .filter((r) => r.has(subs[i]) && r.has(subs[j]))
                .map((r) => Math.abs(r.get(subs[i])! - r.get(subs[j])!));
            if (gaps.length < MIN_SHARED_TICKETS) continue;

            const averageGap = gaps.reduce((a, b) => a + b) / gaps.length;
            // closer wins; on a tie, the pair that voted together more
            if (
                !best ||
                averageGap < best.averageGap ||
                (averageGap === best.averageGap &&
                    gaps.length > best.sharedTickets)
            ) {
                best = {
                    subs: [subs[i], subs[j]],
                    averageGap,
                    sharedTickets: gaps.length,
                };
            }
        }
    }
    return best && { ...best, averageGap: round(best.averageGap) };
};

const findBoldest = (rounds: Map<string, number>[]): BoldEstimator | null => {
    const distances = new Map<string, number[]>();
    rounds
        .filter((r) => r.size >= 2)
        .forEach((r) => {
            const mean = [...r.values()].reduce((a, b) => a + b) / r.size;
            r.forEach((vote, sub) =>
                distances.set(sub, [
                    ...(distances.get(sub) ?? []),
                    Math.abs(vote - mean),
                ])
            );
        });

    let best: BoldEstimator | null = null;
    for (const [sub, ds] of distances) {
        if (ds.length < MIN_SHARED_TICKETS) continue;
        const averageDistance = ds.reduce((a, b) => a + b) / ds.length;
        if (averageDistance > (best?.averageDistance ?? 0)) {
            best = { sub, averageDistance };
        }
    }
    return best && { ...best, averageDistance: round(best.averageDistance) };
};

/** Fun end-of-sprint awards, worked out from the tickets in list order */
export const calculateSessionStats = (
    tickets: TicketForVoting[]
): SessionStats => {
    const rounds = tickets.map(votesBySub);

    let longestStreak = 0;
    let streak = 0;
    let consensusCount = 0;
    tickets.forEach((t) => {
        if (isConsensus(t)) {
            consensusCount++;
            streak++;
            longestStreak = Math.max(longestStreak, streak);
        } else {
            streak = 0;
        }
    });

    return {
        alignedPair: findAlignedPair(rounds),
        boldest: findBoldest(rounds),
        longestStreak,
        consensusCount,
        ticketCount: tickets.length,
    };
};
