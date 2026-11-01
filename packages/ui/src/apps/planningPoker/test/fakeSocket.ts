import { Mock, vi } from 'vitest';

type Handler = (...args: never[]) => void;

/**
 * Minimal stand-in for the socket.io client. `emit` records what the app
 * sends; `serverEmit` triggers the app's listeners as if the server sent it.
 */
export type FakeSocket = {
    connected: boolean;
    auth: unknown;
    on: Mock<(event: string, handler: Handler) => FakeSocket>;
    off: Mock<(event: string, handler: Handler) => FakeSocket>;
    emit: Mock;
    connect: Mock<() => FakeSocket>;
    disconnect: Mock<() => FakeSocket>;
    serverEmit: (event: string, ...args: unknown[]) => void;
    listenerCount: (event: string) => number;
    reset: () => void;
};

export const createFakeSocket = (): FakeSocket => {
    const handlers = new Map<string, Set<Handler>>();

    const fake: FakeSocket = {
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
