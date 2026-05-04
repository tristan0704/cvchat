import "server-only";

export type ApiErrorCode =
    | "UNAUTHORIZED"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "CONFLICT"
    | "AI_PROVIDER_ERROR"
    | "INTERNAL_ERROR";

export type ApiErrorPayload = {
    error: {
        code: ApiErrorCode;
        message: string;
        retryable: boolean;
    };
    errorMessage: string;
};

const retryableErrorCodes = new Set<ApiErrorCode>([
    "AI_PROVIDER_ERROR",
    "INTERNAL_ERROR",
]);

export function createApiError(
    code: ApiErrorCode,
    message: string,
    retryable = retryableErrorCodes.has(code)
): ApiErrorPayload {
    return {
        error: {
            code,
            message,
            retryable,
        },
        errorMessage: message,
    };
}

export function readErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}
