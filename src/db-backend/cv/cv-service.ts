import "server-only";

import { createHash } from "node:crypto";

import type { CvFeedbackAnalysis, CvVersion } from "@prisma/client";

import { db } from "@/db-backend/prisma/client";
import {
    analyzeCvFeedbackFromText,
    CvFeedbackError,
} from "@/lib/cv/server/analyze-cv-feedback";
import { MAX_CV_BYTES } from "@/lib/cv/server/constants";
import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";
import { pdfToText } from "@/lib/cv/server/pdf-to-text";

function normalizeConfig(config: InterviewCvConfig): InterviewCvConfig {
    return {
        role: config.role.trim() || "Backend Developer",
        experience: config.experience.trim(),
        companySize: config.companySize.trim(),
    };
}

function mapCvFeedbackAnalysisToResult(
    analysis: CvFeedbackAnalysis
): CvFeedbackResult {
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

function buildCvVersionSummary(cv: CvVersion) {
    return {
        id: cv.id,
        fileName: cv.fileName ?? "Lebenslauf.pdf",
        fileSizeBytes: cv.fileSizeBytes,
        mimeType: cv.mimeType,
        uploadedAt: cv.uploadedAt.toISOString(),
    };
}

async function createCvFeedbackAnalysis(args: {
    cvVersion: CvVersion;
    config: InterviewCvConfig;
}) {
    const { cvVersion } = args;
    const config = normalizeConfig(args.config);
    const cvText = cvVersion.extractedText?.trim() ?? "";

    if (!cvText) {
        throw new CvFeedbackError(
            "Kein lesbarer Text im gespeicherten Lebenslauf gefunden.",
            422
        );
    }

    const result = await analyzeCvFeedbackFromText({
        cvText,
        fileName: cvVersion.fileName ?? "Lebenslauf.pdf",
        config,
    });

    const analysis = await db.cvFeedbackAnalysis.upsert({
        where: {
            cvVersionId_role_experience_companySize: {
                cvVersionId: cvVersion.id,
                role: config.role,
                experience: config.experience,
                companySize: config.companySize,
            },
        },
        update: {
            analyzedAt: new Date(),
            fileName: result.fileName,
            overallScore: result.quality.overallScore,
            keywordScore: result.scoreBreakdown.keywordScore,
            llmScore: result.scoreBreakdown.llmScore,
            blendedScore: result.scoreBreakdown.blendedScore,
            keywordWeight: result.scoreBreakdown.keywordWeight,
            llmWeight: result.scoreBreakdown.llmWeight,
            sectionsScore: result.quality.sections.score,
            sectionsFeedback: result.quality.sections.feedback,
            impactScore: result.quality.impact.score,
            impactFeedback: result.quality.impact.feedback,
            lengthScore: result.quality.length.score,
            lengthFeedback: result.quality.length.feedback,
            contactScore: result.quality.contact.score,
            contactFeedback: result.quality.contact.feedback,
            clarityScore: result.quality.clarity.score,
            clarityFeedback: result.quality.clarity.feedback,
            improvements: result.quality.improvements,
            roleMatchScore: result.roleAnalysis.score,
            matchedKeywords: result.roleAnalysis.matched,
            missingMustHaveKeywords: result.roleAnalysis.missingMustHave,
            niceToHaveMatches: result.roleAnalysis.niceToHaveMatches,
            bonusMatches: result.roleAnalysis.bonusMatches,
            roleSummary: result.roleAnalysis.summary,
        },
        create: {
            cvVersionId: cvVersion.id,
            role: config.role,
            experience: config.experience,
            companySize: config.companySize,
            fileName: result.fileName,
            overallScore: result.quality.overallScore,
            keywordScore: result.scoreBreakdown.keywordScore,
            llmScore: result.scoreBreakdown.llmScore,
            blendedScore: result.scoreBreakdown.blendedScore,
            keywordWeight: result.scoreBreakdown.keywordWeight,
            llmWeight: result.scoreBreakdown.llmWeight,
            sectionsScore: result.quality.sections.score,
            sectionsFeedback: result.quality.sections.feedback,
            impactScore: result.quality.impact.score,
            impactFeedback: result.quality.impact.feedback,
            lengthScore: result.quality.length.score,
            lengthFeedback: result.quality.length.feedback,
            contactScore: result.quality.contact.score,
            contactFeedback: result.quality.contact.feedback,
            clarityScore: result.quality.clarity.score,
            clarityFeedback: result.quality.clarity.feedback,
            improvements: result.quality.improvements,
            roleMatchScore: result.roleAnalysis.score,
            matchedKeywords: result.roleAnalysis.matched,
            missingMustHaveKeywords: result.roleAnalysis.missingMustHave,
            niceToHaveMatches: result.roleAnalysis.niceToHaveMatches,
            bonusMatches: result.roleAnalysis.bonusMatches,
            roleSummary: result.roleAnalysis.summary,
        },
    });

    return {
        analysis,
        result,
    };
}

export async function getActiveCvSummaryForUser(userId: string) {
    const cvVersion = await db.cvVersion.findFirst({
        where: {
            userId,
            isActive: true,
        },
        orderBy: {
            uploadedAt: "desc",
        },
    });

    return cvVersion ? buildCvVersionSummary(cvVersion) : null;
}

export async function uploadCvForUser(userId: string, file: File) {
    if (file.type !== "application/pdf") {
        throw new CvFeedbackError("PDF file must be application/pdf", 400);
    }

    if (file.size > MAX_CV_BYTES) {
        throw new CvFeedbackError("PDF must be smaller than 20MB", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await pdfToText(buffer);

    if (!extractedText.trim()) {
        throw new CvFeedbackError(
            "No readable text could be extracted from the PDF",
            422
        );
    }

    const extractedTextHash = createHash("sha256")
        .update(extractedText)
        .digest("hex");

    const cvVersion = await db.$transaction(async (tx) => {
        await tx.cvVersion.updateMany({
            where: {
                userId,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        return tx.cvVersion.create({
            data: {
                userId,
                fileName: file.name,
                mimeType: file.type || "application/pdf",
                fileSizeBytes: file.size,
                extractedText,
                extractedTextHash,
                isActive: true,
            },
        });
    });

    return buildCvVersionSummary(cvVersion);
}

export async function getOrCreateCvFeedbackAnalysisForInterview(args: {
    userId: string;
    interviewId: string;
    force?: boolean;
}) {
    const interview = await db.interview.findFirst({
        where: {
            id: args.interviewId,
            userId: args.userId,
        },
        include: {
            cvFeedbackAnalysis: true,
            cvVersion: true,
        },
    });

    if (!interview) {
        throw new CvFeedbackError("Interview not found", 404);
    }

    const cvVersion =
        interview.cvVersion ??
        (await db.cvVersion.findFirst({
            where: {
                userId: args.userId,
                isActive: true,
            },
            orderBy: {
                uploadedAt: "desc",
            },
        }));

    if (!cvVersion) {
        throw new CvFeedbackError("Kein Lebenslauf im Profil gespeichert.", 404);
    }

    const config = normalizeConfig({
        role: interview.role,
        experience: interview.experience,
        companySize: interview.companySize,
    });

    if (interview.cvFeedbackAnalysis && !args.force) {
        return {
            cv: buildCvVersionSummary(cvVersion),
            result: mapCvFeedbackAnalysisToResult(interview.cvFeedbackAnalysis),
        };
    }

    if (!args.force) {
        const existing = await db.cvFeedbackAnalysis.findUnique({
            where: {
                cvVersionId_role_experience_companySize: {
                    cvVersionId: cvVersion.id,
                    role: config.role,
                    experience: config.experience,
                    companySize: config.companySize,
                },
            },
        });

        if (existing) {
            await db.interview.update({
                where: {
                    id: interview.id,
                },
                data: {
                    cvVersionId: cvVersion.id,
                    cvFeedbackAnalysisId: existing.id,
                },
            });

            return {
                cv: buildCvVersionSummary(cvVersion),
                result: mapCvFeedbackAnalysisToResult(existing),
            };
        }
    }

    const { analysis, result } = await createCvFeedbackAnalysis({
        cvVersion,
        config,
    });

    await db.interview.update({
        where: {
            id: interview.id,
        },
        data: {
            cvVersionId: cvVersion.id,
            cvFeedbackAnalysisId: analysis.id,
        },
    });

    return {
        cv: buildCvVersionSummary(cvVersion),
        result,
    };
}
