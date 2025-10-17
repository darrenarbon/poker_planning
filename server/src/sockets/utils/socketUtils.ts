import { Socket } from 'socket.io';
import type { EmitError } from '../types/socketTypes';

/**
 * Utility function to emit error messages to clients
 * Logs error details and sends user-friendly message
 */
export const emitError: EmitError = (socket, error, message) => {
    console.error(error);
    console.error(message);
    socket.emit('error', message);
};

/**
 * Validates that required payload fields are present
 */
export const validatePayload = (
    payload: any,
    requiredFields: string[]
): string | null => {
    // Handle null or undefined payload
    if (!payload) {
        if (requiredFields.length > 0) {
            return `Missing required field: ${requiredFields[0]}`;
        }
        return null;
    }

    for (const field of requiredFields) {
        if (!payload[field]) {
            return `Missing required field: ${field}`;
        }
    }
    return null;
};

/**
 * Logs socket events for debugging
 */
export const logSocketEvent = (eventName: string, ...args: any[]): void => {
    console.log(`[Socket Event] ${eventName}:`, ...args);
};

/**
 * Creates a standardized success response
 */
export const createSuccessResponse = (data: any) => ({
    success: true,
    data,
});

/**
 * Creates a standardized error response
 */
export const createErrorResponse = (message: string, error?: any) => ({
    success: false,
    message,
    error,
});
