export type ApiErrorLike = {
    error?: unknown;
    errorMessage?: unknown;
};

export function readApiErrorMessage(
    payload: ApiErrorLike | null | undefined,
    fallback: string
) {
    if (typeof payload?.errorMessage === "string" && payload.errorMessage.trim()) {
        return payload.errorMessage;
    }

    if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
    }

    if (
        payload?.error &&
        typeof payload.error === "object" &&
        "message" in payload.error &&
        typeof payload.error.message === "string"
    ) {
        return payload.error.message;
    }

    return fallback;
}
