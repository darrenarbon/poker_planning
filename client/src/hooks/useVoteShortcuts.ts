import { useEffect } from 'react';
import { NO_IDEA_VOTE, votingValues } from '../constants';

/** How long to wait for a second digit, so "1" then "3" votes 13 */
export const SHORTCUT_DELAY_MS = 600;

const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Votes with the number keys: type a card's value (e.g. 5, or 1 then 3 for
 * 13). 0 or ? votes No Idea. Ignored while typing or when a modal is open.
 */
export const useVoteShortcuts = (
    onSelect: (value: number) => void,
    enabled = true
) => {
    useEffect(() => {
        if (!enabled) return;
        const values = votingValues
            .map((v) => v.value)
            .filter((v) => v !== NO_IDEA_VOTE)
            .map(String);
        let buffer = '';
        let timer: ReturnType<typeof setTimeout> | undefined;

        const flush = () => {
            if (values.includes(buffer)) onSelect(Number(buffer));
            buffer = '';
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target))
                return;
            if (document.querySelector('.modal.show, .modal.d-block')) return;
            clearTimeout(timer);
            if (e.key === '0' || e.key === '?') {
                buffer = '';
                onSelect(NO_IDEA_VOTE);
                return;
            }
            if (!/^[0-9]$/.test(e.key)) {
                buffer = '';
                return;
            }
            buffer += e.key;
            const longer = values.some(
                (v) => v.length > buffer.length && v.startsWith(buffer)
            );
            if (!longer) flush();
            else timer = setTimeout(flush, SHORTCUT_DELAY_MS);
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            clearTimeout(timer);
        };
    }, [onSelect, enabled]);
};
