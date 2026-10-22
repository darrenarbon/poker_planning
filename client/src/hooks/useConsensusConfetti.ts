import confetti from 'canvas-confetti';
import { useEffect, useRef, useState } from 'react';
import { NO_IDEA_VOTE } from '../constants';
import { TicketForVoting } from '../types';

/** true when at least two people voted and every vote is the same number */
export const isConsensus = (ticket: TicketForVoting | undefined): boolean => {
    const votes = ticket?.votes?.map((v) => v.vote) ?? [];
    return (
        votes.length >= 2 &&
        votes[0] !== NO_IDEA_VOTE &&
        votes.every((vote) => vote === votes[0])
    );
};

/** true when at least three people voted and no two votes are the same */
export const isTotalDisagreement = (
    ticket: TicketForVoting | undefined
): boolean => {
    const votes = ticket?.votes?.map((v) => v.vote) ?? [];
    return votes.length >= 3 && new Set(votes).size === votes.length;
};

export const DISAGREEMENT_QUIPS = [
    'Nobody agrees. Bold strategy.',
    'Total chaos! Did everyone read the same ticket?',
    'Every vote is different. Impressive, honestly.',
    'The team has achieved perfect disagreement.',
    'Have you tried estimating the same thing?',
];

const celebrate = () => {
    const end = Date.now() + 1500;
    const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 } });
        confetti({
            particleCount: 6,
            angle: 120,
            spread: 70,
            origin: { x: 1 },
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    };
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
    frame();
};

/** Rains shrugs, clowns and dice down the screen */
const shrug = () => {
    const scalar = 2.5;
    const shapes = ['🤷', '🤡', '🎲', '🙈'].map((text) =>
        confetti.shapeFromText({ text, scalar })
    );
    confetti({
        particleCount: 40,
        spread: 180,
        startVelocity: 15,
        gravity: 0.6,
        ticks: 300,
        origin: { y: -0.1 },
        shapes,
        scalar,
        flat: true,
    });
};

const QUIP_DURATION_MS = 4000;

/**
 * Reacts once to each revealed round of votes: confetti when everyone agrees,
 * falling shrugs and a quip when every vote is different. Returns the quip
 * while it should be on screen.
 */
export const useConsensusConfetti = (
    ticket: TicketForVoting | undefined,
    showVotes: boolean
): string | null => {
    const reacted = useRef(new Set<string>());
    const [quip, setQuip] = useState<{
        ticketId: string;
        text: string;
    } | null>(null);

    useEffect(() => {
        if (!ticket || !showVotes) return;
        const consensus = isConsensus(ticket);
        const chaos = isTotalDisagreement(ticket);
        if (!consensus && !chaos) return;

        // keyed on the votes too, so a re-vote gets its own reaction
        const round = `${ticket.ticket_id}:${ticket.votes
            .map((v) => v.vote)
            .sort()
            .join(',')}`;
        if (reacted.current.has(round)) return;
        reacted.current.add(round);

        if (chaos) {
            setQuip({
                ticketId: ticket.ticket_id,
                text: DISAGREEMENT_QUIPS[
                    Math.floor(Math.random() * DISAGREEMENT_QUIPS.length)
                ],
            });
        }
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        if (consensus) {
            celebrate();
        } else {
            shrug();
        }
    }, [ticket, showVotes]);

    useEffect(() => {
        if (!quip) return;
        const id = setTimeout(() => setQuip(null), QUIP_DURATION_MS);
        return () => clearTimeout(id);
    }, [quip]);

    // a quip belongs to the ticket it was made about
    return quip && quip.ticketId === ticket?.ticket_id ? quip.text : null;
};
