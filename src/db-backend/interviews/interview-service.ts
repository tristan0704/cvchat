import "server-only";

import type {
    FaceAnalysisOverallStatus,
    InterviewQaPairSource,
    InterviewRecapStatus,
    InterviewStatus,
    InterviewTranscriptStatus,
    TranscriptSpeaker,
} from "@prisma/client";

import { db } from "@/db-backend/prisma/client";
import { acquireTransactionalAdvisoryLock } from "@/db-backend/prisma/advisory-lock";
import { getLatestCodingChallengeAttempt } from "@/db-backend/coding-challenge/coding-challenge-service";
import { createOrRefreshInterviewOverallFeedback } from "@/db-backend/interviews/overall-feedback-service";
import { getInterviewTemplateById } from "@/db-backend/interviews/interview-template-service";
import type { InterviewOverallFeedback } from "@/lib/interview-overall-feedback-types/types";
import { buildTranscriptQaExport } from "@/lib/interview-transcript";
import type { TranscriptEntry, TranscriptQaPair } from "@/lib/interview-transcript/types";
import type { CvFeedbackResult } from "@/lib/cv/types";
import type { FaceAnalysisReport } from "@/lib/face-analysis";
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback-fetch/types";
import type { InterviewTimingMetrics } from "@/lib/voice-interview/core/types";

// Dateiübersicht:
// Diese Service-Datei bündelt Interview-Reads und -Writes. Für Performance ist
// wichtig, dass Initialdaten, Polling-Status und schwere Detaildaten getrennt
// bleiben. Neue UI-Features sollen deshalb eigene Domain-Reader bekommen und
// nicht automatisch in Shell- oder Status-Queries wandern.

export type InterviewListItem = {
    id: string;
    title: string;
    role: string;
    status: InterviewStatus;
    currentStep: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
};

export type InterviewDetail = {
    id: string;
    title: string;
    role: string;
    experience: string;
    companySize: string;
    currentStep: number;
    status: InterviewStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cv: {
        id: string;
        fileName: string;
        fileSizeBytes: number | null;
        uploadedAt: string;
    } | null;
    plannedQuestions: Array<{
        id: string;
        sequence: number;
        questionKey: string | null;
        text: string;
        priority: number | null;
    }>;
    cvFeedbackAnalysisId: string | null;
    cvFeedback: CvFeedbackResult | null;
    transcript: {
        transcriptStatus: InterviewTranscriptStatus;
        transcriptError: string;
        candidateTranscript: string;
        transcriptExport: string;
        transcriptFingerprint: string;
        interviewerQuestions: string[];
        recapStatus: InterviewRecapStatus;
        recapError: string;
        recapCaptureNote: string;
        entries: Array<{
            id: string;
            sequence: number;
            speaker: TranscriptSpeaker;
            text: string;
        }>;
        qaPairs: Array<{
            id: string;
            sequence: number;
            question: string;
            answer: string;
            source: InterviewQaPairSource;
        }>;
    } | null;
    timingMetrics: InterviewTimingMetrics | null;
    feedback: InterviewFeedbackEvaluation | null;
    overallFeedback: InterviewOverallFeedback | null;
    faceAnalysis: FaceAnalysisReport | null;
    codingChallenge: Awaited<ReturnType<typeof getLatestCodingChallengeAttempt>>;
};

export type InterviewDetailLight = {
    id: string;
    title: string;
    role: string;
    experience: string;
    companySize: string;
    currentStep: number;
    status: InterviewStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cv: {
        id: string;
        fileName: string;
        fileSizeBytes: number | null;
        uploadedAt: string;
    } | null;
    plannedQuestions: Array<{
        id: string;
        sequence: number;
        questionKey: string | null;
        text: string;
        priority: number | null;
    }>;
    cvFeedbackAnalysisId: string | null;
    cvFeedback: CvFeedbackResult | null;
    transcript: {
        transcriptStatus: InterviewTranscriptStatus;
        transcriptError: string;
    } | null;
    feedback: InterviewFeedbackEvaluation | null;
    overallFeedback: InterviewOverallFeedback | null;
    codingChallenge: {
        evaluation: {
            overallScore: number;
            summary: string;
        } | null;
    } | null;
};

export type InterviewShell = Omit<
    InterviewDetailLight,
    "cvFeedbackAnalysisId" | "cvFeedback" | "feedback" | "overallFeedback"
> & {
    cvFeedback: {
        quality: {
            overallScore: number;
        };
        roleAnalysis: {
            summary: string;
        };
    } | null;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
};

export type InterviewTranscriptDetail = {
    transcript: InterviewDetail["transcript"];
    timingMetrics: InterviewTimingMetrics | null;
};

export type InterviewFeedbackDetail = {
    feedback: InterviewFeedbackEvaluation | null;
    faceAnalysis: FaceAnalysisReport | null;
};

export type InterviewOverallFeedbackDetail = {
    overallFeedback: InterviewOverallFeedback | null;
    cvFeedback: InterviewShell["cvFeedback"];
    interviewFeedback: Pick<InterviewFeedbackEvaluation, "overallScore" | "summary"> | null;
    codingChallenge: InterviewShell["codingChallenge"];
};

export type InterviewStatusSnapshot = {
    id: string;
    currentStep: number;
    status: InterviewStatus;
    startedAt: string | null;
    completedAt: string | null;
    transcriptStatus: InterviewTranscriptStatus | null;
    transcriptError: string;
    hasCvFeedback: boolean;
    hasInterviewFeedback: boolean;
    hasOverallFeedback: boolean;
    hasCodingEvaluation: boolean;
};

