export type SprintStatus = 'planned' | 'active' | 'closed';

/** A sprint as returned by the API. Dates are YYYY-MM-DD. */
export interface Sprint {
    sprintId: number;
    teamId: number;
    name: string;
    startDate: string;
    endDate: string;
    status: SprintStatus;
    bufferPercent: number;
    carriedOverPoints: number;
    carriedOverTickets: number;
    plannedPoints: number | null;
    completedPoints: number | null;
    availablePersonDays: number | null;
    velocityPerPersonDay: number | null;
    closedAt: string | null;
    memberIds: number[];
}

/** What is sent to create or change a sprint */
export interface SprintInput {
    name: string;
    startDate: string;
    endDate: string;
    bufferPercent: number;
    carriedOverPoints: number;
    carriedOverTickets: number;
    plannedPoints?: number;
    completedPoints?: number;
    memberIds: number[];
}

export type Confidence = 'none' | 'low' | 'normal';

export interface VelocitySummary {
    sprintsUsed: number;
    perPersonDay: number | null;
    lowPerPersonDay: number | null;
    highPerPersonDay: number | null;
    confidence: Confidence;
}

export interface PointsRange {
    expected: number;
    low: number;
    high: number;
}

export interface SprintPerson {
    userId: number;
    sub: string;
    givenName: string;
    familyName: string;
    nickname: string;
    picture: string;
    jobTitle: string | null;
    leaveDays: number;
    availableDays: number;
}

/** What a sprint could hold, from velocity and leave */
export interface SprintForecast {
    workingDays: number;
    people: SprintPerson[];
    availablePersonDays: number;
    velocity: VelocitySummary;
    bufferPercent: number;
    carriedOverPoints: number;
    capacity: PointsRange | null;
    capacityBeforeBuffer: PointsRange | null;
    newPoints: PointsRange | null;
}

export interface TeamSprints {
    canManage: boolean;
    velocity: VelocitySummary;
    sprints: Sprint[];
}

export interface SprintDetails {
    canManage: boolean;
    sprint: Sprint;
    forecast: SprintForecast;
}

export interface ForecastQuery {
    startDate: string;
    endDate: string;
    memberIds: number[];
    bufferPercent: number;
    carriedOverPoints: number;
}
