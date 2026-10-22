/** Trims whitespace and any trailing slash so links can be built as `${base}/${ticket}` */
export const normaliseBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

/** Splits pasted ticket IDs on commas, whitespace or new lines, removing blanks */
export const parseTicketList = (input: string): string[] =>
    input
        .split(/[\s,;]+/)
        .map((ticket) => ticket.trim())
        .filter((ticket) => ticket !== '');

export const ticketUrl = (baseUrl: string, ticketNumber: string) =>
    `${normaliseBaseUrl(baseUrl)}/${ticketNumber}`;
