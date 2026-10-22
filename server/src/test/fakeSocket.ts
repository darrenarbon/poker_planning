import type { Server, Socket } from 'socket.io';
import { vi } from 'vitest';

/**
 * A minimal fake socket + io pair. `trigger` invokes a registered event
 * handler; emits to rooms are captured on `roomEmit` / `ioEmit`.
 */
export const createFakeSocket = () => {
    const handlers = new Map<string, (payload: unknown) => Promise<void>>();
    const roomEmit = vi.fn();
    const ioEmit = vi.fn();

    const socket = {
        on: vi.fn((event: string, handler: (p: unknown) => Promise<void>) => {
            handlers.set(event, handler);
        }),
        emit: vi.fn(),
        join: vi.fn(),
        to: vi.fn(() => ({ emit: roomEmit })),
    };
    const io = { in: vi.fn(() => ({ emit: ioEmit })) };

    const trigger = (event: string, payload: unknown) => {
        const handler = handlers.get(event);
        if (!handler) throw new Error(`No handler for ${event}`);
        return handler(payload);
    };

    return {
        socket: socket as unknown as Socket & typeof socket,
        io: io as unknown as Server & typeof io,
        trigger,
        roomEmit,
        ioEmit,
    };
};
