/**
 * Face body-language metric computation for the webcam tracking loop.
 *
 * Face Tracking Flow:
 * 1. MediaPipe FaceLandmarker runs on each video frame via requestAnimationFrame.
 * 2. Detected landmarks are fed into `computeBodyLanguageSample()` which
 *    derives head pose, eye openness, blink detection, mouth openness,
 *    and a speaking-likelihood heuristic from geometric ratios.
 * 3. Samples are collected at ~120 ms intervals (METRICS_SAMPLE_INTERVAL_MS).
 * 4. A rolling summary is persisted to sessionStorage every ~1 s so that
 *    other parts of the app can read aggregated metrics without coupling.
 * 5. On session stop, all collected snapshots are sent to the face-analysis
 *    API for a full heuristic coaching report.
 *
 * Important assumptions:
 * - MediaPipe landmark indices follow the canonical 478-point mesh.
 * - All coordinates are normalized (0..1) relative to the video frame.
 * - The metric computation is intentionally simple (no ML model) and
 *   serves as coaching feedback, not as a hiring signal.
 */

import type { FaceLandmarkExportSnapshot } from "@/lib/face-analysis"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FaceLandmarkPoint = {
    x: number
    y: number
    z?: number
}

export type BlendShapeCategory = {
    displayName?: string
    categoryName?: string
    score: number
}

