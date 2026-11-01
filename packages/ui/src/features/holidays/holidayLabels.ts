import {
    BankHolidayRegion,
    HolidayDayPart,
    HolidayReason,
    HOLIDAY_REASONS,
} from '../../types';

export const reasonLabels: Record<HolidayReason, string> = {
    annual_leave: 'Annual leave',
    sickness: 'Sickness',
    birthday_leave: 'Birthday leave',
    bank_holiday: 'Bank holiday',
    maternity_leave: 'Maternity leave',
    paternity_leave: 'Paternity leave',
    parental_leave: 'Parental leave',
    compassionate_leave: 'Compassionate leave',
    study_leave: 'Study leave',
    unpaid_leave: 'Unpaid leave',
    jury_service: 'Jury service',
    other: 'Other',
};

export const reasonOptions = HOLIDAY_REASONS.map((value) => ({
    value,
    label: reasonLabels[value],
}));

export const dayPartLabels: Record<HolidayDayPart, string> = {
    full: 'Full days',
    am: 'Mornings only',
    pm: 'Afternoons only',
};

export const regionLabels: Record<BankHolidayRegion, string> = {
    'england-and-wales': 'England and Wales',
    scotland: 'Scotland',
    'northern-ireland': 'Northern Ireland',
    spain: 'Spain',
    india: 'India',
};

/** Spain's communities, which add their own holidays to the national ones */
export const spainSubdivisions: Record<string, string> = {
    'ES-AN': 'Andalucía',
    'ES-AR': 'Aragón',
    'ES-AS': 'Asturias',
    'ES-CB': 'Cantabria',
    'ES-CE': 'Ceuta',
    'ES-CL': 'Castilla y León',
    'ES-CM': 'Castilla-La Mancha',
    'ES-CN': 'Canarias',
    'ES-CT': 'Catalunya',
    'ES-EX': 'Extremadura',
    'ES-GA': 'Galicia',
    'ES-IB': 'Illes Balears',
    'ES-MC': 'Murcia',
    'ES-MD': 'Madrid',
    'ES-ML': 'Melilla',
    'ES-NC': 'Navarra',
    'ES-PV': 'País Vasco',
    'ES-RI': 'La Rioja',
    'ES-VC': 'Comunitat Valenciana',
};

const formatDay = (day: string, withYear: boolean) =>
    new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(withYear && { year: 'numeric' }),
    });

/** e.g. "Thu 24 Dec – Thu 31 Dec 2026", or just "Fri 25 Dec 2026" for one day */
export const formatDayRange = (start: string, end: string): string =>
    start === end
        ? formatDay(start, true)
        : `${formatDay(start, false)} – ${formatDay(end, true)}`;

/** The date a datetime-local value falls on, and whether it is before or after midday */
export const sessionDayAndPart = (
    localValue: string
): { date: string; part: 'am' | 'pm' } | null => {
    const match = localValue.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):/);
    if (!match) return null;
    return { date: match[1], part: Number(match[2]) < 12 ? 'am' : 'pm' };
};
