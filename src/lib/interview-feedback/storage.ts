"use client"

import type { FaceAnalysisReport } from "@/lib/face-analysis"
import {
    FACE_BODY_LANGUAGE_STORAGE_KEY,
    type FaceBodyLanguageSummary,
} from "@/lib/face-metrics"
import type { InterviewFeedbackEvaluation } from "@/lib/interview-feedback/types"

const FEEDBACK_STORAGE_PREFIX = "interviewFeedback:"
const FACE_ANALYSIS_STORAGE_PREFIX = "interviewFaceAnalysis:"

function readStoredJson<T>(key: string): T | null {
    if (typeof window === "undefined") return null

    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null

    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

export function buildInterviewFeedbackStorageKey(interviewId: string) {
    return `${FEEDBACK_STORAGE_PREFIX}${interviewId}`
}

export function buildInterviewFaceAnalysisStorageKey(interviewId: string) {
    return `${FACE_ANALYSIS_STORAGE_PREFIX}${interviewId}`
}

export function loadInterviewFeedbackEvaluation(interviewId: string) {
    return readStoredJson<InterviewFeedbackEvaluation>(
        buildInterviewFeedbackStorageKey(interviewId)
    )
}

export function persistInterviewFeedbackEvaluation(
    interviewId: string,
    evaluation: InterviewFeedbackEvaluation
) {
    if (typeof window === "undefined") return

    window.sessionStorage.setItem(
        buildInterviewFeedbackStorageKey(interviewId),
        JSON.stringify(evaluation)
    )
}

export function loadInterviewFaceAnalysisReport(interviewId: string) {
    return readStoredJson<FaceAnalysisReport>(
        buildInterviewFaceAnalysisStorageKey(interviewId)
    )
}

export function persistInterviewFaceAnalysisReport(
    interviewId: string,
    report: FaceAnalysisReport
) {
    if (typeof window === "undefined") return

    window.sessionStorage.setItem(
        buildInterviewFaceAnalysisStorageKey(interviewId),
        JSON.stringify(report)
    )
}

export function clearInterviewFaceAnalysisReport(interviewId: string) {
    if (typeof window === "undefined") return

    window.sessionStorage.removeItem(buildInterviewFaceAnalysisStorageKey(interviewId))
}

export function loadFaceBodyLanguageSummary() {
    return readStoredJson<FaceBodyLanguageSummary>(FACE_BODY_LANGUAGE_STORAGE_KEY)
}
