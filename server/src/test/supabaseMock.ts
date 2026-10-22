import { vi } from 'vitest';

type Result = { data: unknown; error: unknown };

/**
 * A fake Supabase query builder. Every chained method is a spy that returns
 * the builder, and awaiting the builder resolves to the queued result.
 */
export const createQueryBuilder = (result: Result) => {
    const builder: Record<string, unknown> = {};
    for (const method of [
        'select',
        'insert',
        'update',
        'delete',
        'eq',
        'in',
        'order',
    ]) {
        builder[method] = vi.fn(() => builder);
    }
    builder.then = (resolve: (r: Result) => unknown) => resolve(result);
    return builder as Record<
        'select' | 'insert' | 'update' | 'delete' | 'eq' | 'in' | 'order',
        ReturnType<typeof vi.fn>
    >;
};

/**
 * Makes supabase.from() return a new builder per call, resolving to each
 * queued result in order. Returns the builders so tests can inspect calls.
 */
export const queueResults = (
    from: ReturnType<typeof vi.fn>,
    ...results: Result[]
) => {
    const builders = results.map(createQueryBuilder);
    builders.forEach((b) => from.mockReturnValueOnce(b));
    return builders;
};

export const ok = (data: unknown): Result => ({ data, error: null });
export const fail = (message = 'db down'): Result => ({
    data: null,
    error: { message },
});
