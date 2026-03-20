"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import type {
    FaceAnalysisParameterReport,
    FaceAnalysisReport,
    FaceAnalysisStatus as FaceScoreStatus,
    FaceLandmarkExportSnapshot,
} from "@/lib/face-analysis"

type RunningMode = "IMAGE" | "VIDEO"
type ModelStatus = "idle" | "loading" | "ready" | "error"
type BlendShapeCategory = {
    displayName?: string
    categoryName?: string
    score: number
}
type FaceLandmarkPoint = {
    x: number
    y: number
    z?: number
}
type FaceLandmarkerResult = {
    faceLandmarks?: FaceLandmarkPoint[][]
    faceBlendshapes?: Array<{
        categories: BlendShapeCategory[]
    }>
}
type DrawingUtilsInstance = {
    drawConnectors: (
        landmarks: FaceLandmarkPoint[],
        connectorSet: unknown,
        options: { color: string; lineWidth?: number }
    ) => void
}
type FaceLandmarkerInstance = {
    close?: () => void
    detectForVideo: (video: HTMLVideoElement, now: number) => FaceLandmarkerResult | null
}
type VisionModule = {
    FaceLandmarker: {
        createFromOptions: (
            filesetResolver: unknown,
            options: {
                baseOptions: {
                    modelAssetPath: string
                    delegate: "GPU"
                }
                outputFaceBlendshapes: boolean
                runningMode: RunningMode
                numFaces: number
            }
        ) => Promise<FaceLandmarkerInstance>
        FACE_LANDMARKS_TESSELATION: unknown
        FACE_LANDMARKS_RIGHT_EYE: unknown
        FACE_LANDMARKS_RIGHT_EYEBROW: unknown
        FACE_LANDMARKS_LEFT_EYE: unknown
        FACE_LANDMARKS_LEFT_EYEBROW: unknown
        FACE_LANDMARKS_FACE_OVAL: unknown
        FACE_LANDMARKS_LIPS: unknown
        FACE_LANDMARKS_RIGHT_IRIS: unknown
        FACE_LANDMARKS_LEFT_IRIS: unknown
    }
    FilesetResolver: {
        forVisionTasks: (wasmUrl: string) => Promise<unknown>
    }
    DrawingUtils: new (ctx: CanvasRenderingContext2D) => DrawingUtilsInstance
}

const VISION_BUNDLE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3"
const VISION_WASM_URL = `${VISION_BUNDLE_URL}/wasm`
const MODEL_ASSET_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
const FACE_BODY_LANGUAGE_STORAGE_KEY = "faceBodyLanguageMetrics"
const METRICS_SAMPLE_INTERVAL_MS = 120
const METRICS_WRITE_INTERVAL_MS = 1_000
const METRICS_RECENT_SAMPLE_LIMIT = 180
const METRICS_FALLBACK_GRACE_MS = 450
const INVALID_STATE_PRESERVE_SAMPLES = 4
const BLINK_CLOSE_THRESHOLD = 0.19
const BLINK_OPEN_THRESHOLD = 0.245
const SPEAKING_ACTIVITY_THRESHOLD = 0.45
const MEDIAPIPE_NOISE_PATTERNS = [
    "face blendshape model contains cpu only ops",
    "gl version:",
    "opengl error checking is disabled",
    "graph successfully started running",
    "created tensorflow lite xnnpack delegate for cpu",
]

const FACE_INDEX = {
    noseTip: 1,
    forehead: 10,
    chin: 152,
    leftCheek: 234,
    rightCheek: 454,
    leftEyeOuter: 33,
    leftEyeInner: 133,
    leftEyeUpper: 159,
    leftEyeLower: 145,
    rightEyeOuter: 263,
    rightEyeInner: 362,
    rightEyeUpper: 386,
    rightEyeLower: 374,
    mouthLeft: 61,
    mouthRight: 291,
    mouthUpper: 13,
    mouthLower: 14,
} as const

type FaceBodyLanguageSample = {
    ts: number
    faceDetected: boolean
    frontalFacingScore: number
    headYaw: number
    headPitch: number
    headMovement: number
    eyeOpenness: number
    blink: boolean
    mouthOpenness: number
    speakingLikelihood: number
}

type FaceBodyMetricState = {
    previousNoseTip: FaceLandmarkPoint | null
    previousMouthOpenness: number | null
    previousSampleTs: number | null
    blinkActive: boolean
    invalidFrameCount: number
}

type FaceBodyLanguageSummary = {
    updatedAt: string
    role: string | null
    webcamActive: boolean
    sampleCount: number
    faceDetectedPct: number
    avgFrontalFacingScore: number
    avgHeadMovement: number
    blinkCount: number
    blinkRatePerMin: number
    avgMouthOpenness: number
    speakingActivityPct: number
    current: FaceBodyLanguageSample | null
    recentSamples: FaceBodyLanguageSample[]
}

