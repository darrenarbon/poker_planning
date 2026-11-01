import { describe, expect, it } from 'vitest';
import { apps, findCurrentApp, getApp } from '.';

describe('apps', () => {
    it('gives every app its own path', () => {
        const appPaths = apps.map((app) => app.path);
        expect(new Set(appPaths).size).toBe(apps.length);
    });

    it('finds an app by id', () => {
        expect(getApp('skillsMatrix').name).toBe('Skills Matrix');
    });

    it("finds the app from any of its pages' paths", () => {
        expect(findCurrentApp('/poker')?.id).toBe('planningPoker');
        expect(findCurrentApp('/poker/room/abc/voting')?.id).toBe(
            'planningPoker'
        );
        expect(findCurrentApp('/capacity')?.id).toBe('sprintCapacity');
    });

    it('finds no app on shared pages or lookalike paths', () => {
        expect(findCurrentApp('/')).toBeUndefined();
        expect(findCurrentApp('/settings')).toBeUndefined();
        expect(findCurrentApp('/pokerface')).toBeUndefined();
    });
});
