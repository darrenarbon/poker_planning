// bootstrap ships no types; this covers the parts the app uses
declare module 'bootstrap' {
    export class Tooltip {
        constructor(
            element: Element,
            options?: { placement?: string; trigger?: string }
        );
        setContent(content: Record<string, string>): void;
        dispose(): void;
    }
}