function buildInterviewTitle(config: {
    role: string;
    experience: string;
    companySize: string;
}) {
    const role = config.role.trim() || "Backend Developer";
    return `${role} Interview`;
}

function resolveStatusForStep(step: number): InterviewStatus {
    if (step >= 6) {
        return "completed";
    }

    if (step >= 2) {
        return "in_progress";
    }

    return "ready";
}

function resolveMaxAccessibleStep(args: {
    hasCvFeedback: boolean;
    transcriptStatus: InterviewTranscriptStatus | null;
    hasInterviewFeedback: boolean;
    hasCodingEvaluation: boolean;
}) {
    if (args.hasCodingEvaluation) {
        return 6;
    }

    if (args.hasInterviewFeedback) {
        return 4;
    }

    if (
        args.transcriptStatus &&
        args.transcriptStatus !== "idle"
    ) {
        return 3;
    }

    if (args.hasCvFeedback) {
        return 2;
    }

    return 1;
}

function mapInterviewListItem(item: {
    id: string;
    title: string | null;
    role: string;
    status: InterviewStatus;
    currentStep: number;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}) {
    return {
        id: item.id,
        title: item.title ?? buildInterviewTitle({
            role: item.role,
            experience: "",
            companySize: "",
        }),
        role: item.role,
        status: item.status,
        currentStep: item.currentStep,
        createdAt: item.createdAt.toISOString(),
        startedAt: item.startedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
    } satisfies InterviewListItem;
}

function mapInterviewFeedback(feedback: {
    analyzedAt: Date;
    role: string;
    transcriptFingerprint: string;
    overallScore: number;
    passedLikely: boolean;
    summary: string;
    communicationScore: number;
    communicationFeedback: string;
    answerQualityScore: number;
    answerQualityFeedback: string;
    roleFitScore: number;
    roleFitFeedback: string;
    strengths: string[];
    issues: string[];
    improvements: string[];
} | null): InterviewFeedbackEvaluation | null {
    if (!feedback) {
        return null;
    }

    return {
        analyzedAt: feedback.analyzedAt.toISOString(),
        role: feedback.role,
        transcriptFingerprint: feedback.transcriptFingerprint,
        overallScore: feedback.overallScore,
        passedLikely: feedback.passedLikely,
        summary: feedback.summary,
        communication: {
            score: feedback.communicationScore,
            feedback: feedback.communicationFeedback,
        },
        answerQuality: {
            score: feedback.answerQualityScore,
            feedback: feedback.answerQualityFeedback,
        },
        roleFit: {
            score: feedback.roleFitScore,
            feedback: feedback.roleFitFeedback,
        },
        strengths: feedback.strengths,
        issues: feedback.issues,
        improvements: feedback.improvements,
    };
}

function mapInterviewOverallFeedback(feedback: {
    analyzedAt: Date;
    overallScore: number;
    summary: string;
    strengths: string[];
    issues: string[];
    improvements: string[];
    cvScore: number | null;
    interviewScore: number | null;
    codingChallengeScore: number | null;
} | null): InterviewOverallFeedback | null {
    if (!feedback) {
        return null;
    }

    return {
        analyzedAt: feedback.analyzedAt.toISOString(),
        overallScore: feedback.overallScore,
        summary: feedback.summary,
        strengths: feedback.strengths,
        issues: feedback.issues,
        improvements: feedback.improvements,
        cvScore: feedback.cvScore,
        interviewScore: feedback.interviewScore,
        codingChallengeScore: feedback.codingChallengeScore,
    };
}

function mapFaceAnalysis(faceAnalysis: {
    analysisVersion: string;
    mode: string;
    role: string | null;
    startedAt: Date;
    endedAt: Date;
    durationMs: number;
    durationLabel: string;
    sampleCount: number;
    windowCount: number;
    overallScore: number;
    overallStatus: FaceAnalysisOverallStatus;
    faceDetectedPct: number;
    avgFrontalFacingScore: number;
    avgHeadMovement: number;
    avgEyeOpenness: number;
    avgMouthOpenness: number;
    avgSpeakingLikelihood: number;
    speakingActivityPct: number;
    blinkCount: number;
    blinkRatePerMin: number;
    stableWindowPct: number;
    headline: string;
    strengths: string[];
    risks: string[];
    nextSteps: string[];
    limitations: string[];
    parameters: unknown;
    alerts: unknown;
    windows: unknown;
} | null): FaceAnalysisReport | null {
    if (!faceAnalysis) {
        return null;
    }

    return {
        analysisVersion: faceAnalysis.analysisVersion,
        mode: faceAnalysis.mode as FaceAnalysisReport["mode"],
        role: faceAnalysis.role,
        startedAt: faceAnalysis.startedAt.toISOString(),
        endedAt: faceAnalysis.endedAt.toISOString(),
        durationMs: faceAnalysis.durationMs,
        durationLabel: faceAnalysis.durationLabel,
        sampleCount: faceAnalysis.sampleCount,
        windowCount: faceAnalysis.windowCount,
        overallScore: faceAnalysis.overallScore,
        overallStatus: faceAnalysis.overallStatus as FaceAnalysisReport["overallStatus"],
        globalMetrics: {
            faceDetectedPct: faceAnalysis.faceDetectedPct,
            avgFrontalFacingScore: faceAnalysis.avgFrontalFacingScore,
            avgHeadMovement: faceAnalysis.avgHeadMovement,
            avgEyeOpenness: faceAnalysis.avgEyeOpenness,
            avgMouthOpenness: faceAnalysis.avgMouthOpenness,
            avgSpeakingLikelihood: faceAnalysis.avgSpeakingLikelihood,
            speakingActivityPct: faceAnalysis.speakingActivityPct,
            blinkCount: faceAnalysis.blinkCount,
            blinkRatePerMin: faceAnalysis.blinkRatePerMin,
            stableWindowPct: faceAnalysis.stableWindowPct,
        },
        parameters: Array.isArray(faceAnalysis.parameters)
            ? (faceAnalysis.parameters as FaceAnalysisReport["parameters"])
            : [],
        alerts: Array.isArray(faceAnalysis.alerts)
            ? (faceAnalysis.alerts as FaceAnalysisReport["alerts"])
            : [],
        windows: Array.isArray(faceAnalysis.windows)
            ? (faceAnalysis.windows as FaceAnalysisReport["windows"])
            : [],
        summary: {
            headline: faceAnalysis.headline,
            strengths: faceAnalysis.strengths,
            risks: faceAnalysis.risks,
            nextSteps: faceAnalysis.nextSteps,
        },
        limitations: faceAnalysis.limitations,
    };
}

