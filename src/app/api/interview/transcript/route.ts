/**
 * Voice interview transcript endpoint.
 *
 * After the live call ends, the client uploads the recorded candidate audio to
 * this route. Gemini transcribes that single recording into the post-call
 * transcript shown in the UI and persisted for the feedback handoff.
 */

import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { saveInterviewTranscript } from "@/db-backend/interviews/interview-service";
import { buildInterviewTranscriptFingerprint } from "@/lib/interview-feedback-fetch/fingerprint";
import type {
    PostCallTranscriptStatus,
    Speaker,
    TranscriptEntry,
    TranscriptQaPair,
} from "@/lib/interview-transcript/types";
import {
    buildTranscriptQaPairs,
    buildTranscriptQaExport,
    extractInterviewerQuestions,
    normalizeTranscriptText,
} from "@/lib/interview-transcript";
import {
    parseInterviewerQuestions,
    transcribeCandidateAudio,
    TranscriptServiceError,
} from "@/lib/interview-transcript/server/transcribe-candidate-audio";

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

function parseTranscriptEntriesFromJson(value: unknown): TranscriptEntry[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry, index) => {
            const parsed = entry as {
                id?: unknown;
                speaker?: unknown;
                text?: unknown;
            };
            const speaker: Speaker =
                parsed.speaker === "candidate" ||
                parsed.speaker === "interviewer" ||
                parsed.speaker === "system"
                    ? parsed.speaker
                    : "candidate";

            return {
                id:
                    typeof parsed.id === "string"
                        ? parsed.id
                        : `entry-${index + 1}`,
                speaker,
                text: typeof parsed.text === "string" ? parsed.text : "",
            };
        })
        .filter((entry) => entry.text.trim().length > 0);
}

function parseTranscriptQaPairs(value: unknown): TranscriptQaPair[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((pair) => {
            const parsed = pair as {
                question?: unknown;
                answer?: unknown;
            };

            return {
                question:
                    typeof parsed.question === "string" ? parsed.question.trim() : "",
                answer:
                    typeof parsed.answer === "string" ? parsed.answer.trim() : "",
            };
        })
        .filter((pair) => pair.question.length > 0 && pair.answer.length > 0);
}

function parseTranscriptStatus(value: unknown): PostCallTranscriptStatus {
    return value === "recording" ||
        value === "transcribing" ||
        value === "ready" ||
        value === "error"
        ? value
        : "idle";
}

function buildFallbackTranscriptResult(entries: TranscriptEntry[]) {
    const candidateTurns = entries
        .filter((entry) => entry.speaker === "candidate")
        .map((entry) => normalizeTranscriptText(entry.text))
        .filter((entry) => !!entry);
    const transcriptText = candidateTurns.join(" ").trim();

    return {
        transcriptText,
        qaPairs: buildTranscriptQaPairs(entries),
    };
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
            const fallbackResult = buildFallbackTranscriptResult(transcriptEntries);

            if (fallbackResult.transcriptText) {
                if (interviewId) {
                    const currentUser = await getCurrentAppUser();

                    if (currentUser) {
                        const transcriptExport = buildTranscriptQaExport(
                            role,
                            transcriptEntries,
                            {
                                qaPairs: fallbackResult.qaPairs,
                                candidateTranscript:
                                    fallbackResult.transcriptText,
                            }
                        );

                        await saveInterviewTranscript({
                            userId: currentUser.id,
                            interviewId,
                            role,
                            transcriptStatus: "ready",
                            candidateTranscript:
                                fallbackResult.transcriptText,
                            transcriptFingerprint:
                                buildInterviewTranscriptFingerprint(
                                    transcriptExport
                                ),
                            interviewerQuestions,
                            entries: transcriptEntries,
                            qaPairs: fallbackResult.qaPairs,
                        }).catch(() => undefined);
                    }
                }

                console.error("[api/interview/transcript][fallback]", {
                    stage: error.stage,
                    message: error.message,
                    interviewId,
                    transcriptEntryCount: transcriptEntries.length,
                });

                return Response.json({
                    ...fallbackResult,
                    model: "live-transcript-fallback",
                    qaMappingModel: "live-transcript-fallback",
                    qaMappingError: error.message,
                });
            }

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

export async function PATCH(request: Request) {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as
            | {
                  interviewId?: unknown;
                  role?: unknown;
                  transcriptEntries?: unknown;
                  postCallCandidateTranscript?: unknown;
                  mappedTranscriptQaPairs?: unknown;
                  postCallTranscriptStatus?: unknown;
                  postCallTranscriptError?: unknown;
              }
            | null;

        const interviewId =
            typeof body?.interviewId === "string" ? body.interviewId.trim() : "";
        const role = typeof body?.role === "string" ? body.role.trim() : "";

        if (!interviewId) {
            return Response.json(
                { error: "Interview id is required" },
                { status: 400 }
            );
        }

        if (!role) {
            return Response.json({ error: "Role is required" }, { status: 400 });
        }

        const transcriptEntries = parseTranscriptEntriesFromJson(
            body?.transcriptEntries
        );
        const qaPairs = parseTranscriptQaPairs(body?.mappedTranscriptQaPairs);
        const postCallCandidateTranscript =
            typeof body?.postCallCandidateTranscript === "string"
                ? body.postCallCandidateTranscript.trim()
                : "";
        const transcriptStatus = parseTranscriptStatus(
            body?.postCallTranscriptStatus
        );
        const transcriptError =
            typeof body?.postCallTranscriptError === "string"
                ? body.postCallTranscriptError.trim()
                : "";
        const transcriptExport =
            transcriptStatus === "ready"
                ? buildTranscriptQaExport(role, transcriptEntries, {
                      qaPairs,
                      candidateTranscript: postCallCandidateTranscript,
                  })
                : "";
        const transcriptFingerprint = transcriptExport
            ? buildInterviewTranscriptFingerprint(transcriptExport)
            : "";

        await saveInterviewTranscript({
            userId: currentUser.id,
            interviewId,
            role,
            transcriptStatus,
            transcriptError,
            candidateTranscript: postCallCandidateTranscript,
            transcriptFingerprint,
            interviewerQuestions: extractInterviewerQuestions(transcriptEntries),
            entries: transcriptEntries,
            qaPairs,
        });

        return Response.json({ ok: true });
    } catch (error) {
        console.error("[api/interview/transcript][patch]", error);

        return Response.json(
            { error: "Unable to persist interview transcript draft" },
            { status: 500 }
        );
    }
}
