/**
 * Face Landmark Panel
 *
 * Webcam-based face tracking panel using MediaPipe FaceLandmarker.
 * Detects facial landmarks in real-time, computes body-language metrics
 * (head pose, eye openness, blink detection, speaking likelihood),
 * and sends collected snapshots to the face-analysis API on session stop.
 *
 * The heavy metric computation logic lives in `@/lib/face-metrics`;
 * this component handles the MediaPipe lifecycle, webcam stream,
 * canvas rendering, and the analysis UI.
 */

"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import type {
    FaceAnalysisParameterReport,
    FaceAnalysisReport,
    FaceAnalysisStatus as FaceScoreStatus,
    FaceLandmarkExportSnapshot,
} from "@/lib/face-analysis"
import {
    type BlendShapeCategory,
    type FaceBodyLanguageSample,
    type FaceBodyMetricState,
    type FaceLandmarkPoint,
    buildFaceLandmarkExportSnapshot,
    computeBodyLanguageSample,
    createEmptyBodyLanguageSummary,
    createEmptyMetricState,
    keepRecentSamples,
    METRICS_SAMPLE_INTERVAL_MS,
    METRICS_WRITE_INTERVAL_MS,
    persistBodyLanguageSummary,
    resolveEffectiveLandmarks,
    summarizeBodyLanguageSamples,
} from "@/lib/face-metrics"

// ---------------------------------------------------------------------------
// MediaPipe SDK types (typed locally to avoid bundling the full SDK)
// ---------------------------------------------------------------------------

type RunningMode = "IMAGE" | "VIDEO"
type ModelStatus = "idle" | "loading" | "ready" | "error"
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

// ---------------------------------------------------------------------------
// MediaPipe constants
// ---------------------------------------------------------------------------

const VISION_BUNDLE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3"
const VISION_WASM_URL = `${VISION_BUNDLE_URL}/wasm`
const MODEL_ASSET_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

/** Console noise patterns from MediaPipe that we suppress to keep DevTools clean. */
const MEDIAPIPE_NOISE_PATTERNS = [
    "face blendshape model contains cpu only ops",
    "gl version:",
    "opengl error checking is disabled",
    "graph successfully started running",
    "created tensorflow lite xnnpack delegate for cpu",
]

// ---------------------------------------------------------------------------
// Local types & helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Canvas drawing helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// UI helper functions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

            // Use push() instead of spread to avoid O(n) array copies in the hot rAF loop.
            allMetricsSamplesRef.current.push(sample)
            recentMetricsSamplesRef.current.push(sample)
            recentMetricsSamplesRef.current = keepRecentSamples(recentMetricsSamplesRef.current)
            sessionSnapshotCounterRef.current += 1
            sessionExportSnapshotsRef.current.push(
                buildFaceLandmarkExportSnapshot({
                    snapshot: sessionSnapshotCounterRef.current,
                    role,
                    sample,
                }),
            )
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