function mapTimingMetrics(metrics: {
    answerCount: number;
    totalCandidateSpeechMs: number;
    averageAnswerDurationMs: number;
    longestAnswerDurationMs: number;
    shortestAnswerDurationMs: number;
    averageResponseLatencyMs: number;
    longestResponseLatencyMs: number;
    candidateWordsPerMinute: number | null;
} | null): InterviewTimingMetrics | null {
    if (!metrics) {
        return null;
    }

    return {
        answerCount: metrics.answerCount,
        totalCandidateSpeechMs: metrics.totalCandidateSpeechMs,
        averageAnswerDurationMs: metrics.averageAnswerDurationMs,
        longestAnswerDurationMs: metrics.longestAnswerDurationMs,
        shortestAnswerDurationMs: metrics.shortestAnswerDurationMs,
        averageResponseLatencyMs: metrics.averageResponseLatencyMs,
        longestResponseLatencyMs: metrics.longestResponseLatencyMs,
        candidateWordsPerMinute: metrics.candidateWordsPerMinute,
    };
}

function mapCvFeedbackAnalysis(analysis: {
    analyzedAt: Date;
    fileName: string | null;
    role: string;
    experience: string;
    companySize: string;
    overallScore: number;
    keywordScore: number;
    llmScore: number;
    blendedScore: number;
    keywordWeight: number;
    llmWeight: number;
    sectionsScore: number;
    sectionsFeedback: string;
    impactScore: number;
    impactFeedback: string;
    lengthScore: number;
    lengthFeedback: string;
    contactScore: number;
    contactFeedback: string;
    clarityScore: number;
    clarityFeedback: string;
    improvements: string[];
    roleMatchScore: number;
    matchedKeywords: string[];
    missingMustHaveKeywords: string[];
    niceToHaveMatches: string[];
    bonusMatches: string[];
    roleSummary: string;
} | null): CvFeedbackResult | null {
    if (!analysis) {
        return null;
    }

    return {
        fileName: analysis.fileName ?? "Lebenslauf.pdf",
        analyzedAt: analysis.analyzedAt.toISOString(),
        config: {
            role: analysis.role,
            experience: analysis.experience,
            companySize: analysis.companySize,
        },
        quality: {
            overallScore: analysis.overallScore,
            sections: {
                score: analysis.sectionsScore,
                feedback: analysis.sectionsFeedback,
            },
            impact: {
                score: analysis.impactScore,
                feedback: analysis.impactFeedback,
            },
            length: {
                score: analysis.lengthScore,
                feedback: analysis.lengthFeedback,
            },
            contact: {
                score: analysis.contactScore,
                feedback: analysis.contactFeedback,
            },
            clarity: {
                score: analysis.clarityScore,
                feedback: analysis.clarityFeedback,
            },
            improvements: analysis.improvements,
        },
        roleAnalysis: {
            score: analysis.roleMatchScore,
            matched: analysis.matchedKeywords,
            missingMustHave: analysis.missingMustHaveKeywords,
            niceToHaveMatches: analysis.niceToHaveMatches,
            bonusMatches: analysis.bonusMatches,
            summary: analysis.roleSummary,
        },
        scoreBreakdown: {
            keywordScore: analysis.keywordScore,
            llmScore: analysis.llmScore,
            blendedScore: analysis.blendedScore,
            keywordWeight: analysis.keywordWeight,
            llmWeight: analysis.llmWeight,
        },
    };
}

export async function createInterviewForUser(args: {
    userId: string;
    templateId: string;
}) {
    const template = await getInterviewTemplateById(args.templateId);

    if (!template) {
        throw new Error("Interview template not found");
    }

    const activeCv = await db.cvVersion.findFirst({
        where: {
            userId: args.userId,
            isActive: true,
        },
        orderBy: {
            uploadedAt: "desc",
        },
        select: {
            id: true,
        },
    });

    const interview = await db.interview.create({
        data: {
            userId: args.userId,
            cvVersionId: activeCv?.id ?? null,
            title: template.title,
            role: template.role,
            experience: template.experience,
            companySize: template.companySize,
            currentStep: 1,
            status: "ready",
            plannedQuestions: {
                create: template.questions.map((question, index) => ({
                    sequence: index + 1,
                    questionKey: question.id,
                    text: question.text,
                    priority: question.priority,
                })),
            },
        },
        select: {
            id: true,
            title: true,
            role: true,
            status: true,
            currentStep: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
        },
    });

    return mapInterviewListItem(interview);
}

export async function listInterviewsForUser(userId: string) {
    const interviews = await db.interview.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            title: true,
            role: true,
            status: true,
            currentStep: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
        },
    });

    return interviews.map(mapInterviewListItem);
}

