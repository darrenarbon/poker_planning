import { Theme } from '../hooks/useTheme';

/** An example ticket showing the team what an estimate looks like */
export interface Exemplar {
    estimate: number;
    ticketNumber: string;
}

/** A user's defaults, as returned by GET /me/settings */
export interface UserSettings {
    /** prefilled when creating a room */
    defaultBaseUrl?: string;
    /** the theme the app opens in; unset follows the device */
    theme?: Theme;
    /** shown on the voting page of rooms this user owns */
    exemplars?: Exemplar[];
}