type ComputeBodyLanguageResult = {
    sample: FaceBodyLanguageSample
    nextState: FaceBodyMetricState
}

type FaceAnalysisRequestStatus = "idle" | "analyzing" | "ready" | "error"

function shouldIgnoreMediapipeConsoleMessage(args: unknown[]) {
    const text = args
        .map((value) => {
            if (typeof value === "string") return value
            if (value instanceof Error) return value.message
            return String(value)
        })
        .join(" ")
        .toLowerCase()

    return MEDIAPIPE_NOISE_PATTERNS.some((pattern) => text.includes(pattern))
}

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value))
}

function safeRatio(numerator: number, denominator: number) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0
    return numerator / denominator
}

function distance(a: FaceLandmarkPoint, b: FaceLandmarkPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y)
}

function averagePoint(points: FaceLandmarkPoint[]) {
    const total = points.reduce(
        (acc: { x: number; y: number; z: number }, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y,
            z: acc.z + (point.z ?? 0),
        }),
        { x: 0, y: 0, z: 0 }
    )

    return {
        x: total.x / points.length,
        y: total.y / points.length,
        z: total.z / points.length,
    }
}

function roundMetric(value: number, decimals = 3) {
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
}

function buildEmptyBodyLanguageSample(ts: number): FaceBodyLanguageSample {
    return {
        ts,
        faceDetected: false,
        frontalFacingScore: 0,
        headYaw: 0,
        headPitch: 0,
        headMovement: 0,
        eyeOpenness: 0,
        blink: false,
        mouthOpenness: 0,
        speakingLikelihood: 0,
    }
}

function createEmptyMetricState(): FaceBodyMetricState {
    return {
        previousNoseTip: null,
        previousMouthOpenness: null,
        previousSampleTs: null,
        blinkActive: false,
        invalidFrameCount: 0,
    }
}

function createEmptyBodyLanguageSummary(role?: string): FaceBodyLanguageSummary {
    return {
        updatedAt: new Date().toISOString(),
        role: role?.trim() || null,
        webcamActive: false,
        sampleCount: 0,
        faceDetectedPct: 0,
        avgFrontalFacingScore: 0,
        avgHeadMovement: 0,
        blinkCount: 0,
        blinkRatePerMin: 0,
        avgMouthOpenness: 0,
        speakingActivityPct: 0,
        current: null,
        recentSamples: [],
    }
}

function persistBodyLanguageSummary(summary: FaceBodyLanguageSummary) {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(FACE_BODY_LANGUAGE_STORAGE_KEY, JSON.stringify(summary))
    if (process.env.NODE_ENV !== "production") {
        console.log("[faceBodyLanguageMetrics]", summary)
    }
}

function buildFaceLandmarkExportSnapshot(args: {
    snapshot: number
    role?: string
    sample: FaceBodyLanguageSample
}) {
    return {
        snapshot: args.snapshot,
        ts: args.sample.ts,
        isoTime: new Date(args.sample.ts).toISOString(),
        role: args.role?.trim() || null,
        faceDetected: args.sample.faceDetected,
        frontalFacingScore: args.sample.frontalFacingScore,
        headYaw: args.sample.headYaw,
        headPitch: args.sample.headPitch,
        headMovement: args.sample.headMovement,
        eyeOpenness: args.sample.eyeOpenness,
        blink: args.sample.blink,
        mouthOpenness: args.sample.mouthOpenness,
        speakingLikelihood: args.sample.speakingLikelihood,
    } satisfies FaceLandmarkExportSnapshot
}

function keepRecentSamples(samples: FaceBodyLanguageSample[]) {
    return samples.slice(-METRICS_RECENT_SAMPLE_LIMIT)
}

function createInvalidMetricResult(metricState: FaceBodyMetricState, ts: number): ComputeBodyLanguageResult {
    const invalidFrameCount = metricState.invalidFrameCount + 1
    const preserveContinuity = invalidFrameCount <= INVALID_STATE_PRESERVE_SAMPLES

    return {
        sample: buildEmptyBodyLanguageSample(ts),
        nextState: preserveContinuity
            ? {
                  previousNoseTip: metricState.previousNoseTip,
                  previousMouthOpenness: metricState.previousMouthOpenness,
                  previousSampleTs: ts,
                  blinkActive: metricState.blinkActive,
                  invalidFrameCount,
              }
            : {
                  previousNoseTip: null,
                  previousMouthOpenness: null,
                  previousSampleTs: ts,
                  blinkActive: false,
                  invalidFrameCount,
              },
    }
}

function resolveEffectiveLandmarks(args: {
    detectedLandmarks: FaceLandmarkPoint[][]
    fallbackLandmarks: FaceLandmarkPoint[][]
    now: number
    lastDetectionAt: number
}) {
    if (args.detectedLandmarks.length > 0) return args.detectedLandmarks
    if (args.now - args.lastDetectionAt <= METRICS_FALLBACK_GRACE_MS) return args.fallbackLandmarks
    return []
}

