import type { Request, Response } from 'express';

import * as teamService from '../services/teamService.js';
import { AppError } from '../utils/errors.js';

const sub = (req: Request) => req.auth!.payload.sub!;

/** Reads a whole-number id from the URL, or throws a 400. */
const idParam = (req: Request, name: string): number => {
    const value = Number(req.params[name]);
    if (!Number.isInteger(value) || value < 1) {
        throw new AppError(400, `${name} must be a whole number`);
    }
    return value;
};

export const getMyTeams = async (req: Request, res: Response) => {
    res.json(await teamService.getTeamsForUser(sub(req)));
};

export const createTeam = async (req: Request, res: Response) => {
    const team = await teamService.createTeam(sub(req), req.body?.name);
    res.status(201).json(team);
};

export const getTeam = async (req: Request, res: Response) => {
    res.json(
        await teamService.getTeamDetails(idParam(req, 'teamId'), sub(req))
    );
};

export const renameTeam = async (req: Request, res: Response) => {
    await teamService.renameTeam(
        idParam(req, 'teamId'),
        sub(req),
        req.body?.name
    );
    res.json({ message: 'Team renamed' });
};

export const deleteTeam = async (req: Request, res: Response) => {
    await teamService.deleteTeam(idParam(req, 'teamId'), sub(req));
    res.json({ message: 'Team deleted' });
};

export const addMember = async (req: Request, res: Response) => {
    const { email, role } = req.body ?? {};
    await teamService.addMemberByEmail(
        idParam(req, 'teamId'),
        sub(req),
        email,
        role
    );
    res.status(201).json({ message: 'Member added' });
};

export const changeMemberRole = async (req: Request, res: Response) => {
    await teamService.changeMemberRole(
        idParam(req, 'teamId'),
        sub(req),
        idParam(req, 'userId'),
        req.body?.role
    );
    res.json({ message: 'Role changed' });
};

export const removeMember = async (req: Request, res: Response) => {
    await teamService.removeMember(
        idParam(req, 'teamId'),
        sub(req),
        idParam(req, 'userId')
    );
    res.json({ message: 'Member removed' });
};

export const transferOwnership = async (req: Request, res: Response) => {
    const userId = Number(req.body?.userId);
    if (!Number.isInteger(userId) || userId < 1) {
        throw new AppError(400, 'userId must be a whole number');
    }
    await teamService.transferOwnership(
        idParam(req, 'teamId'),
        sub(req),
        userId
    );
    res.json({ message: 'Team handed over' });
};

export const getInvites = async (req: Request, res: Response) => {
    const invites = await teamService.getInvites(
        idParam(req, 'teamId'),
        sub(req)
    );
    res.json({ invites });
};

export const createInvite = async (req: Request, res: Response) => {
    const { role, expiresInDays } = req.body ?? {};
    const invite = await teamService.createInvite(
        idParam(req, 'teamId'),
        sub(req),
        role,
        expiresInDays
    );
    res.status(201).json(invite);
};

export const revokeInvite = async (req: Request, res: Response) => {
    await teamService.revokeInvite(
        idParam(req, 'teamId'),
        sub(req),
        idParam(req, 'inviteId')
    );
    res.json({ message: 'Invite revoked' });
};

export const previewInvite = async (req: Request, res: Response) => {
    res.json(await teamService.previewInvite(req.params.token, sub(req)));
};

export const acceptInvite = async (req: Request, res: Response) => {
    res.json(await teamService.acceptInvite(req.params.token, sub(req)));
};
