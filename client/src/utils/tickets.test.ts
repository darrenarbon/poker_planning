import { describe, expect, it } from 'vitest';
import { makeTicket } from '../test/factories';
import {
    findNextTicket,
    normaliseBaseUrl,
    parseTicketList,
    ticketUrl,
} from './tickets';

describe('tickets utils', () => {
    it('normalises the base url', () => {
        expect(normaliseBaseUrl(' https://x.com/browse// ')).toBe(
            'https://x.com/browse'
        );
    });

    it('parses commas, spaces and new lines', () => {
        expect(parseTicketList(' ABC-1, ,ABC-2\nABC-3  ABC-4;')).toEqual([
            'ABC-1',
            'ABC-2',
            'ABC-3',
            'ABC-4',
        ]);
    });

    it('builds a ticket url', () => {
        expect(ticketUrl('https://x.com/browse/', 'ABC-1')).toBe(
            'https://x.com/browse/ABC-1'
        );
    });
});

describe('findNextTicket', () => {
    const t = (id: string, revealed = false) =>
        makeTicket({ ticket_id: id, votes_revealed: revealed });

    it('skips tickets whose votes are already revealed', () => {
        const tickets = [t('a'), t('b', true), t('c')];
        expect(findNextTicket(tickets, 'a')?.ticket_id).toBe('c');
    });

    it('wraps round to unvoted tickets earlier in the list', () => {
        const tickets = [t('a'), t('b', true), t('c', true)];
        expect(findNextTicket(tickets, 'b')?.ticket_id).toBe('a');
    });

    it('starts from the top with nothing selected', () => {
        expect(findNextTicket([t('a'), t('b')], undefined)?.ticket_id).toBe(
            'a'
        );
    });

    it('falls back to the next ticket once everything is revealed', () => {
        const tickets = [t('a', true), t('b', true)];
        expect(findNextTicket(tickets, 'a')?.ticket_id).toBe('b');
        expect(findNextTicket(tickets, 'b')).toBeUndefined();
    });
});
