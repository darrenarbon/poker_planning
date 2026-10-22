import { vi } from 'vitest';

type Handler = (...args: never[]) => void;

/**
 * Minimal stand-in for the socket.io client. `emit` records what the app
 * sends; `serverEmit` triggers the app's listeners as if the server sent it.
 */
export const createFakeSocket = () => {
    const handlers = new Map<string, Set<Handler>>();

    const fake = {
        connected: false,
        auth: undefined as unknown,
        on: vi.fn((event: string, handler: Handler) => {
            if (!handlers.has(event)) handlers.set(event, new Set());
            handlers.get(event)!.add(handler);
            return fake;
        }),
        off: vi.fn((event: string, handler: Handler) => {
            handlers.get(event)?.delete(handler);
            return fake;
        }),
        emit: vi.fn(),
        connect: vi.fn(() => {
            fake.connected = true;
            fake.serverEmit('connect');
            return fake;
        }),
        disconnect: vi.fn(() => {
            fake.connected = false;
            return fake;
        }),
        serverEmit: (event: string, ...args: unknown[]) => {
            handlers
                .get(event)
                ?.forEach((handler) =>
                    (handler as (...a: unknown[]) => void)(...args)
                );
        },
        listenerCount: (event: string) => handlers.get(event)?.size ?? 0,
        reset: () => {
            handlers.clear();
            fake.connected = false;
            vi.clearAllMocks();
        },
    };

    return fake;
};

export type FakeSocket = ReturnType<typeof createFakeSocket>;
