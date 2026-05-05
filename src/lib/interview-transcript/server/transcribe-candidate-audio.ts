import "server-only";

import { createPartFromUri, GoogleGenAI } from "@google/genai";

import {
  mapPostCallTranscriptToQaPairs,
  normalizeTranscriptText,
  type TranscriptQaPair,
} from "@/lib/interview-transcript";
import { normalizeLanguage } from "@/lib/i18n/dictionaries";

const GEMINI_API_VERSION = "v1alpha";
const PRIMARY_TRANSCRIPTION_MODEL =
  process.env.GEMINI_TRANSCRIPTION_MODEL || "models/gemini-2.5-flash";
const TRANSCRIPTION_MODEL_FALLBACKS = [
  process.env.GEMINI_TRANSCRIPTION_MODEL_FALLBACK || "models/gemini-2.0-flash",
];
const MAX_TRANSCRIPTION_ATTEMPTS_PER_MODEL = 2;
const TRANSIENT_TRANSCRIPTION_ERROR_MARKERS = [
  "503",
  "unavailable",
  "high demand",
  "try again later",
  "overloaded",
  "deadline exceeded",
  "timeout",
  "internal",
];

function normalizeModelName(model: string) {
  const normalized = model.trim();
  if (!normalized) return "models/gemini-2.5-flash";
  if (
    normalized.startsWith("models/") ||
    normalized.startsWith("publishers/") ||
    normalized.startsWith("projects/")
  ) {
    return normalized;
  }

  return `models/${normalized}`;
}

function isModelLoadError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("model") &&
    (normalizedMessage.includes("not found") ||
      normalizedMessage.includes("not loaded") ||
      normalizedMessage.includes("not supported") ||
      normalizedMessage.includes("unavailable") ||
      normalizedMessage.includes("failed_precondition"))
  );
}

function isTransientTranscriptError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return TRANSIENT_TRANSCRIPTION_ERROR_MARKERS.some((marker) =>
    normalizedMessage.includes(marker)
  );
}

async function waitForRetry(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function logTranscriptRouteError(stage: string, details: Record<string, unknown>) {
  console.error("[interview/transcript]", {
    stage,
    ...details,
  });
}

export class TranscriptServiceError extends Error {
  stage: string;
  status: number;

  constructor(message: string, stage: string, status: number) {
    super(message);
    this.name = "TranscriptServiceError";
    this.stage = stage;
    this.status = status;
  }
}

export function parseInterviewerQuestions(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || !rawValue.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((question) => normalizeTranscriptText(question))
      .filter((question) => !!question);
  } catch {
    return [];
  }
}

type TranscribeCandidateAudioArgs = {
  apiKey: string;
  audio: File;
  role: string;
  interviewerQuestions: string[];
  language?: string;
};

type TranscribeCandidateAudioResult = {
  transcriptText: string;
  qaPairs: TranscriptQaPair[];
  qaMappingModel: string;
  qaMappingError: string;
  model: string;
};