function mapInterviewCore(interview: {
    id: string;
    title: string | null;
    role: string;
    experience: string;
    companySize: string;
    currentStep: number;
    status: InterviewStatus;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}) {
    return {
        id: interview.id,
        title:
            interview.title ??
            buildInterviewTitle({
                role: interview.role,
                experience: interview.experience,
                companySize: interview.companySize,
            }),
        role: interview.role,
        experience: interview.experience,
        companySize: interview.companySize,
        currentStep: interview.currentStep,
        status: interview.status,
        createdAt: interview.createdAt.toISOString(),
        startedAt: interview.startedAt?.toISOString() ?? null,
        completedAt: interview.completedAt?.toISOString() ?? null,
    };
}

function mapCvFeedbackSummary(
    analysis: {
        overallScore: number;
        roleSummary: string;
    } | null
) {
    if (!analysis) {
        return null;
    }

    return {
        quality: {
            overallScore: analysis.overallScore,
        },
        roleAnalysis: {
            summary: analysis.roleSummary,
        },
    } satisfies InterviewShell["cvFeedback"];
}

export async function getInterviewDetailLightForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        include: {
            cvVersion: {
                select: {
                    id: true,
                    fileName: true,
                    fileSizeBytes: true,
                    uploadedAt: true,
                },
            },
            plannedQuestions: {
                orderBy: {
                    sequence: "asc",
                },
            },
            cvFeedbackAnalysis: true,
            // Der leichte Snapshot enthält nur Statusdaten für Navigation und Polling.
            transcript: {
                select: {
                    transcriptStatus: true,
                    transcriptError: true,
                },
            },
            feedback: true,
            overallFeedback: true,
            codingChallengeAttempts: {
                orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: {
                    evaluation: {
                        select: {
                            overallScore: true,
                            summary: true,
                        },
                    },
                },
            },
        },
    });

    if (!interview) {
        return null;
    }

    return {
        ...mapInterviewCore(interview),
        cv: interview.cvVersion
            ? {
                  id: interview.cvVersion.id,
                  fileName: interview.cvVersion.fileName ?? "Lebenslauf.pdf",
                  fileSizeBytes: interview.cvVersion.fileSizeBytes,
                  uploadedAt: interview.cvVersion.uploadedAt.toISOString(),
              }
            : null,
        plannedQuestions: interview.plannedQuestions.map((question) => ({
            id: question.id,
            sequence: question.sequence,
            questionKey: question.questionKey,
            text: question.text,
            priority: question.priority,
        })),
        cvFeedbackAnalysisId: interview.cvFeedbackAnalysisId,
        cvFeedback: mapCvFeedbackAnalysis(interview.cvFeedbackAnalysis),
        transcript: interview.transcript
            ? {
                  transcriptStatus: interview.transcript.transcriptStatus,
                  transcriptError: interview.transcript.transcriptError ?? "",
              }
            : null,
        feedback: mapInterviewFeedback(interview.feedback),
        overallFeedback: mapInterviewOverallFeedback(interview.overallFeedback),
        codingChallenge: interview.codingChallengeAttempts[0]
            ? {
                  evaluation: interview.codingChallengeAttempts[0].evaluation
                      ? {
                            overallScore:
                                interview.codingChallengeAttempts[0].evaluation
                                    .overallScore,
                            summary:
                                interview.codingChallengeAttempts[0].evaluation
                                    .summary,
                        }
                      : null,
              }
            : null,
    } satisfies InterviewDetailLight;
}

export async function getInterviewShellForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            id: true,
            title: true,
            role: true,
            experience: true,
            companySize: true,
            currentStep: true,
            status: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
            cvVersion: {
                select: {
                    id: true,
                    fileName: true,
                    fileSizeBytes: true,
                    uploadedAt: true,
                },
            },
            plannedQuestions: {
                orderBy: {
                    sequence: "asc",
                },
                select: {
                    id: true,
                    sequence: true,
                    questionKey: true,
                    text: true,
                    priority: true,
                },
            },
            cvFeedbackAnalysis: {
                select: {
                    overallScore: true,
                    roleSummary: true,
                },
            },
            // Shell-Polling darf nur Status- und Gating-Daten laden.
            transcript: {
                select: {
                    transcriptStatus: true,
                    transcriptError: true,
                },
            },
            feedback: {
                select: {
                    id: true,
                },
            },
            overallFeedback: {
                select: {
                    id: true,
                },
            },
            codingChallengeAttempts: {
                orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: {
                    evaluation: {
                        select: {
                            overallScore: true,
                            summary: true,
                        },
                    },
                },
            },
        },
    });

    if (!interview) {
        return null;
    }

    return {
        ...mapInterviewCore(interview),
        cv: interview.cvVersion
            ? {
                  id: interview.cvVersion.id,
                  fileName: interview.cvVersion.fileName ?? "Lebenslauf.pdf",
                  fileSizeBytes: interview.cvVersion.fileSizeBytes,
                  uploadedAt: interview.cvVersion.uploadedAt.toISOString(),
              }
            : null,
        plannedQuestions: interview.plannedQuestions.map((question) => ({
            id: question.id,
            sequence: question.sequence,
            questionKey: question.questionKey,
            text: question.text,
            priority: question.priority,
        })),
        cvFeedback: mapCvFeedbackSummary(interview.cvFeedbackAnalysis),
        hasCvFeedback: Boolean(interview.cvFeedbackAnalysis),
        transcript: interview.transcript
            ? {
                  transcriptStatus: interview.transcript.transcriptStatus,
                  transcriptError: interview.transcript.transcriptError ?? "",
              }
            : null,
        hasInterviewFeedback: Boolean(interview.feedback),
        hasOverallFeedback: Boolean(interview.overallFeedback),
        hasCodingEvaluation: Boolean(
            interview.codingChallengeAttempts[0]?.evaluation
        ),
        codingChallenge: interview.codingChallengeAttempts[0]
            ? {
                  evaluation: interview.codingChallengeAttempts[0].evaluation
                      ? {
                            overallScore:
                                interview.codingChallengeAttempts[0].evaluation
                                    .overallScore,
                            summary:
                                interview.codingChallengeAttempts[0].evaluation
                                    .summary,
                        }
                      : null,
              }
            : null,
    } satisfies InterviewShell;
}

