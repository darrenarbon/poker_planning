export type VotingValue = {
    value: number;
    label: string;
    tooltip: string;
};

export const NO_IDEA_VOTE = 0;

export const votingValues: readonly VotingValue[] = [
    {
        value: NO_IDEA_VOTE,
        label: 'No Idea',
        tooltip:
            'I have no idea about this ticket, please only use this if you really have no idea',
    },
    {
        value: 1,
        label: '1',
        tooltip: 'This is a very small task',
    },
    {
        value: 2,
        label: '2',
        tooltip: 'This is a small task',
    },
    {
        value: 3,
        label: '3',
        tooltip:
            'This is a medium task, typically only covering the UI or the API',
    },
    {
        value: 5,
        label: '5',
        tooltip:
            'This is a large task, typically covering both the UI and the API',
    },
    {
        value: 8,
        label: '8',
        tooltip:
            'This is a very large task, typically this would need to be broken down',
    },
    {
        value: 13,
        label: '13',
        tooltip:
            'This is a very large task, typically this would need to be broken down',
    },
    {
        value: 21,
        label: '21',
        tooltip: "I don't know how to estimate this task",
    },
];
