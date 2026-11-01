export const capacityPaths = {
    home: '/capacity',
    team: '/capacity/:teamId',
    sprint: '/capacity/:teamId/sprints/:sprintId',
};

export const capacityTeamPath = (teamId: number | string) =>
    `/capacity/${teamId}`;
export const sprintPath = (
    teamId: number | string,
    sprintId: number | string
) => `/capacity/${teamId}/sprints/${sprintId}`;
