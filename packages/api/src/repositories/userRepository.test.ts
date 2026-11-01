import { describe, expect, it, vi } from 'vitest';

import { supabase } from '../db/supabase.js';
import { makeNewUser, makeUser } from '../test/factories.js';
import { fail, ok, queueResults } from '../test/supabaseMock.js';
import {
    createUser,
    findUserBySub,
    findUsersByIds,
    findExemplars,
    findUserSettings,
    replaceExemplars,
    upsertUserSettings,
} from './userRepository.js';

vi.mock('../db/supabase.js', () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

describe('userRepository', () => {
    it('findUserBySub returns the first matching user', async () => {
        const user = makeUser();
        const [query] = queueResults(from, ok([user]));

        await expect(findUserBySub('auth0|user-1')).resolves.toEqual(user);
        expect(from).toHaveBeenCalledWith('user');
        expect(query.eq).toHaveBeenCalledWith('auth0_sub', 'auth0|user-1');
    });

    it('findUserBySub returns undefined when there is no match', async () => {
        queueResults(from, ok([]));
        await expect(findUserBySub('nobody')).resolves.toBeUndefined();
    });

    it('findUserBySub throws on a db error', async () => {
        queueResults(from, fail());
        await expect(findUserBySub('x')).rejects.toMatchObject({
            status: 500,
            message: 'Error fetching user',
        });
    });

    it('findUsersByIds filters by id', async () => {
        const [query] = queueResults(from, ok([makeUser()]));
        await findUsersByIds([1, 2]);
        expect(query.in).toHaveBeenCalledWith('user_id', [1, 2]);
    });

    it('createUser inserts the user', async () => {
        const newUser = makeNewUser();
        const [query] = queueResults(from, ok(null));
        await createUser(newUser);
        expect(query.insert).toHaveBeenCalledWith(newUser);
    });

    it('createUser throws on a db error', async () => {
        queueResults(from, fail());
        const newUser = makeNewUser();
        await expect(createUser(newUser)).rejects.toMatchObject({
            message: 'Error creating user',
        });
    });

    it('findUserSettings reads the user_settings row', async () => {
        const row = {
            user_id: 3,
            default_base_url: 'u',
            default_theme: 'dark',
        };
        const [query] = queueResults(from, ok([row]));
        await expect(findUserSettings(3)).resolves.toEqual(row);
        expect(from).toHaveBeenCalledWith('user_settings');
        expect(query.eq).toHaveBeenCalledWith('user_id', 3);
    });

    it('upsertUserSettings saves one row per user', async () => {
        const row = {
            user_id: 3,
            default_base_url: null,
            default_theme: 'light' as const,
        };
        const [query] = queueResults(from, ok(null));
        await upsertUserSettings(row);
        expect(query.upsert).toHaveBeenCalledWith(row);
    });

    it('findExemplars maps rows to exemplars', async () => {
        queueResults(
            from,
            ok([
                {
                    exemplar_id: 1,
                    user_id: 3,
                    estimate: 2,
                    ticket_number: 'PP-2',
                },
            ])
        );
        await expect(findExemplars(3)).resolves.toEqual([
            { estimate: 2, ticketNumber: 'PP-2' },
        ]);
        expect(from).toHaveBeenCalledWith('user_exemplar');
    });

    it('replaceExemplars deletes the old rows then inserts the new', async () => {
        const [del, ins] = queueResults(from, ok(null), ok(null));
        await replaceExemplars(3, [{ estimate: 8, ticketNumber: 'PP-8' }]);
        expect(del.delete).toHaveBeenCalled();
        expect(del.eq).toHaveBeenCalledWith('user_id', 3);
        expect(ins.insert).toHaveBeenCalledWith([
            { user_id: 3, estimate: 8, ticket_number: 'PP-8' },
        ]);
    });

    it('replaceExemplars skips the insert when clearing them', async () => {
        queueResults(from, ok(null));
        await replaceExemplars(3, []);
        expect(from).toHaveBeenCalledTimes(1);
    });
});
