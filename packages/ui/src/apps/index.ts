import { pokerPaths } from './planningPoker/routes';
import { skillsPaths } from './skillsMatrix/routes';
import { capacityPaths } from './sprintCapacity/routes';

export type AppId = 'planningPoker' | 'sprintCapacity' | 'skillsMatrix';

export interface AppInfo {
    id: AppId;
    name: string;
    /** a few words for the navbar and tiles */
    tagline: string;
    description: string;
    path: string;
    icon: string;
    /** still being built: shows a placeholder page */
    comingSoon?: boolean;
}

/** Every app in Teamdeck, in the order they appear on the homepage and navbar */
export const apps: AppInfo[] = [
    {
        id: 'planningPoker',
        name: 'Planning Poker',
        tagline: 'Estimate together',
        description:
            'Refine tickets as a team: everyone votes in secret, then reveal and agree on an estimate.',
        path: pokerPaths.home,
        icon: '🃏',
    },
    {
        id: 'sprintCapacity',
        name: 'Sprint Capacity Planner',
        tagline: 'Plan what fits',
        description:
            'Work out how many points the next sprint can hold, from past velocity, who is away and what is carried over.',
        path: capacityPaths.home,
        icon: '📅',
    },
    {
        id: 'skillsMatrix',
        name: 'Skills Matrix',
        tagline: 'Know your team',
        description:
            'See who knows what, spot gaps and single points of failure, and plan who learns what next.',
        path: skillsPaths.home,
        icon: '🧭',
        comingSoon: true,
    },
];

/** The apps people can use today. Unfinished ones stay out of the menu and tiles until they are ready. */
export const liveApps = apps.filter((app) => !app.comingSoon);

export const getApp = (id: AppId) => apps.find((app) => app.id === id)!;

/** The app whose pages are showing, if any */
export const findCurrentApp = (pathname: string) =>
    apps.find(
        (app) => pathname === app.path || pathname.startsWith(`${app.path}/`)
    );
