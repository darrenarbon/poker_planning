import type { Server } from 'socket.io';
import { describe, expect, it, vi } from 'vitest';

import { registerSockets } from './index.js';

vi.mock('../db/supabase.js', () => ({ supabase: { from: vi.fn() } }));

describe('registerSockets', () => {
    it('registers every event handler on each connection', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        let onConnection: ((socket: unknown) => void) | undefined;
        const io = {
            use: vi.fn(),
            on: vi.fn((event: string, cb: (socket: unknown) => void) => {
                if (event === 'connection') onConnection = cb;
            }),
        };
        registerSockets(io as unknown as Server);

        const socket = { on: vi.fn() };
        onConnection!(socket);

        const events = socket.on.mock.calls.map(([event]) => event);
        expect(events).toEqual([
            'join',
            'vote',
            'showVotes',
            'setEstimate',
            'disconnect',
            'selectTicket',
            'revote',
            'startTimer',
            'stopTimer',
            'addCoFacilitator',
            'removeCoFacilitator',
            'handOver',
            'archiveSprint',
            'reorderTickets',
        ]);
        expect(io.use).toHaveBeenCalledTimes(1);
    });
});