function computeBodyLanguageSample(
    landmarks: FaceLandmarkPoint[] | null,
    metricState: FaceBodyMetricState,
    ts: number
) : ComputeBodyLanguageResult {
    if (!landmarks) {
        return createInvalidMetricResult(metricState, ts)
    }

    const noseTip = landmarks[FACE_INDEX.noseTip]
    const forehead = landmarks[FACE_INDEX.forehead]
    const chin = landmarks[FACE_INDEX.chin]
    const leftCheek = landmarks[FACE_INDEX.leftCheek]
    const rightCheek = landmarks[FACE_INDEX.rightCheek]
    const leftEyeOuter = landmarks[FACE_INDEX.leftEyeOuter]
    const leftEyeInner = landmarks[FACE_INDEX.leftEyeInner]
    const leftEyeUpper = landmarks[FACE_INDEX.leftEyeUpper]
    const leftEyeLower = landmarks[FACE_INDEX.leftEyeLower]
    const rightEyeOuter = landmarks[FACE_INDEX.rightEyeOuter]
    const rightEyeInner = landmarks[FACE_INDEX.rightEyeInner]
    const rightEyeUpper = landmarks[FACE_INDEX.rightEyeUpper]
    const rightEyeLower = landmarks[FACE_INDEX.rightEyeLower]
    const mouthLeft = landmarks[FACE_INDEX.mouthLeft]
    const mouthRight = landmarks[FACE_INDEX.mouthRight]
    const mouthUpper = landmarks[FACE_INDEX.mouthUpper]
    const mouthLower = landmarks[FACE_INDEX.mouthLower]

    if (
        !noseTip ||
        !forehead ||
        !chin ||
        !leftCheek ||
        !rightCheek ||
        !leftEyeOuter ||
        !leftEyeInner ||
        !leftEyeUpper ||
        !leftEyeLower ||
        !rightEyeOuter ||
        !rightEyeInner ||
        !rightEyeUpper ||
        !rightEyeLower ||
        !mouthLeft ||
        !mouthRight ||
        !mouthUpper ||
        !mouthLower
    ) {
        return createInvalidMetricResult(metricState, ts)
    }

    const faceCenter = averagePoint([leftCheek, rightCheek, forehead, chin])
    const faceWidth = Math.max(distance(leftCheek, rightCheek), 0.0001)
    const faceHeight = Math.max(distance(forehead, chin), 0.0001)
    const leftEyeWidth = Math.max(distance(leftEyeOuter, leftEyeInner), 0.0001)
    const rightEyeWidth = Math.max(distance(rightEyeOuter, rightEyeInner), 0.0001)
    const mouthWidth = Math.max(distance(mouthLeft, mouthRight), 0.0001)

    const leftEyeOpenness = safeRatio(distance(leftEyeUpper, leftEyeLower), leftEyeWidth)
    const rightEyeOpenness = safeRatio(distance(rightEyeUpper, rightEyeLower), rightEyeWidth)
    const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2
    const blink = metricState.blinkActive ? eyeOpenness < BLINK_OPEN_THRESHOLD : eyeOpenness < BLINK_CLOSE_THRESHOLD

    const mouthOpenness = safeRatio(distance(mouthUpper, mouthLower), mouthWidth)
    const mouthMovement = metricState.previousMouthOpenness === null ? 0 : Math.abs(mouthOpenness - metricState.previousMouthOpenness)
    const mouthOpennessSignal = clamp01((mouthOpenness - 0.03) / 0.2)
    const mouthMovementSignal = clamp01(mouthMovement / 0.04)
    const speakingLikelihood = clamp01(mouthOpennessSignal * 0.65 + mouthMovementSignal * 0.35)

    const headYaw = roundMetric((noseTip.x - faceCenter.x) / (faceWidth * 0.5))
    const headPitch = roundMetric((noseTip.y - faceCenter.y) / (faceHeight * 0.5))
    const sampleDeltaMs = metricState.previousSampleTs === null ? METRICS_SAMPLE_INTERVAL_MS : Math.max(1, ts - metricState.previousSampleTs)
    const movementTimeNormalization = Math.min(1.25, METRICS_SAMPLE_INTERVAL_MS / sampleDeltaMs)
    const headMovement = roundMetric(
        metricState.previousNoseTip ? safeRatio(distance(metricState.previousNoseTip, noseTip), faceWidth) * movementTimeNormalization : 0
    )
    const frontalFacingScore = roundMetric(clamp01(1 - Math.abs(headYaw) * 0.85 - Math.abs(headPitch) * 0.65 - headMovement * 1.5))

    return {
        sample: {
            ts,
            faceDetected: true,
            frontalFacingScore,
            headYaw,
            headPitch,
            headMovement,
            eyeOpenness: roundMetric(eyeOpenness),
            blink,
            mouthOpenness: roundMetric(mouthOpenness),
            speakingLikelihood: roundMetric(speakingLikelihood),
        },
        nextState: {
            previousNoseTip: noseTip,
            previousMouthOpenness: mouthOpenness,
            previousSampleTs: ts,
            blinkActive: blink,
            invalidFrameCount: 0,
        },
    }
}

