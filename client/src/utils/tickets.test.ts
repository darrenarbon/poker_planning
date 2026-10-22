import { describe, expect, it } from 'vitest';
import { normaliseBaseUrl, parseTicketList, ticketUrl } from './tickets';

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
