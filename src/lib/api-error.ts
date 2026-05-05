export type ApiErrorLike = {
    error?: unknown;
    errorMessage?: unknown;
};

function translateKnownApiErrorMessage(message: string) {
    switch (message) {
        case "Unauthorized":
            return "Nicht autorisiert";
        case "Not found":
            return "Nicht gefunden";
        case "Interview not found":
            return "Interview wurde nicht gefunden.";
        case "Coding challenge not found":
            return "Coding-Challenge wurde nicht gefunden.";
        case "Interview id is required":
            return "Interview-ID ist erforderlich.";
        case "Role is required":
            return "Rolle ist erforderlich.";
        case "Missing audio file":
            return "Audiodatei fehlt.";
        case "Code submission is required":
            return "Code-Einreichung ist erforderlich.";
        case "Interview feedback must be completed first":
            return "Interview-Feedback muss zuerst abgeschlossen werden.";
        case "Transcript export is required":
            return "Transkript-Export ist erforderlich.";
        case "Transcript fingerprint is required":
            return "Transkript-Fingerprint ist erforderlich.";
        default:
            return message;
    }
}

export function readApiErrorMessage(
    payload: ApiErrorLike | null | undefined,
    fallback: string
) {
    if (typeof payload?.errorMessage === "string" && payload.errorMessage.trim()) {
        return translateKnownApiErrorMessage(payload.errorMessage);
    }

    if (typeof payload?.error === "string" && payload.error.trim()) {
        return translateKnownApiErrorMessage(payload.error);
    }

    if (
        payload?.error &&
        typeof payload.error === "object" &&
        "message" in payload.error &&
        typeof payload.error.message === "string"
    ) {
        return translateKnownApiErrorMessage(payload.error.message);
    }

    return fallback;
}