function summarizeBodyLanguageSamples(args: {
    allSamples: FaceBodyLanguageSample[]
    recentSamples: FaceBodyLanguageSample[]
    role?: string
    webcamActive?: boolean
}) : FaceBodyLanguageSummary {
    const { allSamples, recentSamples, role, webcamActive = false } = args

    if (allSamples.length === 0) {
        const empty = createEmptyBodyLanguageSummary(role)
        return { ...empty, webcamActive }
    }

    const detectedSamples = allSamples.filter((sample) => sample.faceDetected)
    const totalDurationMs = allSamples.length > 1 ? Math.max(1, allSamples[allSamples.length - 1].ts - allSamples[0].ts) : METRICS_SAMPLE_INTERVAL_MS
    const speakingSamples = detectedSamples.filter((sample) => sample.speakingLikelihood >= SPEAKING_ACTIVITY_THRESHOLD)
    const blinkCount = detectedSamples.reduce((count, sample, index) => {
        const previous = detectedSamples[index - 1]
        return count + (!previous?.blink && sample.blink ? 1 : 0)
    }, 0)

    return {
        updatedAt: new Date().toISOString(),
        role: role?.trim() || null,
        webcamActive,
        sampleCount: allSamples.length,
        faceDetectedPct: roundMetric(detectedSamples.length / allSamples.length),
        avgFrontalFacingScore: roundMetric(
            detectedSamples.reduce((sum, sample) => sum + sample.frontalFacingScore, 0) / Math.max(1, detectedSamples.length)
        ),
        avgHeadMovement: roundMetric(detectedSamples.reduce((sum, sample) => sum + sample.headMovement, 0) / Math.max(1, detectedSamples.length)),
        blinkCount,
        blinkRatePerMin: roundMetric(blinkCount / (totalDurationMs / 60_000), 2),
        avgMouthOpenness: roundMetric(detectedSamples.reduce((sum, sample) => sum + sample.mouthOpenness, 0) / Math.max(1, detectedSamples.length)),
        speakingActivityPct: roundMetric(speakingSamples.length / Math.max(1, detectedSamples.length)),
        current: allSamples[allSamples.length - 1] ?? null,
        recentSamples: recentSamples.length > 0 ? recentSamples : keepRecentSamples(allSamples),
    }
}

