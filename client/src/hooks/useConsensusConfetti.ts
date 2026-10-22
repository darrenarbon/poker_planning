import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';
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

/** Showers the screen with confetti when revealed votes all agree, once per ticket */
export const useConsensusConfetti = (
    ticket: TicketForVoting | undefined,
    showVotes: boolean
) => {
    const celebrated = useRef(new Set<string | number>());

    useEffect(() => {
        if (!ticket || !showVotes || !isConsensus(ticket)) return;
        if (celebrated.current.has(ticket.ticket_id)) return;
        celebrated.current.add(ticket.ticket_id);
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        celebrate();
    }, [ticket, showVotes]);
};
