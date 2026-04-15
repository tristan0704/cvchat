/**
 * Voice interview transcript endpoint.
 *
 * After the live call ends, the client uploads the recorded candidate audio to
 * this route. Gemini transcribes that single recording into the post-call
 * transcript shown in the UI and persisted for the feedback handoff.
 */

import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { saveInterviewTranscript } from "@/db-backend/interviews/interview-service";
import { buildInterviewTranscriptFingerprint } from "@/lib/interview-feedback/fingerprint";
import type { Speaker, TranscriptEntry } from "@/lib/interview-transcript/types";
import {
    parseInterviewerQuestions,
    transcribeCandidateAudio,
    TranscriptServiceError,
} from "@/lib/interview-transcript/server/transcribe-candidate-audio";
import { buildTranscriptQaExport } from "@/lib/interview-transcript";

export const runtime = "nodejs";

function parseTranscriptEntries(value: FormDataEntryValue | null): TranscriptEntry[] {
    if (typeof value !== "string" || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value) as Array<{
            id?: unknown;
            speaker?: unknown;
            text?: unknown;
        }>;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((entry, index) => {
                const speaker: Speaker =
                    entry.speaker === "candidate" ||
                    entry.speaker === "interviewer" ||
                    entry.speaker === "system"
                        ? entry.speaker
                        : "candidate";

                return {
                id:
                    typeof entry.id === "string"
                        ? entry.id
                        : `entry-${index + 1}`,
                speaker,
                text: typeof entry.text === "string" ? entry.text : "",
            }})
            .filter((entry) => entry.text.trim().length > 0);
    } catch {
        return [];
    }
}

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
    }

    const formData = await req.formData().catch(() => null);
    const audio = formData?.get("audio");
    const role =
        typeof formData?.get("role") === "string"
            ? String(formData.get("role")).trim()
            : "Backend Developer";
    const interviewId =
        typeof formData?.get("interviewId") === "string"
            ? String(formData.get("interviewId")).trim()
            : "";
    const transcriptEntries = parseTranscriptEntries(
        formData?.get("transcriptEntries") ?? null
    );
    const interviewerQuestions = parseInterviewerQuestions(
        formData?.get("interviewerQuestions") ?? null
    );

    if (!(audio instanceof File) || audio.size === 0) {
        return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    try {
        const result = await transcribeCandidateAudio({
            apiKey,
            audio,
            role,
            interviewerQuestions,
        });

        if (interviewId) {
            const currentUser = await getCurrentAppUser();

            if (currentUser) {
                const transcriptExport = buildTranscriptQaExport(
                    role,
                    transcriptEntries,
                    {
                        qaPairs: result.qaPairs,
                        candidateTranscript: result.transcriptText,
                    }
                );

                await saveInterviewTranscript({
                    userId: currentUser.id,
                    interviewId,
                    role,
                    transcriptStatus: "ready",
                    candidateTranscript: result.transcriptText,
                    transcriptFingerprint:
                        buildInterviewTranscriptFingerprint(transcriptExport),
                    interviewerQuestions,
                    entries: transcriptEntries,
                    qaPairs: result.qaPairs,
                });
            }
        }

        return Response.json(result);
    } catch (error) {
        if (error instanceof TranscriptServiceError) {
            if (interviewId) {
                const currentUser = await getCurrentAppUser();

                if (currentUser) {
                    await saveInterviewTranscript({
                        userId: currentUser.id,
                        interviewId,
                        role,
                        transcriptStatus: "error",
                        transcriptError: error.message,
                        interviewerQuestions,
                        entries: transcriptEntries,
                    }).catch(() => undefined);
                }
            }

            return Response.json(
                { error: error.message, stage: error.stage },
                { status: error.status }
            );
        }

        const message =
            error instanceof Error ? error.message : "Gemini transcription failed";
        return Response.json({ error: message, stage: "fatal" }, { status: 502 });
    }
}
