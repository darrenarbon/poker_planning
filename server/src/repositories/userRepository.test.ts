import { describe, expect, it, vi } from 'vitest';

import { supabase } from '../db/supabase.js';
import { makeNewUser, makeUser } from '../test/factories.js';
import { fail, ok, queueResults } from '../test/supabaseMock.js';
import {
    createUser,
    findUserBySub,
    findUsersByIds,
    updateUserSettings,
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

    it('updateUserSettings saves the settings on the user', async () => {
        const [query] = queueResults(from, ok(null));
        await updateUserSettings(3, { theme: 'light' });
        expect(query.update).toHaveBeenCalledWith({
            settings: { theme: 'light' },
        });
        expect(query.eq).toHaveBeenCalledWith('user_id', 3);
    });
});
