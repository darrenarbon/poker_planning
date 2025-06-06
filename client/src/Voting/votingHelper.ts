export type VotingValue = {
    value: number;
    label: string;
    tooltip: string;
};

export const votingValues: VotingValue[] = [
    {
        value: 0,
        label: 'No Idea',
        tooltip:
            'I have no idea about this ticket, please only use this if you really have no idea',
    },
    {
        value: 1,
        label: '1',
        tooltip: 'This is a very small task, typically a non code change',
    },
    {
        value: 2,
        label: '2',
        tooltip: 'This is a small task, 1 - 2 hours of work',
    },
    {
        value: 3,
        label: '3',
        tooltip: 'This is a medium task, half a day of work',
    },
    {
        value: 5,
        label: '5',
        tooltip: 'This is a large task, 1 day of work',
    },
    {
        value: 8,
        label: '8',
        tooltip: 'This is a very large task, 1.5 days of work',
    },
    {
        value: 13,
        label: '13',
        tooltip: 'This is a very large task, 2 - 3 days of work',
    },
    {
        value: 21,
        label: '21',
        tooltip: 'This is a very large task, 5 days of work',
    },
];
