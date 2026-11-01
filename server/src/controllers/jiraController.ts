import type { Request, Response } from 'express';

import * as jiraService from '../services/jiraService.js';

export const getIssue = async (req: Request, res: Response) => {
    res.json(await jiraService.getIssue(req.params.ticketId));
};

export const setStoryPoints = async (req: Request, res: Response) => {
    const { storyPoints } = req.body;
    res.json(
        await jiraService.setStoryPoints(req.params.ticketId, storyPoints)
    );
};

export const getIssuesNeedingEstimates = async (
    _req: Request,
    res: Response
) => {
    res.json(await jiraService.getIssuesNeedingEstimates());
};
