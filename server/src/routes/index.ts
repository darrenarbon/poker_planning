import { Router } from 'express';
import userRouter from './user';
import roomRouter from './room';
import jiraTicketRouter from './jira-ticket';
import ticketRouter from './tickets';
import authRouter from './auth';

const router = Router();

router.use('/auth', authRouter); // Auth should come first for login/signup
router.use('/users', userRouter);
router.use('/rooms', roomRouter);
router.use('/tickets', ticketRouter);
router.use('/jira-tickets', jiraTicketRouter);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Poker Planning API',
    });
});

// API documentation endpoint
router.get('/', (req, res) => {
    res.status(200).json({
        message: 'Poker Planning API',
        version: '1.0.0',
        endpoints: {
            auth: '/auth',
            users: '/users',
            rooms: '/rooms',
            tickets: '/tickets',
            jiraTickets: '/jira-tickets',
            health: '/health',
        },
        documentation: 'Visit /health for service status',
    });
});

// 404 handler for unmatched routes
router.get('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
});

router.post('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    });
});

export default router;