export async function transcribeCandidateAudio({
  apiKey,
  audio,
  role,
  interviewerQuestions,
  language = "de",
}: TranscribeCandidateAudioArgs): Promise<TranscribeCandidateAudioResult> {
  const outputLanguage = normalizeLanguage(language);
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: GEMINI_API_VERSION,
    },
  });
  const uploadedFile = await ai.files
    .upload({
      file: audio,
      config: {
        mimeType: audio.type || "audio/webm",
      },
    })
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Gemini file upload failed";

      logTranscriptRouteError("upload", {
        role,
        audioType: audio.type || "audio/webm",
        audioSize: audio.size,
        message,
      });
      throw new TranscriptServiceError(message, "upload", 502);
    });

  try {
    if (!uploadedFile.uri || !uploadedFile.mimeType) {
      logTranscriptRouteError("upload_metadata", {
        role,
        uploadedFile,
      });
      throw new TranscriptServiceError(
        "Gemini file upload returned no usable file metadata",
        "upload_metadata",
        502
      );
    }

    const modelsToTry = Array.from(
      new Set(
        [PRIMARY_TRANSCRIPTION_MODEL, ...TRANSCRIPTION_MODEL_FALLBACKS].map(
          normalizeModelName
        )
      )
    );
    let lastError = "Gemini transcription failed";

    for (const model of modelsToTry) {
      for (
        let attempt = 1;
        attempt <= MAX_TRANSCRIPTION_ATTEMPTS_PER_MODEL;
        attempt += 1
      ) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: [
                      outputLanguage === "en"
                        ? "Transcribe only the candidate's speech from a technical interview in English."
                        : "Du transkribierst nur die Sprache des Kandidaten aus einem technischen Interview auf Deutsch.",
                      `Die Zielrolle ist: ${role || "Backend Developer"}.`,
                      outputLanguage === "en"
                        ? "Return only the cleaned transcript as continuous English text with normal punctuation."
                        : "Liefere nur das bereinigte Transcript als fortlaufenden deutschen Text mit normaler Satzzeichensetzung.",
                      outputLanguage === "en"
                        ? "No speaker labels. No analysis. No summary. No Markdown."
                        : "Keine Sprecherlabels. Keine Analyse. Keine Zusammenfassung. Kein Markdown.",
                      outputLanguage === "en"
                        ? "If individual words are unclear, reconstruct conservatively and do not invent technical details."
                        : "Wenn einzelne Woerter unklar sind, rekonstruiere konservativ und erfinde keine fachlichen Details hinzu.",
                    ].join("\n"),
                  },
                  createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
                ],
              },
            ],
          });

          const transcriptText = response.text?.trim();
          if (!transcriptText) {
            lastError = `Gemini returned no transcript text for model ${model}`;
            logTranscriptRouteError("transcribe_empty", {
              role,
              model,
              attempt,
              interviewerQuestionCount: interviewerQuestions.length,
            });
            continue;
          }

          let qaPairs: TranscriptQaPair[] = [];
          let qaMappingModel = "";
          let qaMappingError = "";

          if (interviewerQuestions.length) {
            try {
              const qaMappingResult = await mapPostCallTranscriptToQaPairs({
                ai,
                role,
                interviewerQuestions,
                candidateTranscript: transcriptText,
                language: outputLanguage,
              });
              qaPairs = qaMappingResult.qaPairs;
              qaMappingModel = qaMappingResult.model;
            } catch (error) {
              qaMappingError =
                error instanceof Error
                  ? error.message
                  : "Gemini QA mapping failed";

              logTranscriptRouteError("qa_mapping", {
                role,
                model,
                attempt,
                interviewerQuestionCount: interviewerQuestions.length,
                message: qaMappingError,
              });
            }
          }

          return {
            transcriptText,
            qaPairs,
            qaMappingModel,
            qaMappingError,
            model,
          };
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : `Gemini transcription failed for model ${model}`;
          const isTransientError = isTransientTranscriptError(lastError);

          logTranscriptRouteError("transcribe", {
            role,
            model,
            attempt,
            errorType: isModelLoadError(lastError)
              ? "model_load"
              : isTransientError
                ? "provider_transient"
                : "provider_runtime",
            interviewerQuestionCount: interviewerQuestions.length,
            audioType: audio.type || "audio/webm",
            audioSize: audio.size,
            message: lastError,
          });

          // Bei kurzen Lastspitzen lohnt sich ein zweiter Versuch,
          // bevor wir auf das nächste Modell wechseln.
          if (
            attempt < MAX_TRANSCRIPTION_ATTEMPTS_PER_MODEL &&
            isTransientError
          ) {
            await waitForRetry(600 * attempt);
            continue;
          }

          // Nicht-transiente Fehler oder ausgeschöpfte Retries wechseln
          // kontrolliert zum nächsten Modell in der Fallback-Liste.
          break;
        }
      }
    }

    throw new TranscriptServiceError(lastError, "transcribe", 502);
  } catch (error) {
    if (error instanceof TranscriptServiceError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Gemini transcription failed";

    logTranscriptRouteError("fatal", {
      role,
      interviewerQuestionCount: interviewerQuestions.length,
      audioType: audio.type || "audio/webm",
      audioSize: audio.size,
      message,
    });
    throw new TranscriptServiceError(message, "fatal", 502);
  } finally {
    if (uploadedFile.name) {
      await ai.files.delete({ name: uploadedFile.name }).catch(() => undefined);
    }
  }
}
