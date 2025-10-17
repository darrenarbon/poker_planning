import { Router, Response, Request } from 'express';
import { returnError } from './routeHelper';
import { checkJwt } from '../services/authService';
import { fetchJiraTicket } from '../services/jira-ticketService';

const jiraTicketRouter = Router();

jiraTicketRouter.get(
    '/:ticketId',
    checkJwt,
    async (req: Request, res: Response) => {
        try {
            const { ticketId } = req.params;

            if (!ticketId) {
                return returnError(res, 400, null, 'Ticket ID is required');
            }

            const result = await fetchJiraTicket(ticketId);

            if (!result.success) {
                return returnError(
                    res,
                    result.status || 500,
                    result.error,
                    result.message || 'Error fetching JIRA ticket'
                );
            }

            return res.json(result.data);
        } catch (error) {
            return returnError(
                res,
                500,
                error,
                'Internal server error',
                'Unhandled error in JIRA ticket route:'
            );
        }
    }
);

// Not currently implemented due to lack of an API token to test this.

// jiraTicketRouter.post('/:ticketId', async (req, res) => {
//     const { ticketId } = req.params;
//     const { storyPoints } = req.body;

//     const response = await fetch(
//         `https://${process.env.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/issue/${ticketId}?overrideScreenSecurity=true`,
//         {
//             method: 'PUT',
//             headers: {
//                 Authorization: `Basic ${Buffer.from(
//                     `${process.env.ATLASSIAN_EMAIL}:${process.env.ATLASSIAN_API_KEY}`
//                 ).toString('base64')}`,
//                 Accept: 'application/json',
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 fields: {
//                     customfield_10024: storyPoints,
//                 },
//             }),
//         }
//     );
//     const data = await response.text();
//     if (!response.ok) {
//         return returnError(
//             res,
//             response.status,
//             data,
//             'Error fetching JIRA ticket'
//         );
//     }
//     return res.json(data);
// });

// jiraTicketRouter.post('/alltickets', async (req, res) => {
//     const response = await fetch(
//         `https://${process.env.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/search?jql=labels=Needs-estimating`,
//         {
//             method: 'GET',
//             headers: {
//                 Authorization: `Basic ${Buffer.from(
//                     `${process.env.ATLASSIAN_EMAIL}:${process.env.ATLASSIAN_API_KEY}`
//                 ).toString('base64')}`,
//                 Accept: 'application/json',
//             },
//         }
//     );
//     const data = await response.json();
//     if (!response.ok) {
//         return returnError(
//             res,
//             response.status,
//             data,
//             'Error fetching JIRA ticket'
//         );
//     }
//     return res.json(data);
// });

export default jiraTicketRouter;