function drawFaceConnectors(
    drawingUtils: DrawingUtilsInstance,
    faceLandmarkerClass: VisionModule["FaceLandmarker"],
    landmarks: FaceLandmarkPoint[]
) {
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1,
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_RIGHT_EYE, {
        color: "#FF3030",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_RIGHT_EYEBROW, {
        color: "#FF3030",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_LEFT_EYE, {
        color: "#30FF30",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_LEFT_EYEBROW, {
        color: "#30FF30",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_FACE_OVAL, {
        color: "#E0E0E0",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_LIPS, {
        color: "#E0E0E0",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_RIGHT_IRIS, {
        color: "#FF3030",
    })
    drawingUtils.drawConnectors(landmarks, faceLandmarkerClass.FACE_LANDMARKS_LEFT_IRIS, {
        color: "#30FF30",
    })
}

function scoreWidth(score: number) {
    return `${Math.max(0, Math.min(100, score * 100))}%`
}

function scoreToneClasses(status: FaceScoreStatus) {
    switch (status) {
        case "strong":
            return "border-emerald-200 bg-emerald-50 text-emerald-700"
        case "okay":
            return "border-sky-200 bg-sky-50 text-sky-700"
        case "watch":
            return "border-amber-200 bg-amber-50 text-amber-800"
        case "critical":
            return "border-red-200 bg-red-50 text-red-700"
    }
}

function renderSummaryList(items: string[]) {
    return items.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {items.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-2xl bg-white px-3 py-2">
                    {item}
                </li>
            ))}
        </ul>
    ) : (
        <p className="mt-2 text-sm text-slate-500">Keine Punkte fuer diesen Block vorhanden.</p>
    )
}

function FaceAnalysisParameterRow({ parameter }: { parameter: FaceAnalysisParameterReport }) {
    return (
        <div className="rounded-2xl bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-900">{parameter.label}</p>
                    <p className="text-xs text-slate-500">{parameter.valueLabel}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreToneClasses(parameter.status)}`}>
                    {parameter.score.toFixed(1)}/100
                </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-slate-900" style={{ width: scoreWidth(parameter.score / 100) }} />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-600">{parameter.summary}</p>
        </div>
    )
}

function FaceAnalysisSummary(args: {
    report: FaceAnalysisReport | null
    status: FaceAnalysisRequestStatus
    error: string
    minimal: boolean
}) {
    const { report, status, error, minimal } = args

    return (
        <section className="mt-4 rounded-[20px] border bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Face Analyse</p>
                    <h3 className={`mt-1 font-semibold tracking-tight text-slate-950 ${minimal ? "text-base" : "text-lg"}`}>
                        Automatische Video-Auswertung
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Nach dem Stop wird die Session direkt an die Analyse-API geschickt und ohne TXT im UI ausgewertet.
                    </p>
                </div>

                {report ? (
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${scoreToneClasses(report.overallStatus)}`}>
                        {report.overallScore.toFixed(1)}/100
                    </span>
                ) : (
                    <span className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{status}</span>
                )}
            </div>

            {status === "analyzing" ? (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    Die Face-Daten werden gerade ausgewertet.
                </div>
            ) : null}

            {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            {!report && status === "idle" ? (
                <p className="mt-4 text-sm text-slate-600">Noch keine abgeschlossene Session analysiert.</p>
            ) : null}

            {report ? (
                <>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border bg-white px-3 py-1.5">Dauer: {report.durationLabel}</span>
                        <span className="rounded-full border bg-white px-3 py-1.5">Samples: {report.sampleCount}</span>
                        <span className="rounded-full border bg-white px-3 py-1.5">Fenster: {report.windowCount}</span>
                        <span className="rounded-full border bg-white px-3 py-1.5">
                            Gesicht: {(report.globalMetrics.faceDetectedPct * 100).toFixed(1)}%
                        </span>
                        <span className="rounded-full border bg-white px-3 py-1.5">
                            Sprechaktivitaet: {(report.globalMetrics.speakingActivityPct * 100).toFixed(1)}%
                        </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{report.summary.headline}</p>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-[18px] border border-slate-200 bg-slate-100/70 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Staerken</p>
                            {renderSummaryList(report.summary.strengths)}
                        </div>

                        <div className="rounded-[18px] border border-slate-200 bg-slate-100/70 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Naechste Schritte</p>
                            {renderSummaryList(report.summary.nextSteps)}
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        {report.parameters.map((parameter) => (
                            <FaceAnalysisParameterRow key={parameter.key} parameter={parameter} />
                        ))}
                    </div>

                    {report.alerts.length > 0 ? (
                        <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Zeitfenster mit Auffaelligkeiten</p>
                            <ul className="mt-2 space-y-2 text-sm text-amber-900">
                                {report.alerts.map((alert, index) => (
                                    <li key={`${alert.type}-${alert.startedAt}-${index}`} className="rounded-2xl bg-white/80 px-3 py-2">
                                        {alert.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </>
            ) : null}
        </section>
    )
}

function BlendShapeList({ shapes }: { shapes: BlendShapeCategory[] }) {
    return (
        <div className="rounded-[20px] border bg-slate-50 p-4">
            <div className="flex items-center justify-between border-b pb-3">
                <p className="text-sm font-medium text-slate-900">Blendshapes</p>
                <p className="text-xs text-slate-500">{shapes.length ? `${shapes.length} Werte` : "Keine Daten"}</p>
            </div>

            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {shapes.map((shape, index) => (
                    <div key={`${shape.displayName || shape.categoryName || "shape"}-${index}`} className="rounded-2xl bg-white px-3 py-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-slate-700">{shape.displayName || shape.categoryName || "Unknown"}</span>
                            <span className="font-mono text-slate-500">{shape.score.toFixed(4)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-teal-600" style={{ width: scoreWidth(shape.score) }} />
                        </div>
                    </div>
                ))}

                {!shapes.length ? (
                    <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-slate-500">
                        Nach dem Start der Kamera erscheinen hier die Face-Blendshapes.
                    </div>
                ) : null}
            </div>
        </div>
    )
}

type FaceLandmarkPanelProps = {
    role?: string
    compact?: boolean
    minimal?: boolean
    showBlendShapes?: boolean
    title?: string
    description?: string
}

export type FaceLandmarkPanelHandle = {
    stopAndAnalyze: () => Promise<FaceAnalysisReport | null>
    isWebcamRunning: () => boolean
}

export const FaceLandmarkPanel = forwardRef<FaceLandmarkPanelHandle, FaceLandmarkPanelProps>(function FaceLandmarkPanel({
    role,
    compact = false,
    minimal = false,
    showBlendShapes = false,
    title = "Face Landmark",
    description = "Kamera aktivieren und Landmarken direkt im Video sehen.",
}: FaceLandmarkPanelProps, ref) {
    const videoWidth = compact ? 320 : 480

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const videoCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const webcamStreamRef = useRef<MediaStream | null>(null)
    const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null)
    const visionRef = useRef<VisionModule | null>(null)
    const webcamRunningRef = useRef(false)
    const lastVideoTimeRef = useRef(-1)
    const lastFaceLandmarksRef = useRef<FaceLandmarkPoint[][]>([])
    const lastBlendShapesRef = useRef<BlendShapeCategory[]>([])
    const lastDetectionAtRef = useRef(0)
    const lastMetricsSampleAtRef = useRef(0)
    const lastMetricsWriteAtRef = useRef(0)
    const allMetricsSamplesRef = useRef<FaceBodyLanguageSample[]>([])
    const recentMetricsSamplesRef = useRef<FaceBodyLanguageSample[]>([])
    const metricStateRef = useRef<FaceBodyMetricState>(createEmptyMetricState())
    const sessionExportSnapshotsRef = useRef<FaceLandmarkExportSnapshot[]>([])
    const sessionSnapshotCounterRef = useRef(0)

    const [modelStatus, setModelStatus] = useState<ModelStatus>("idle")
    const [modelError, setModelError] = useState("")
    const [webcamRunning, setWebcamRunning] = useState(false)
    const [webcamSupported, setWebcamSupported] = useState(false)
    const [cameraError, setCameraError] = useState("")
    const [videoBlendShapes, setVideoBlendShapes] = useState<BlendShapeCategory[]>([])
    const [exportSnapshotCount, setExportSnapshotCount] = useState(0)
    const [analysisStatus, setAnalysisStatus] = useState<FaceAnalysisRequestStatus>("idle")
    const [analysisError, setAnalysisError] = useState("")
    const [analysisReport, setAnalysisReport] = useState<FaceAnalysisReport | null>(null)

    const resetTrackingState = useCallback(() => {
        if (animationFrameRef.current !== null) {
            window.cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }

        for (const track of webcamStreamRef.current?.getTracks() ?? []) track.stop()
        webcamStreamRef.current = null

        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.srcObject = null
        }

        const canvas = videoCanvasRef.current
        const ctx = canvas?.getContext("2d")
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
        lastFaceLandmarksRef.current = []
        lastBlendShapesRef.current = []
        lastDetectionAtRef.current = 0
        metricStateRef.current = createEmptyMetricState()
        lastMetricsSampleAtRef.current = 0
        lastMetricsWriteAtRef.current = 0
        allMetricsSamplesRef.current = []
        recentMetricsSamplesRef.current = []
        sessionExportSnapshotsRef.current = []
        sessionSnapshotCounterRef.current = 0
        setVideoBlendShapes([])
        setExportSnapshotCount(0)
    }, [])

    const analyzeSession = useCallback(
        async (snapshots: FaceLandmarkExportSnapshot[]) => {
            if (snapshots.length === 0) return null

            setAnalysisStatus("analyzing")
            setAnalysisError("")
            setAnalysisReport(null)

            try {
                const response = await fetch("/api/simulate/face-analysis", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        role,
                        snapshots,
                    }),
                })
                const data = (await response.json()) as FaceAnalysisReport | { error?: string }

                if (!response.ok || !("overallScore" in data)) {
                    throw new Error(("error" in data && data.error) || "Face-Analyse fehlgeschlagen.")
                }

                setAnalysisReport(data)
                setAnalysisStatus("ready")
                return data
            } catch (error) {
                const message = error instanceof Error ? error.message : "Face-Analyse fehlgeschlagen."
                setAnalysisError(message)
                setAnalysisStatus("error")
                setAnalysisReport(null)
                return null
            }
        },
        [role]
    )

    const stopWebcam = useCallback(async (options?: { analyze?: boolean }) => {
        const shouldAnalyze = options?.analyze ?? true
        const snapshots = [...sessionExportSnapshotsRef.current]
        const allSamples = [...allMetricsSamplesRef.current]
        const recentSamples = [...recentMetricsSamplesRef.current]

        webcamRunningRef.current = false
        setWebcamRunning(false)

        if (allSamples.length > 0) {
            persistBodyLanguageSummary(
                summarizeBodyLanguageSamples({
                    allSamples,
                    recentSamples,
                    role,
                    webcamActive: false,
                })
            )
        } else {
            persistBodyLanguageSummary(createEmptyBodyLanguageSummary(role))
        }

        resetTrackingState()

        if (!shouldAnalyze || snapshots.length === 0) return null
        return analyzeSession(snapshots)
    }, [analyzeSession, resetTrackingState, role])

    useImperativeHandle(
        ref,
        () => ({
            stopAndAnalyze: async () => stopWebcam({ analyze: true }),
            isWebcamRunning: () => webcamRunningRef.current,
        }),
        [stopWebcam]
    )

    useEffect(() => {
        setWebcamSupported(typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia)
    }, [])

    useEffect(() => {
        const originalWarn = console.warn
        const originalError = console.error
        const originalInfo = console.info

        console.warn = (...args) => {
            if (shouldIgnoreMediapipeConsoleMessage(args)) return
            originalWarn(...args)
        }
        console.error = (...args) => {
            if (shouldIgnoreMediapipeConsoleMessage(args)) return
            originalError(...args)
        }
        console.info = (...args) => {
            if (shouldIgnoreMediapipeConsoleMessage(args)) return
            originalInfo(...args)
        }

        return () => {
            console.warn = originalWarn
            console.error = originalError
            console.info = originalInfo
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadModel() {
            setModelStatus("loading")
            setModelError("")

            try {
                const loadVisionModule = new Function(`return import("${VISION_BUNDLE_URL}")`) as () => Promise<VisionModule>
                const vision = await loadVisionModule()
                if (cancelled) return

                visionRef.current = vision
                const { FaceLandmarker, FilesetResolver } = vision
                const filesetResolver = await FilesetResolver.forVisionTasks(VISION_WASM_URL)
                if (cancelled) return

                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: MODEL_ASSET_URL,
                        delegate: "GPU",
                    },
                    outputFaceBlendshapes: showBlendShapes,
                    runningMode: "VIDEO",
                    numFaces: 1,
                })

                if (cancelled) {
                    faceLandmarkerRef.current?.close?.()
                    return
                }

                setModelStatus("ready")
            } catch (error) {
                if (cancelled) return
                setModelStatus("error")
                setModelError(error instanceof Error ? error.message : "MediaPipe Face Landmarker konnte nicht geladen werden.")
            }
        }

        void loadModel()

        return () => {
            cancelled = true
            void stopWebcam({ analyze: false })
            faceLandmarkerRef.current?.close?.()
            faceLandmarkerRef.current = null
        }
    }, [showBlendShapes, stopWebcam])

    const predictWebcam = useCallback(async function predictWebcamLoop() {
        const video = videoRef.current
        const canvas = videoCanvasRef.current
        const faceLandmarker = faceLandmarkerRef.current
        const vision = visionRef.current

        if (!webcamRunningRef.current || !video || !canvas || !faceLandmarker || !vision) return
        if (video.readyState < 2) {
            animationFrameRef.current = window.requestAnimationFrame(() => void predictWebcamLoop())
            return
        }

        const ratio = video.videoHeight / video.videoWidth || 0.75
        const targetWidthPx = `${videoWidth}px`
        const targetHeightPx = `${videoWidth * ratio}px`

        if (video.style.width !== targetWidthPx) video.style.width = targetWidthPx
        if (video.style.height !== targetHeightPx) video.style.height = targetHeightPx
        if (canvas.style.width !== targetWidthPx) canvas.style.width = targetWidthPx
        if (canvas.style.height !== targetHeightPx) canvas.style.height = targetHeightPx
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let result: FaceLandmarkerResult | null = null
        if (lastVideoTimeRef.current !== video.currentTime) {
            lastVideoTimeRef.current = video.currentTime
            result = faceLandmarker.detectForVideo(video, performance.now())
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.imageSmoothingEnabled = true

        const detectedLandmarks = result?.faceLandmarks ?? []
        const detectedBlendShapes = result?.faceBlendshapes?.[0]?.categories ?? []
        const now = performance.now()

        if (detectedLandmarks.length) {
            lastFaceLandmarksRef.current = detectedLandmarks
            lastDetectionAtRef.current = now
        }

        if (showBlendShapes && detectedBlendShapes.length) {
            lastBlendShapesRef.current = detectedBlendShapes
        }

        const effectiveLandmarks = resolveEffectiveLandmarks({
            detectedLandmarks,
            fallbackLandmarks: lastFaceLandmarksRef.current,
            now,
            lastDetectionAt: lastDetectionAtRef.current,
        })

        if (effectiveLandmarks.length) {
            const drawingUtils = new vision.DrawingUtils(ctx)
            for (const landmarks of effectiveLandmarks) {
                drawFaceConnectors(drawingUtils, vision.FaceLandmarker, landmarks)
            }
        }

        if (showBlendShapes) {
            setVideoBlendShapes(detectedBlendShapes.length ? detectedBlendShapes : lastBlendShapesRef.current)
        }

        if (now - lastMetricsSampleAtRef.current >= METRICS_SAMPLE_INTERVAL_MS) {
            const metricsLandmarks = effectiveLandmarks[0] ?? null
            const { sample, nextState } = computeBodyLanguageSample(metricsLandmarks, metricStateRef.current, Date.now())
            metricStateRef.current = nextState
            lastMetricsSampleAtRef.current = now

            allMetricsSamplesRef.current = [...allMetricsSamplesRef.current, sample]
            recentMetricsSamplesRef.current = keepRecentSamples([...recentMetricsSamplesRef.current, sample])
            sessionSnapshotCounterRef.current += 1
            sessionExportSnapshotsRef.current = [
                ...sessionExportSnapshotsRef.current,
                buildFaceLandmarkExportSnapshot({
                    snapshot: sessionSnapshotCounterRef.current,
                    role,
                    sample,
                }),
            ]
            setExportSnapshotCount(sessionExportSnapshotsRef.current.length)
        }

        if (now - lastMetricsWriteAtRef.current >= METRICS_WRITE_INTERVAL_MS) {
            lastMetricsWriteAtRef.current = now
            persistBodyLanguageSummary(
                summarizeBodyLanguageSamples({
                    allSamples: allMetricsSamplesRef.current,
                    recentSamples: recentMetricsSamplesRef.current,
                    role,
                    webcamActive: webcamRunningRef.current,
                })
            )
        }

        if (webcamRunningRef.current) {
            animationFrameRef.current = window.requestAnimationFrame(() => void predictWebcamLoop())
        }
    }, [role, showBlendShapes, videoWidth])

    const toggleWebcam = useCallback(async () => {
        if (webcamRunningRef.current) {
            await stopWebcam({ analyze: true })
            return
        }

        if (!faceLandmarkerRef.current) {
            setCameraError("Das Modell ist noch nicht bereit.")
            return
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("getUserMedia ist in diesem Browser oder Kontext nicht verfuegbar.")
            return
        }

        try {
            setCameraError("")
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            webcamStreamRef.current = stream
            sessionSnapshotCounterRef.current = 0
            sessionExportSnapshotsRef.current = []
            allMetricsSamplesRef.current = []
            recentMetricsSamplesRef.current = []
            metricStateRef.current = createEmptyMetricState()
            setExportSnapshotCount(0)
            setAnalysisStatus("idle")
            setAnalysisError("")
            setAnalysisReport(null)

            if (!videoRef.current) return

            videoRef.current.srcObject = stream
            await videoRef.current.play()

            webcamRunningRef.current = true
            setWebcamRunning(true)
            lastVideoTimeRef.current = -1
            animationFrameRef.current = window.requestAnimationFrame(() => void predictWebcam())
        } catch (error) {
            setCameraError(error instanceof Error ? error.message : "Kamera konnte nicht gestartet werden.")
        }
    }, [predictWebcam, stopWebcam])

    return (
        <section className={`rounded-[24px] border bg-white ${compact ? "p-4" : "p-6"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    {!minimal ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Face Landmark</p> : null}
                    <h2 className={`mt-1 font-semibold tracking-tight text-slate-950 ${compact ? "text-lg" : "text-2xl"}`}>{title}</h2>
                    {!minimal ? <p className={`mt-2 max-w-2xl text-slate-600 ${compact ? "text-sm" : "text-sm leading-6"}`}>{description}</p> : null}
                </div>

                <button
                    onClick={() => void toggleWebcam()}
                    disabled={modelStatus !== "ready" || !webcamSupported}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {webcamRunning ? "Kamera aus" : "Kamera an"}
                </button>
            </div>

            {!minimal ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    {role ? <span className="rounded-full border bg-slate-50 px-3 py-1.5">{role}</span> : null}
                    <span className="rounded-full border bg-slate-50 px-3 py-1.5">Modell: {modelStatus}</span>
                    <span className="rounded-full border bg-slate-50 px-3 py-1.5">Kamera: {webcamRunning ? "aktiv" : "aus"}</span>
                    <span className="rounded-full border bg-slate-50 px-3 py-1.5">Samples: {exportSnapshotCount}</span>
                </div>
            ) : null}

            {modelError ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{modelError}</div> : null}
            {cameraError ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{cameraError}</div> : null}
            {!webcamSupported ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Kamera funktioniert nur mit HTTPS oder localhost und aktiver Browser-Freigabe.
                </div>
            ) : null}

            <div className={`mt-4 ${showBlendShapes ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
                <div className="rounded-[20px] border bg-slate-950/95 p-3">
                    <div className="mx-auto w-full max-w-full">
                        <div className="relative mx-auto w-fit overflow-hidden rounded-[18px]">
                            <video ref={videoRef} autoPlay playsInline muted className="block max-w-full [transform:rotateY(180deg)]" />
                            <canvas ref={videoCanvasRef} className="pointer-events-none absolute left-0 top-0 [transform:rotateY(180deg)]" />
                        </div>
                    </div>
                </div>

                {showBlendShapes ? <BlendShapeList shapes={videoBlendShapes} /> : null}
            </div>

            <FaceAnalysisSummary report={analysisReport} status={analysisStatus} error={analysisError} minimal={minimal} />
        </section>
    )
})
