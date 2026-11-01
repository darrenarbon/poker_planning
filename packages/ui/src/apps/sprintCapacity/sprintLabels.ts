import { Confidence, PointsRange, SprintStatus } from '../../types';

export const statusLabels: Record<SprintStatus, string> = {
    planned: 'Planned',
    active: 'Active',
    closed: 'Closed',
};

export const statusBadge: Record<SprintStatus, string> = {
    planned: 'text-bg-secondary',
    active: 'text-bg-primary',
    closed: 'bg-body-secondary text-body border',
};

export const confidenceLabels: Record<Confidence, string> = {
    none: 'Not enough history',
    low: 'Low confidence',
    normal: 'Based on recent sprints',
};

/** Points and days without trailing zeros: 12, 12.5 */
export const formatNumber = (value: number): string =>
    String(Math.round(value * 10) / 10);

export const formatRange = (range: PointsRange): string =>
    `${formatNumber(range.low)}–${formatNumber(range.high)}`;

export const formatSprintDay = (day: string): string =>
    new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

export const formatSprintDates = (start: string, end: string): string =>
    `${formatSprintDay(start)} – ${formatSprintDay(end)}`;