export async function getInterviewStatusForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            id: true,
            currentStep: true,
            status: true,
            startedAt: true,
            completedAt: true,
            cvFeedbackAnalysisId: true,
            // Status-Polling darf keine schweren Relationen laden. Dieser
            // Endpunkt hält Step-Gating aktuell und bleibt absichtlich unter
            // einer kleinen Payload.
            transcript: {
                select: {
                    transcriptStatus: true,
                    transcriptError: true,
                },
            },
            feedback: {
                select: {
                    id: true,
                },
            },
            overallFeedback: {
                select: {
                    id: true,
                },
            },
            codingChallengeAttempts: {
                orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: {
                    evaluation: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
    });

    if (!interview) {
        return null;
    }

    return {
        id: interview.id,
        currentStep: interview.currentStep,
        status: interview.status,
        startedAt: interview.startedAt?.toISOString() ?? null,
        completedAt: interview.completedAt?.toISOString() ?? null,
        transcriptStatus: interview.transcript?.transcriptStatus ?? null,
        transcriptError: interview.transcript?.transcriptError ?? "",
        hasCvFeedback: Boolean(interview.cvFeedbackAnalysisId),
        hasInterviewFeedback: Boolean(interview.feedback),
        hasOverallFeedback: Boolean(interview.overallFeedback),
        hasCodingEvaluation: Boolean(
            interview.codingChallengeAttempts[0]?.evaluation
        ),
    } satisfies InterviewStatusSnapshot;
}

export async function getInterviewDetailForUser(userId: string, interviewId: string) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        include: {
            cvVersion: {
                select: {
                    id: true,
                    fileName: true,
                    fileSizeBytes: true,
                    uploadedAt: true,
                },
            },
            plannedQuestions: {
                orderBy: {
                    sequence: "asc",
                },
            },
            cvFeedbackAnalysis: true,
            transcript: {
                include: {
                    entries: {
                        orderBy: {
                            sequence: "asc",
                        },
                    },
                    qaPairs: {
                        orderBy: {
                            sequence: "asc",
                        },
                    },
                },
            },
            timingMetrics: true,
            feedback: true,
            overallFeedback: true,
            faceAnalysis: true,
        },
    });

    if (!interview) {
        return null;
    }

    return {
        ...mapInterviewCore(interview),
        cv: interview.cvVersion
            ? {
                  id: interview.cvVersion.id,
                  fileName: interview.cvVersion.fileName ?? "Lebenslauf.pdf",
                  fileSizeBytes: interview.cvVersion.fileSizeBytes,
                  uploadedAt: interview.cvVersion.uploadedAt.toISOString(),
              }
            : null,
        plannedQuestions: interview.plannedQuestions.map((question) => ({
            id: question.id,
            sequence: question.sequence,
            questionKey: question.questionKey,
            text: question.text,
            priority: question.priority,
        })),
        cvFeedbackAnalysisId: interview.cvFeedbackAnalysisId,
        cvFeedback: mapCvFeedbackAnalysis(interview.cvFeedbackAnalysis),
        transcript: interview.transcript
            ? {
                  transcriptStatus: interview.transcript.transcriptStatus,
                  transcriptError: interview.transcript.transcriptError ?? "",
                  candidateTranscript:
                      interview.transcript.candidateTranscript ?? "",
                  transcriptExport: interview.transcript.transcriptExport ?? "",
                  transcriptFingerprint:
                      interview.transcript.transcriptFingerprint ?? "",
                  interviewerQuestions: interview.transcript.interviewerQuestions,
                  recapStatus: interview.transcript.recapStatus,
                  recapError: interview.transcript.recapError ?? "",
                  recapCaptureNote:
                      interview.transcript.recapCaptureNote ?? "",
                  entries: interview.transcript.entries.map((entry) => ({
                      id: entry.id,
                      sequence: entry.sequence,
                      speaker: entry.speaker,
                      text: entry.text,
                  })),
                  qaPairs: interview.transcript.qaPairs.map((pair) => ({
                      id: pair.id,
                      sequence: pair.sequence,
                      question: pair.question,
                      answer: pair.answer,
                      source: pair.source,
                  })),
              }
            : null,
        timingMetrics: mapTimingMetrics(interview.timingMetrics),
        feedback: mapInterviewFeedback(interview.feedback),
        overallFeedback: mapInterviewOverallFeedback(interview.overallFeedback),
        faceAnalysis: mapFaceAnalysis(interview.faceAnalysis),
        codingChallenge: await getLatestCodingChallengeAttempt(userId, interview.id),
    } satisfies InterviewDetail;
}

export async function getInterviewTranscriptDetailForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            transcript: {
                include: {
                    entries: {
                        orderBy: {
                            sequence: "asc",
                        },
                    },
                    qaPairs: {
                        orderBy: {
                            sequence: "asc",
                        },
                    },
                },
            },
            timingMetrics: true,
        },
    });

    if (!interview) {
        return null;
    }

    return {
        transcript: interview.transcript
            ? {
                  transcriptStatus: interview.transcript.transcriptStatus,
                  transcriptError: interview.transcript.transcriptError ?? "",
                  candidateTranscript:
                      interview.transcript.candidateTranscript ?? "",
                  transcriptExport: interview.transcript.transcriptExport ?? "",
                  transcriptFingerprint:
                      interview.transcript.transcriptFingerprint ?? "",
                  interviewerQuestions: interview.transcript.interviewerQuestions,
                  recapStatus: interview.transcript.recapStatus,
                  recapError: interview.transcript.recapError ?? "",
                  recapCaptureNote:
                      interview.transcript.recapCaptureNote ?? "",
                  entries: interview.transcript.entries.map((entry) => ({
                      id: entry.id,
                      sequence: entry.sequence,
                      speaker: entry.speaker,
                      text: entry.text,
                  })),
                  qaPairs: interview.transcript.qaPairs.map((pair) => ({
                      id: pair.id,
                      sequence: pair.sequence,
                      question: pair.question,
                      answer: pair.answer,
                      source: pair.source,
                  })),
              }
            : null,
        timingMetrics: mapTimingMetrics(interview.timingMetrics),
    } satisfies InterviewTranscriptDetail;
}

export async function getInterviewFeedbackDetailForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            feedback: true,
            faceAnalysis: true,
        },
    });

    if (!interview) {
        return null;
    }

    return {
        feedback: mapInterviewFeedback(interview.feedback),
        faceAnalysis: mapFaceAnalysis(interview.faceAnalysis),
    } satisfies InterviewFeedbackDetail;
}

export async function getInterviewCodingChallengeDetailForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!interview) {
        return null;
    }

    return getLatestCodingChallengeAttempt(userId, interview.id);
}

export async function getInterviewOverallFeedbackDetailForUser(
    userId: string,
    interviewId: string
) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            cvFeedbackAnalysis: {
                select: {
                    overallScore: true,
                    roleSummary: true,
                },
            },
            feedback: {
                select: {
                    overallScore: true,
                    summary: true,
                },
            },
            overallFeedback: true,
            codingChallengeAttempts: {
                orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: {
                    evaluation: {
                        select: {
                            overallScore: true,
                            summary: true,
                        },
                    },
                },
            },
        },
    });

    if (!interview) {
        return null;
    }

    const latestAttempt = interview.codingChallengeAttempts[0] ?? null;

    return {
        overallFeedback: mapInterviewOverallFeedback(interview.overallFeedback),
        cvFeedback: mapCvFeedbackSummary(interview.cvFeedbackAnalysis),
        interviewFeedback: interview.feedback
            ? {
                  overallScore: interview.feedback.overallScore,
                  summary: interview.feedback.summary,
              }
            : null,
        codingChallenge: latestAttempt
            ? {
                  evaluation: latestAttempt.evaluation
                      ? {
                            overallScore: latestAttempt.evaluation.overallScore,
                            summary: latestAttempt.evaluation.summary,
                        }
                      : null,
              }
            : null,
    } satisfies InterviewOverallFeedbackDetail;
}

export async function getOrCreateInterviewOverallFeedbackForUser(args: {
    userId: string;
    interviewId: string;
    force?: boolean;
}) {
    const feedback = await createOrRefreshInterviewOverallFeedback(args);
    return mapInterviewOverallFeedback(feedback);
}

