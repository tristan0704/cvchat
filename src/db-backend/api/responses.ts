import "server-only";

import { createApiError, type ApiErrorCode } from "@/db-backend/api/errors";

function errorResponse(
    code: ApiErrorCode,
    message: string,
    status: number,
    retryable?: boolean
) {
    return Response.json(createApiError(code, message, retryable), { status });
}

export function ok<T>(payload: T) {
    return Response.json(payload);
}

export function badRequest(message: string) {
    return errorResponse("VALIDATION_ERROR", message, 400, false);
}

export function unauthorized(message = "Nicht autorisiert") {
    return errorResponse("UNAUTHORIZED", message, 401, false);
}

export function notFound(message = "Nicht gefunden") {
    return errorResponse("NOT_FOUND", message, 404, false);
}

export function conflict(message: string) {
    return errorResponse("CONFLICT", message, 409, false);
}

export function aiProviderError(message: string) {
    return errorResponse("AI_PROVIDER_ERROR", message, 502, true);
}

export function serverError(message = "Interner Serverfehler") {
    return errorResponse("INTERNAL_ERROR", message, 500, true);
}