export type FaceBodyLanguageSample = {
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

export type FaceBodyMetricState = {
    previousNoseTip: FaceLandmarkPoint | null
    previousMouthOpenness: number | null
    previousSampleTs: number | null
    blinkActive: boolean
    invalidFrameCount: number
}

export type FaceBodyLanguageSummary = {
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

export type ComputeBodyLanguageResult = {
    sample: FaceBodyLanguageSample
    nextState: FaceBodyMetricState
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Session storage key for the face body-language metrics summary. */
export const FACE_BODY_LANGUAGE_STORAGE_KEY = "faceBodyLanguageMetrics"

/** Minimum interval between metric samples in the rAF loop (ms). */
export const METRICS_SAMPLE_INTERVAL_MS = 120

/** How often the rolling summary is written to sessionStorage (ms). */
export const METRICS_WRITE_INTERVAL_MS = 1_000

/** Maximum number of recent samples kept in the rolling window. */
export const METRICS_RECENT_SAMPLE_LIMIT = 180

/**
 * Grace period after the last successful detection before we drop
 * fallback landmarks. Prevents flicker during brief tracking losses.
 */
export const METRICS_FALLBACK_GRACE_MS = 450

/**
 * Number of consecutive invalid frames before we reset continuity
 * (nose-tip position, mouth openness delta, blink state).
 */
export const INVALID_STATE_PRESERVE_SAMPLES = 4

/** Eye openness below this triggers a blink (hysteresis low threshold). */
export const BLINK_CLOSE_THRESHOLD = 0.19

/** Eye openness must exceed this to end a blink (hysteresis high threshold). */
export const BLINK_OPEN_THRESHOLD = 0.245

/** Speaking-likelihood above this counts as "active speaking" in summaries. */
export const SPEAKING_ACTIVITY_THRESHOLD = 0.45

/**
 * Canonical MediaPipe face mesh landmark indices used for metric computation.
 * See https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 */
export const FACE_INDEX = {
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

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
}

export function safeRatio(numerator: number, denominator: number): number {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0
    return numerator / denominator
}

export function distance(a: FaceLandmarkPoint, b: FaceLandmarkPoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y)
}

export function averagePoint(points: FaceLandmarkPoint[]): { x: number; y: number; z: number } {
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

export function roundMetric(value: number, decimals = 3): number {
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function buildEmptyBodyLanguageSample(ts: number): FaceBodyLanguageSample {
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

export function createEmptyMetricState(): FaceBodyMetricState {
    return {
        previousNoseTip: null,
        previousMouthOpenness: null,
        previousSampleTs: null,
        blinkActive: false,
        invalidFrameCount: 0,
    }
}

export function createEmptyBodyLanguageSummary(role?: string): FaceBodyLanguageSummary {
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

// ---------------------------------------------------------------------------
// Snapshot & persistence helpers
// ---------------------------------------------------------------------------

export function buildFaceLandmarkExportSnapshot(args: {
    snapshot: number
    role?: string
    sample: FaceBodyLanguageSample
}): FaceLandmarkExportSnapshot {
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
    }
}

export function keepRecentSamples(samples: FaceBodyLanguageSample[]): FaceBodyLanguageSample[] {
    return samples.slice(-METRICS_RECENT_SAMPLE_LIMIT)
}

export function persistBodyLanguageSummary(summary: FaceBodyLanguageSummary): void {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(FACE_BODY_LANGUAGE_STORAGE_KEY, JSON.stringify(summary))
    if (process.env.NODE_ENV !== "production") {
        console.log("[faceBodyLanguageMetrics]", summary)
    }
}

// ---------------------------------------------------------------------------
// Landmark fallback resolution
// ---------------------------------------------------------------------------

/**
 * Use detected landmarks when available. If the face was lost very recently
 * (within METRICS_FALLBACK_GRACE_MS), reuse the last known landmarks to
 * prevent abrupt metric drops from brief tracking glitches.
 */
export function resolveEffectiveLandmarks(args: {
    detectedLandmarks: FaceLandmarkPoint[][]
    fallbackLandmarks: FaceLandmarkPoint[][]
    now: number
    lastDetectionAt: number
}): FaceLandmarkPoint[][] {
    if (args.detectedLandmarks.length > 0) return args.detectedLandmarks
    if (args.now - args.lastDetectionAt <= METRICS_FALLBACK_GRACE_MS) return args.fallbackLandmarks
    return []
}

// ---------------------------------------------------------------------------
// Invalid frame handling
// ---------------------------------------------------------------------------

/**
 * Build a metric result for frames where the face is not detected or
 * required landmarks are missing. Preserves continuity state for a
 * short grace period (INVALID_STATE_PRESERVE_SAMPLES) to avoid
 * resetting the blink/movement tracker on brief glitches.
 */
export function createInvalidMetricResult(
    metricState: FaceBodyMetricState,
    ts: number
): ComputeBodyLanguageResult {
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

// ---------------------------------------------------------------------------
// Core metric computation
// ---------------------------------------------------------------------------

/**
 * Compute a single body-language sample from face landmarks.
 *
 * Metrics derived:
 * - **frontalFacingScore**: How centered the face is relative to the camera.
 *   Penalizes yaw (left/right), pitch (up/down), and head movement.
 * - **headYaw / headPitch**: Nose-tip offset from face center, normalized
 *   by face width/height. Positive yaw = looking right, positive pitch = looking down.
 * - **headMovement**: Frame-to-frame nose-tip displacement, normalized by
 *   face width and time-corrected to account for variable frame intervals.
 * - **eyeOpenness**: Average of left/right eye aspect ratios.
 * - **blink**: Hysteresis-based blink detection (close < 0.19, open > 0.245).
 * - **mouthOpenness**: Vertical mouth distance / horizontal mouth width.
 * - **speakingLikelihood**: Weighted blend of mouth openness and mouth movement.
 */
export function computeBodyLanguageSample(
    landmarks: FaceLandmarkPoint[] | null,
    metricState: FaceBodyMetricState,
    ts: number
): ComputeBodyLanguageResult {
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

    // Geometric reference measurements (clamped to avoid division by zero)
    const faceCenter = averagePoint([leftCheek, rightCheek, forehead, chin])
    const faceWidth = Math.max(distance(leftCheek, rightCheek), 0.0001)
    const faceHeight = Math.max(distance(forehead, chin), 0.0001)
    const leftEyeWidth = Math.max(distance(leftEyeOuter, leftEyeInner), 0.0001)
    const rightEyeWidth = Math.max(distance(rightEyeOuter, rightEyeInner), 0.0001)
    const mouthWidth = Math.max(distance(mouthLeft, mouthRight), 0.0001)

    // Eye openness: vertical/horizontal aspect ratio, averaged across both eyes
    const leftEyeOpenness = safeRatio(distance(leftEyeUpper, leftEyeLower), leftEyeWidth)
    const rightEyeOpenness = safeRatio(distance(rightEyeUpper, rightEyeLower), rightEyeWidth)
    const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2

    // Blink detection with hysteresis to prevent rapid toggling
    const blink = metricState.blinkActive
        ? eyeOpenness < BLINK_OPEN_THRESHOLD
        : eyeOpenness < BLINK_CLOSE_THRESHOLD

    // Mouth metrics and speaking heuristic
    const mouthOpenness = safeRatio(distance(mouthUpper, mouthLower), mouthWidth)
    const mouthMovement = metricState.previousMouthOpenness === null
        ? 0
        : Math.abs(mouthOpenness - metricState.previousMouthOpenness)
    const mouthOpennessSignal = clamp01((mouthOpenness - 0.03) / 0.2)
    const mouthMovementSignal = clamp01(mouthMovement / 0.04)
    const speakingLikelihood = clamp01(mouthOpennessSignal * 0.65 + mouthMovementSignal * 0.35)

    // Head pose estimation (nose offset relative to face center)
    const headYaw = roundMetric((noseTip.x - faceCenter.x) / (faceWidth * 0.5))
    const headPitch = roundMetric((noseTip.y - faceCenter.y) / (faceHeight * 0.5))

    // Head movement: frame-to-frame displacement, time-normalized
    const sampleDeltaMs = metricState.previousSampleTs === null
        ? METRICS_SAMPLE_INTERVAL_MS
        : Math.max(1, ts - metricState.previousSampleTs)
    const movementTimeNormalization = Math.min(1.25, METRICS_SAMPLE_INTERVAL_MS / sampleDeltaMs)
    const headMovement = roundMetric(
        metricState.previousNoseTip
            ? safeRatio(distance(metricState.previousNoseTip, noseTip), faceWidth) * movementTimeNormalization
            : 0
    )

    // Composite frontal-facing score (higher = more centered and still)
    const frontalFacingScore = roundMetric(
        clamp01(1 - Math.abs(headYaw) * 0.85 - Math.abs(headPitch) * 0.65 - headMovement * 1.5)
    )

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

// ---------------------------------------------------------------------------
// Summary aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate all collected samples into a summary object.
 * Used both for the periodic sessionStorage writes and the final summary
 * when the webcam is stopped.
 */
export function summarizeBodyLanguageSamples(args: {
    allSamples: FaceBodyLanguageSample[]
    recentSamples: FaceBodyLanguageSample[]
    role?: string
    webcamActive?: boolean
}): FaceBodyLanguageSummary {
    const { allSamples, recentSamples, role, webcamActive = false } = args

    if (allSamples.length === 0) {
        const empty = createEmptyBodyLanguageSummary(role)
        return { ...empty, webcamActive }
    }

    const detectedSamples = allSamples.filter((sample) => sample.faceDetected)
    const totalDurationMs = allSamples.length > 1
        ? Math.max(1, allSamples[allSamples.length - 1].ts - allSamples[0].ts)
        : METRICS_SAMPLE_INTERVAL_MS
    const speakingSamples = detectedSamples.filter(
        (sample) => sample.speakingLikelihood >= SPEAKING_ACTIVITY_THRESHOLD
    )
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
            detectedSamples.reduce((sum, sample) => sum + sample.frontalFacingScore, 0) /
                Math.max(1, detectedSamples.length)
        ),
        avgHeadMovement: roundMetric(
            detectedSamples.reduce((sum, sample) => sum + sample.headMovement, 0) /
                Math.max(1, detectedSamples.length)
        ),
        blinkCount,
        blinkRatePerMin: roundMetric(blinkCount / (totalDurationMs / 60_000), 2),
        avgMouthOpenness: roundMetric(
            detectedSamples.reduce((sum, sample) => sum + sample.mouthOpenness, 0) /
                Math.max(1, detectedSamples.length)
        ),
        speakingActivityPct: roundMetric(speakingSamples.length / Math.max(1, detectedSamples.length)),
        current: allSamples[allSamples.length - 1] ?? null,
        recentSamples: recentSamples.length > 0 ? recentSamples : keepRecentSamples(allSamples),
    }
}