export async function updateInterviewProgressForUser(args: {
    userId: string;
    interviewId: string;
    currentStep: number;
}) {
    const existing = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        select: {
            id: true,
            startedAt: true,
            completedAt: true,
            cvFeedbackAnalysisId: true,
            transcript: {
                select: {
                    transcriptStatus: true,
                },
            },
            feedback: {
                select: {
                    id: true,
                },
            },
            codingChallengeAttempts: {
                orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: {
                    evaluation: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
    });

    if (!existing) {
        throw new Error("Interview not found");
    }

    const maxAccessibleStep = resolveMaxAccessibleStep({
        hasCvFeedback: Boolean(existing.cvFeedbackAnalysisId),
        transcriptStatus: existing.transcript?.transcriptStatus ?? null,
        hasInterviewFeedback: Boolean(existing.feedback),
        hasCodingEvaluation: Boolean(
            existing.codingChallengeAttempts[0]?.evaluation
        ),
    });
    const currentStep = Math.max(
        1,
        Math.min(maxAccessibleStep, Math.round(args.currentStep))
    );
    const status = resolveStatusForStep(currentStep);

    const updatedInterview = await db.interview.update({
        where: {
            id: existing.id,
        },
        data: {
            currentStep,
            status,
            startedAt:
                currentStep >= 2 ? existing.startedAt ?? new Date() : existing.startedAt,
            completedAt:
                currentStep >= 6
                    ? existing.completedAt ?? new Date()
                    : currentStep < 6
                      ? null
                      : existing.completedAt,
        },
        select: {
            id: true,
            title: true,
            role: true,
            status: true,
            currentStep: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
        },
    });

    return mapInterviewListItem(updatedInterview);
}

export async function deleteInterviewForUser(userId: string, interviewId: string) {
    const interview = await db.interview.findFirst({
        where: {
            id: interviewId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!interview) {
        return false;
    }

    await db.interview.delete({
        where: {
            id: interview.id,
        },
    });

    return true;
}

export async function saveInterviewTranscript(args: {
    userId: string;
    interviewId: string;
    role: string;
    transcriptStatus: InterviewTranscriptStatus;
    transcriptError?: string;
    candidateTranscript?: string;
    transcriptFingerprint?: string;
    interviewerQuestions?: string[];
    entries?: TranscriptEntry[];
    qaPairs?: TranscriptQaPair[];
    recapStatus?: InterviewRecapStatus;
    recapError?: string;
    recapCaptureNote?: string;
}) {
    const interview = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        select: {
            id: true,
        },
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    const entries = args.entries ?? [];
    const qaPairs = args.qaPairs ?? [];
    const transcriptExport =
        args.transcriptStatus === "ready"
            ? buildTranscriptQaExport(args.role, entries, {
                  qaPairs,
                  candidateTranscript: args.candidateTranscript ?? "",
              })
            : "";

    await db.$transaction(async (tx) => {
        await acquireTransactionalAdvisoryLock(
            tx,
            "interview-transcript",
            interview.id
        );

        await tx.interviewTranscript.upsert({
            where: {
                interviewId: interview.id,
            },
            update: {
                transcriptStatus: args.transcriptStatus,
                transcriptError: args.transcriptError?.trim() || null,
                candidateTranscript: args.candidateTranscript?.trim() || null,
                transcriptExport: transcriptExport || null,
                transcriptFingerprint: args.transcriptFingerprint?.trim() || null,
                interviewerQuestions: args.interviewerQuestions ?? [],
                recapStatus: args.recapStatus ?? "idle",
                recapError: args.recapError?.trim() || null,
                recapCaptureNote: args.recapCaptureNote?.trim() || null,
                entries: {
                    deleteMany: {},
                    create: entries.map((entry, index) => ({
                        sequence: index + 1,
                        speaker: entry.speaker,
                        text: entry.text,
                    })),
                },
                qaPairs: {
                    deleteMany: {},
                    create: qaPairs.map((pair, index) => ({
                        sequence: index + 1,
                        question: pair.question,
                        answer: pair.answer,
                        source: "ai_mapped",
                    })),
                },
            },
            create: {
                interviewId: interview.id,
                transcriptStatus: args.transcriptStatus,
                transcriptError: args.transcriptError?.trim() || null,
                candidateTranscript: args.candidateTranscript?.trim() || null,
                transcriptExport: transcriptExport || null,
                transcriptFingerprint: args.transcriptFingerprint?.trim() || null,
                interviewerQuestions: args.interviewerQuestions ?? [],
                recapStatus: args.recapStatus ?? "idle",
                recapError: args.recapError?.trim() || null,
                recapCaptureNote: args.recapCaptureNote?.trim() || null,
                entries: {
                    create: entries.map((entry, index) => ({
                        sequence: index + 1,
                        speaker: entry.speaker,
                        text: entry.text,
                    })),
                },
                qaPairs: {
                    create: qaPairs.map((pair, index) => ({
                        sequence: index + 1,
                        question: pair.question,
                        answer: pair.answer,
                        source: "ai_mapped",
                    })),
                },
            },
        });
    });
}

export async function upsertInterviewTimingMetrics(args: {
    userId: string;
    interviewId: string;
    metrics: InterviewTimingMetrics;
}) {
    const interview = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        select: {
            id: true,
        },
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    return db.interviewTimingMetrics.upsert({
        where: {
            interviewId: interview.id,
        },
        update: {
            answerCount: args.metrics.answerCount,
            totalCandidateSpeechMs: args.metrics.totalCandidateSpeechMs,
            averageAnswerDurationMs: args.metrics.averageAnswerDurationMs,
            longestAnswerDurationMs: args.metrics.longestAnswerDurationMs,
            shortestAnswerDurationMs: args.metrics.shortestAnswerDurationMs,
            averageResponseLatencyMs: args.metrics.averageResponseLatencyMs,
            longestResponseLatencyMs: args.metrics.longestResponseLatencyMs,
            candidateWordsPerMinute: args.metrics.candidateWordsPerMinute,
        },
        create: {
            interviewId: interview.id,
            answerCount: args.metrics.answerCount,
            totalCandidateSpeechMs: args.metrics.totalCandidateSpeechMs,
            averageAnswerDurationMs: args.metrics.averageAnswerDurationMs,
            longestAnswerDurationMs: args.metrics.longestAnswerDurationMs,
            shortestAnswerDurationMs: args.metrics.shortestAnswerDurationMs,
            averageResponseLatencyMs: args.metrics.averageResponseLatencyMs,
            longestResponseLatencyMs: args.metrics.longestResponseLatencyMs,
            candidateWordsPerMinute: args.metrics.candidateWordsPerMinute,
        },
    });
}

export async function saveInterviewFeedbackForUser(args: {
    userId: string;
    interviewId: string;
    evaluation: InterviewFeedbackEvaluation;
}) {
    const interview = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        select: {
            id: true,
        },
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    return db.interviewFeedback.upsert({
        where: {
            interviewId: interview.id,
        },
        update: {
            analyzedAt: new Date(args.evaluation.analyzedAt),
            role: args.evaluation.role,
            transcriptFingerprint: args.evaluation.transcriptFingerprint,
            overallScore: args.evaluation.overallScore,
            passedLikely: args.evaluation.passedLikely,
            summary: args.evaluation.summary,
            communicationScore: args.evaluation.communication.score,
            communicationFeedback: args.evaluation.communication.feedback,
            answerQualityScore: args.evaluation.answerQuality.score,
            answerQualityFeedback: args.evaluation.answerQuality.feedback,
            roleFitScore: args.evaluation.roleFit.score,
            roleFitFeedback: args.evaluation.roleFit.feedback,
            strengths: args.evaluation.strengths,
            issues: args.evaluation.issues,
            improvements: args.evaluation.improvements,
        },
        create: {
            interviewId: interview.id,
            analyzedAt: new Date(args.evaluation.analyzedAt),
            role: args.evaluation.role,
            transcriptFingerprint: args.evaluation.transcriptFingerprint,
            overallScore: args.evaluation.overallScore,
            passedLikely: args.evaluation.passedLikely,
            summary: args.evaluation.summary,
            communicationScore: args.evaluation.communication.score,
            communicationFeedback: args.evaluation.communication.feedback,
            answerQualityScore: args.evaluation.answerQuality.score,
            answerQualityFeedback: args.evaluation.answerQuality.feedback,
            roleFitScore: args.evaluation.roleFit.score,
            roleFitFeedback: args.evaluation.roleFit.feedback,
            strengths: args.evaluation.strengths,
            issues: args.evaluation.issues,
            improvements: args.evaluation.improvements,
        },
    });
}

export async function saveInterviewFaceAnalysisForUser(args: {
    userId: string;
    interviewId: string;
    report: FaceAnalysisReport;
}) {
    const interview = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        select: {
            id: true,
        },
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    return db.interviewFaceAnalysis.upsert({
        where: {
            interviewId: interview.id,
        },
        update: {
            analyzedAt: new Date(),
            analysisVersion: args.report.analysisVersion,
            mode: args.report.mode,
            role: args.report.role,
            startedAt: new Date(args.report.startedAt),
            endedAt: new Date(args.report.endedAt),
            durationMs: args.report.durationMs,
            durationLabel: args.report.durationLabel,
            sampleCount: args.report.sampleCount,
            windowCount: args.report.windowCount,
            overallScore: args.report.overallScore,
            overallStatus: args.report.overallStatus,
            faceDetectedPct: args.report.globalMetrics.faceDetectedPct,
            avgFrontalFacingScore:
                args.report.globalMetrics.avgFrontalFacingScore,
            avgHeadMovement: args.report.globalMetrics.avgHeadMovement,
            avgEyeOpenness: args.report.globalMetrics.avgEyeOpenness,
            avgMouthOpenness: args.report.globalMetrics.avgMouthOpenness,
            avgSpeakingLikelihood:
                args.report.globalMetrics.avgSpeakingLikelihood,
            speakingActivityPct: args.report.globalMetrics.speakingActivityPct,
            blinkCount: args.report.globalMetrics.blinkCount,
            blinkRatePerMin: args.report.globalMetrics.blinkRatePerMin,
            stableWindowPct: args.report.globalMetrics.stableWindowPct,
            headline: args.report.summary.headline,
            strengths: args.report.summary.strengths,
            risks: args.report.summary.risks,
            nextSteps: args.report.summary.nextSteps,
            limitations: args.report.limitations,
            parameters: args.report.parameters,
            alerts: args.report.alerts,
            windows: args.report.windows,
        },
        create: {
            interviewId: interview.id,
            analysisVersion: args.report.analysisVersion,
            mode: args.report.mode,
            role: args.report.role,
            startedAt: new Date(args.report.startedAt),
            endedAt: new Date(args.report.endedAt),
            durationMs: args.report.durationMs,
            durationLabel: args.report.durationLabel,
            sampleCount: args.report.sampleCount,
            windowCount: args.report.windowCount,
            overallScore: args.report.overallScore,
            overallStatus: args.report.overallStatus,
            faceDetectedPct: args.report.globalMetrics.faceDetectedPct,
            avgFrontalFacingScore:
                args.report.globalMetrics.avgFrontalFacingScore,
            avgHeadMovement: args.report.globalMetrics.avgHeadMovement,
            avgEyeOpenness: args.report.globalMetrics.avgEyeOpenness,
            avgMouthOpenness: args.report.globalMetrics.avgMouthOpenness,
            avgSpeakingLikelihood:
                args.report.globalMetrics.avgSpeakingLikelihood,
            speakingActivityPct: args.report.globalMetrics.speakingActivityPct,
            blinkCount: args.report.globalMetrics.blinkCount,
            blinkRatePerMin: args.report.globalMetrics.blinkRatePerMin,
            stableWindowPct: args.report.globalMetrics.stableWindowPct,
            headline: args.report.summary.headline,
            strengths: args.report.summary.strengths,
            risks: args.report.summary.risks,
            nextSteps: args.report.summary.nextSteps,
            limitations: args.report.limitations,
            parameters: args.report.parameters,
            alerts: args.report.alerts,
            windows: args.report.windows,
        },
    });
}

export async function getHomeDashboardSnapshot(userId: string) {
    const [totalInterviews, completedInterviews, latestCvFeedback, recentInterviews] =
        await Promise.all([
            db.interview.count({
                where: {
                    userId,
                },
            }),
            db.interview.count({
                where: {
                    userId,
                    status: "completed",
                },
            }),
            db.cvFeedbackAnalysis.findFirst({
                where: {
                    cvVersion: {
                        userId,
                    },
                },
                orderBy: {
                    analyzedAt: "desc",
                },
                select: {
                    overallScore: true,
                },
            }),
            db.interview.findMany({
                where: {
                    userId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 3,
                select: {
                    id: true,
                    title: true,
                    role: true,
                },
            }),
        ]);

    return {
        totalInterviews,
        completedInterviews,
        cvScore: latestCvFeedback?.overallScore ?? null,
        successRate:
            totalInterviews > 0
                ? Math.round((completedInterviews / totalInterviews) * 100)
                : null,
        recentInterviews: recentInterviews.map((interview) => ({
            id: interview.id,
            title: interview.title ?? interview.role,
        })),
    };
}
