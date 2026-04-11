export type FaceLandmarkExportSnapshot = {
    snapshot: number
    ts: number
    isoTime: string
    role: string | null
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

export type FaceAnalysisParameterKey =
    | "cameraPresence"
    | "frontalFocus"
    | "headStability"
    | "speakingPresence"
    | "blinkNaturalness"
    | "deliveryConsistency"

export type FaceAnalysisStatus = "strong" | "okay" | "watch" | "critical"
export type FaceAnalysisAlertType = "face-missing" | "off-center" | "high-movement" | "low-speaking"

export type FaceAnalysisWindow = {
    index: number
    startedAt: string
    endedAt: string
    durationMs: number
    sampleCount: number
    faceDetectedPct: number
    avgFrontalFacingScore: number
    avgHeadMovement: number
    avgHeadYawAbs: number
    avgHeadPitchAbs: number
    avgEyeOpenness: number
    avgMouthOpenness: number
    avgSpeakingLikelihood: number
    speakingActivityPct: number
    blinkCount: number
    blinkRatePerMin: number
    stableWindow: boolean
}

export type FaceAnalysisParameterReport = {
    key: FaceAnalysisParameterKey
    label: string
    score: number
    weight: number
    status: FaceAnalysisStatus
    value: number
    valueLabel: string
    summary: string
}

export type FaceAnalysisAlert = {
    type: FaceAnalysisAlertType
    severity: "medium" | "high"
    startedAt: string
    endedAt: string
    windowCount: number
    message: string
}

export type FaceAnalysisReport = {
    analysisVersion: string
    mode: "heuristic-coaching"
    role: string | null
    startedAt: string
    endedAt: string
    durationMs: number
    durationLabel: string
    sampleCount: number
    windowCount: number
    overallScore: number
    overallStatus: FaceAnalysisStatus
    globalMetrics: {
        faceDetectedPct: number
        avgFrontalFacingScore: number
        avgHeadMovement: number
        avgEyeOpenness: number
        avgMouthOpenness: number
        avgSpeakingLikelihood: number
        speakingActivityPct: number
        blinkCount: number
        blinkRatePerMin: number
        stableWindowPct: number
    }
    parameters: FaceAnalysisParameterReport[]
    alerts: FaceAnalysisAlert[]
    windows: FaceAnalysisWindow[]
    summary: {
        headline: string
        strengths: string[]
        risks: string[]
        nextSteps: string[]
    }
    limitations: string[]
}

type HigherBetterScoreConfig = {
    weight: number
    minimum: number
    target: number
}

type LowerBetterScoreConfig = {
    weight: number
    target: number
    maximum: number
}

type RangeScoreConfig = {
    weight: number
    minimum: number
    targetMin: number
    targetMax: number
    maximum: number
}

export type FaceAnalysisConfig = {
    windowMs: number
    speakingActiveThreshold: number
    stableWindow: {
        minFaceDetectedPct: number
        minFrontalFacingScore: number
        maxHeadMovement: number
    }
    alerts: {
        lowFaceDetectedPct: number
        lowFrontalFacingScore: number
        highHeadMovement: number
        lowSpeakingActivityPct: number
    }
    scoring: {
        cameraPresence: HigherBetterScoreConfig
        frontalFocus: HigherBetterScoreConfig
        headStability: LowerBetterScoreConfig
        speakingPresence: RangeScoreConfig
        blinkNaturalness: RangeScoreConfig
        deliveryConsistency: HigherBetterScoreConfig
    }
}

export const DEFAULT_FACE_ANALYSIS_CONFIG: FaceAnalysisConfig = {
    windowMs: 10_000,
    speakingActiveThreshold: 0.45,
    stableWindow: {
        minFaceDetectedPct: 0.85,
        minFrontalFacingScore: 0.65,
        maxHeadMovement: 0.08,
    },
    alerts: {
        lowFaceDetectedPct: 0.75,
        lowFrontalFacingScore: 0.55,
        highHeadMovement: 0.08,
        lowSpeakingActivityPct: 0.08,
    },
    scoring: {
        cameraPresence: {
            weight: 0.18,
            minimum: 0.65,
            target: 0.95,
        },
        frontalFocus: {
            weight: 0.22,
            minimum: 0.5,
            target: 0.85,
        },
        headStability: {
            weight: 0.18,
            target: 0.03,
            maximum: 0.12,
        },
        speakingPresence: {
            weight: 0.18,
            minimum: 0.05,
            targetMin: 0.18,
            targetMax: 0.75,
            maximum: 0.95,
        },
        blinkNaturalness: {
            weight: 0.08,
            minimum: 2,
            targetMin: 8,
            targetMax: 25,
            maximum: 45,
        },
        deliveryConsistency: {
            weight: 0.16,
            minimum: 0.35,
            target: 0.8,
        },
    },
}

type GlobalMetrics = FaceAnalysisReport["globalMetrics"]

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function round(value: number, decimals = 3) {
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
}

function average(values: number[]) {
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatPercent(value: number) {
    return `${round(value * 100, 1)}%`
}

function formatScore(value: number) {
    return `${round(value, 1)}/100`
}

function formatNumber(value: number, decimals = 2) {
    return `${round(value, decimals)}`
}

function formatDuration(durationMs: number) {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1_000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function toIso(ts: number) {
    return new Date(ts).toISOString()
}

function toStatus(score: number): FaceAnalysisStatus {
    if (score >= 80) return "strong"
    if (score >= 60) return "okay"
    if (score >= 40) return "watch"
    return "critical"
}

function scoreHigherBetter(value: number, config: HigherBetterScoreConfig) {
    if (value <= config.minimum) return 0
    if (value >= config.target) return 100
    return round(((value - config.minimum) / (config.target - config.minimum)) * 100, 1)
}

function scoreLowerBetter(value: number, config: LowerBetterScoreConfig) {
    if (value <= config.target) return 100
    if (value >= config.maximum) return 0
    return round(((config.maximum - value) / (config.maximum - config.target)) * 100, 1)
}

function scoreRangeOptimal(value: number, config: RangeScoreConfig) {
    if (value >= config.targetMin && value <= config.targetMax) return 100

    if (value < config.targetMin) {
        if (value <= config.minimum) return 0
        return round(((value - config.minimum) / (config.targetMin - config.minimum)) * 100, 1)
    }

    if (value >= config.maximum) return 0
    return round(((config.maximum - value) / (config.maximum - config.targetMax)) * 100, 1)
}

function countBlinks(samples: FaceLandmarkExportSnapshot[]) {
    let blinkCount = 0

    for (let index = 0; index < samples.length; index += 1) {
        const sample = samples[index]
        const previous = samples[index - 1]
        if (!sample.faceDetected || !sample.blink) continue
        if (!previous?.faceDetected || !previous.blink) blinkCount += 1
    }

    return blinkCount
}

function normalizeSnapshot(input: unknown, index: number): FaceLandmarkExportSnapshot {
    if (!input || typeof input !== "object") {
        throw new Error(`Snapshot ${index + 1} ist kein gueltiges Objekt.`)
    }

    const value = input as Record<string, unknown>
    const ts = Number(value.ts)
    if (!Number.isFinite(ts)) {
        throw new Error(`Snapshot ${index + 1} enthaelt keinen gueltigen Timestamp.`)
    }

    const snapshot = Number(value.snapshot)
    const isoTime = typeof value.isoTime === "string" && value.isoTime.trim() ? value.isoTime : toIso(ts)
    const role = typeof value.role === "string" && value.role.trim() ? value.role.trim() : null

    return {
        snapshot: Number.isFinite(snapshot) ? snapshot : index + 1,
        ts,
        isoTime,
        role,
        faceDetected: Boolean(value.faceDetected),
        frontalFacingScore: clamp(Number(value.frontalFacingScore) || 0, 0, 1),
        headYaw: Number(value.headYaw) || 0,
        headPitch: Number(value.headPitch) || 0,
        headMovement: Math.max(0, Number(value.headMovement) || 0),
        eyeOpenness: Math.max(0, Number(value.eyeOpenness) || 0),
        blink: Boolean(value.blink),
        mouthOpenness: Math.max(0, Number(value.mouthOpenness) || 0),
        speakingLikelihood: clamp(Number(value.speakingLikelihood) || 0, 0, 1),
    }
}

export function parseFaceLandmarkSnapshots(input: unknown) {
    if (!Array.isArray(input)) {
        throw new Error("Es wurde kein Snapshot-Array uebergeben.")
    }

    if (input.length === 0) {
        throw new Error("Das Snapshot-Array ist leer.")
    }

    return input
        .map((snapshot, index) => normalizeSnapshot(snapshot, index))
        .sort((left, right) => left.ts - right.ts || left.snapshot - right.snapshot)
}

export function parseFaceLandmarkTxt(content: string) {
    const trimmed = content.trim()
    if (!trimmed) throw new Error("Die TXT-Datei ist leer.")

    let parsed: unknown

    try {
        parsed = JSON.parse(trimmed)
    } catch {
        throw new Error("Der TXT-Export konnte nicht als JSON gelesen werden.")
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as { snapshots?: unknown }).snapshots)) {
        return parseFaceLandmarkSnapshots((parsed as { snapshots: unknown[] }).snapshots)
    }

    return parseFaceLandmarkSnapshots(parsed)
}

function summarizeWindow(args: {
    index: number
    samples: FaceLandmarkExportSnapshot[]
    startedAtTs: number
    endedAtTs: number
    config: FaceAnalysisConfig
}) {
    const { index, samples, startedAtTs, endedAtTs, config } = args
    const detectedSamples = samples.filter((sample) => sample.faceDetected)
    const durationMs = Math.max(1_000, endedAtTs - startedAtTs)
    const blinkCount = countBlinks(samples)
    const faceDetectedPct = detectedSamples.length / Math.max(1, samples.length)
    const avgFrontalFacingScore = average(detectedSamples.map((sample) => sample.frontalFacingScore))
    const avgHeadMovement = average(detectedSamples.map((sample) => sample.headMovement))
    const avgHeadYawAbs = average(detectedSamples.map((sample) => Math.abs(sample.headYaw)))
    const avgHeadPitchAbs = average(detectedSamples.map((sample) => Math.abs(sample.headPitch)))
    const avgEyeOpenness = average(detectedSamples.map((sample) => sample.eyeOpenness))
    const avgMouthOpenness = average(detectedSamples.map((sample) => sample.mouthOpenness))
    const avgSpeakingLikelihood = average(detectedSamples.map((sample) => sample.speakingLikelihood))
    const speakingActivityPct =
        detectedSamples.filter((sample) => sample.speakingLikelihood >= config.speakingActiveThreshold).length / Math.max(1, detectedSamples.length)
    const stableWindow =
        faceDetectedPct >= config.stableWindow.minFaceDetectedPct &&
        avgFrontalFacingScore >= config.stableWindow.minFrontalFacingScore &&
        avgHeadMovement <= config.stableWindow.maxHeadMovement

    return {
        index,
        startedAt: toIso(startedAtTs),
        endedAt: toIso(endedAtTs),
        durationMs,
        sampleCount: samples.length,
        faceDetectedPct: round(faceDetectedPct),
        avgFrontalFacingScore: round(avgFrontalFacingScore),
        avgHeadMovement: round(avgHeadMovement),
        avgHeadYawAbs: round(avgHeadYawAbs),
        avgHeadPitchAbs: round(avgHeadPitchAbs),
        avgEyeOpenness: round(avgEyeOpenness),
        avgMouthOpenness: round(avgMouthOpenness),
        avgSpeakingLikelihood: round(avgSpeakingLikelihood),
        speakingActivityPct: round(speakingActivityPct),
        blinkCount,
        blinkRatePerMin: round(blinkCount / (durationMs / 60_000), 2),
        stableWindow,
    } satisfies FaceAnalysisWindow
}

function buildWindows(snapshots: FaceLandmarkExportSnapshot[], config: FaceAnalysisConfig) {
    const startedAtTs = snapshots[0]?.ts ?? Date.now()
    const endedAtTs = snapshots[snapshots.length - 1]?.ts ?? startedAtTs
    const durationMs = Math.max(1, endedAtTs - startedAtTs)
    const windowCount = Math.max(1, Math.ceil(durationMs / config.windowMs))

    return Array.from({ length: windowCount }, (_, index) => {
        const windowStart = startedAtTs + index * config.windowMs
        const nextWindowStart = windowStart + config.windowMs
        const isLast = index === windowCount - 1
        const windowEnd = isLast ? endedAtTs : nextWindowStart
        const windowSamples = snapshots.filter((snapshot) =>
            isLast ? snapshot.ts >= windowStart && snapshot.ts <= windowEnd : snapshot.ts >= windowStart && snapshot.ts < windowEnd
        )

        return summarizeWindow({
            index,
            samples: windowSamples,
            startedAtTs: windowStart,
            endedAtTs: windowEnd,
            config,
        })
    })
}

function buildGlobalMetrics(snapshots: FaceLandmarkExportSnapshot[], windows: FaceAnalysisWindow[], config: FaceAnalysisConfig) {
    const detectedSamples = snapshots.filter((sample) => sample.faceDetected)
    const durationMs = Math.max(1_000, snapshots[snapshots.length - 1].ts - snapshots[0].ts)
    const blinkCount = countBlinks(snapshots)
    const stableWindowPct = windows.filter((window) => window.stableWindow).length / Math.max(1, windows.length)

    return {
        faceDetectedPct: round(detectedSamples.length / Math.max(1, snapshots.length)),
        avgFrontalFacingScore: round(average(detectedSamples.map((sample) => sample.frontalFacingScore))),
        avgHeadMovement: round(average(detectedSamples.map((sample) => sample.headMovement))),
        avgEyeOpenness: round(average(detectedSamples.map((sample) => sample.eyeOpenness))),
        avgMouthOpenness: round(average(detectedSamples.map((sample) => sample.mouthOpenness))),
        avgSpeakingLikelihood: round(average(detectedSamples.map((sample) => sample.speakingLikelihood))),
        speakingActivityPct: round(
            detectedSamples.filter((sample) => sample.speakingLikelihood >= config.speakingActiveThreshold).length /
                Math.max(1, detectedSamples.length)
        ),
        blinkCount,
        blinkRatePerMin: round(blinkCount / (durationMs / 60_000), 2),
        stableWindowPct: round(stableWindowPct),
    } satisfies GlobalMetrics
}

function createParameterReports(metrics: GlobalMetrics, config: FaceAnalysisConfig) {
    const reports: FaceAnalysisParameterReport[] = []

    const cameraPresenceScore = scoreHigherBetter(metrics.faceDetectedPct, config.scoring.cameraPresence)
    reports.push({
        key: "cameraPresence",
        label: "Kamera-Praesenz",
        score: cameraPresenceScore,
        weight: config.scoring.cameraPresence.weight,
        status: toStatus(cameraPresenceScore),
        value: metrics.faceDetectedPct,
        valueLabel: formatPercent(metrics.faceDetectedPct),
        summary: `Das Gesicht war in ${formatPercent(metrics.faceDetectedPct)} der Samples stabil erfasst.`,
    })

    const frontalFocusScore = scoreHigherBetter(metrics.avgFrontalFacingScore, config.scoring.frontalFocus)
    reports.push({
        key: "frontalFocus",
        label: "Frontaler Fokus",
        score: frontalFocusScore,
        weight: config.scoring.frontalFocus.weight,
        status: toStatus(frontalFocusScore),
        value: metrics.avgFrontalFacingScore,
        valueLabel: formatPercent(metrics.avgFrontalFacingScore),
        summary: `Der mittlere Frontalscore liegt bei ${formatPercent(metrics.avgFrontalFacingScore)}.`,
    })

    const headStabilityScore = scoreLowerBetter(metrics.avgHeadMovement, config.scoring.headStability)
    reports.push({
        key: "headStability",
        label: "Kopfstabilitaet",
        score: headStabilityScore,
        weight: config.scoring.headStability.weight,
        status: toStatus(headStabilityScore),
        value: metrics.avgHeadMovement,
        valueLabel: formatNumber(metrics.avgHeadMovement, 3),
        summary: `Die durchschnittliche Kopfbewegung liegt bei ${formatNumber(metrics.avgHeadMovement, 3)} pro Sample.`,
    })

    const speakingPresenceScore = scoreRangeOptimal(metrics.speakingActivityPct, config.scoring.speakingPresence)
    reports.push({
        key: "speakingPresence",
        label: "Sprechaktivitaet",
        score: speakingPresenceScore,
        weight: config.scoring.speakingPresence.weight,
        status: toStatus(speakingPresenceScore),
        value: metrics.speakingActivityPct,
        valueLabel: formatPercent(metrics.speakingActivityPct),
        summary: `Die Mimik zeigt in ${formatPercent(metrics.speakingActivityPct)} der erfassten Frames aktive Sprechbewegung.`,
    })

    const blinkNaturalnessScore = scoreRangeOptimal(metrics.blinkRatePerMin, config.scoring.blinkNaturalness)
    reports.push({
        key: "blinkNaturalness",
        label: "Blinkmuster",
        score: blinkNaturalnessScore,
        weight: config.scoring.blinkNaturalness.weight,
        status: toStatus(blinkNaturalnessScore),
        value: metrics.blinkRatePerMin,
        valueLabel: `${formatNumber(metrics.blinkRatePerMin, 1)}/min`,
        summary: `Die Blinkrate liegt bei ${formatNumber(metrics.blinkRatePerMin, 1)} pro Minute.`,
    })

    const consistencyScore = scoreHigherBetter(metrics.stableWindowPct, config.scoring.deliveryConsistency)
    reports.push({
        key: "deliveryConsistency",
        label: "Konsistenz",
        score: consistencyScore,
        weight: config.scoring.deliveryConsistency.weight,
        status: toStatus(consistencyScore),
        value: metrics.stableWindowPct,
        valueLabel: formatPercent(metrics.stableWindowPct),
        summary: `${formatPercent(metrics.stableWindowPct)} der Zeitfenster waren in Tracking, Fokus und Bewegung stabil.`,
    })

    return reports
}

function buildAlertMessage(type: FaceAnalysisAlertType, windowCount: number) {
    const spanLabel = windowCount === 1 ? "einem Zeitfenster" : `${windowCount} aufeinanderfolgenden Zeitfenstern`

    switch (type) {
        case "face-missing":
            return `Das Gesicht war in ${spanLabel} zu oft nicht sauber erfasst. Kamera, Licht und Framing pruefen.`
        case "off-center":
            return `Der Blick oder Kopf war in ${spanLabel} zu oft weg von der Kamera.`
        case "high-movement":
            return `Die Kopfbewegung war in ${spanLabel} deutlich zu hoch.`
        case "low-speaking":
            return `In ${spanLabel} wurde kaum aktive Sprechbewegung erkannt. Antworten oder Pausen dort gegenpruefen.`
    }
}

function groupWindowAlerts(args: {
    windows: FaceAnalysisWindow[]
    type: FaceAnalysisAlertType
    severity: "medium" | "high"
    predicate: (window: FaceAnalysisWindow) => boolean
}) {
    const alerts: FaceAnalysisAlert[] = []
    let activeStart: FaceAnalysisWindow | null = null
    let activeEnd: FaceAnalysisWindow | null = null
    let count = 0

    const flush = () => {
        if (!activeStart || !activeEnd || count === 0) return
        alerts.push({
            type: args.type,
            severity: count >= 2 ? "high" : args.severity,
            startedAt: activeStart.startedAt,
            endedAt: activeEnd.endedAt,
            windowCount: count,
            message: buildAlertMessage(args.type, count),
        })
        activeStart = null
        activeEnd = null
        count = 0
    }

    for (const window of args.windows) {
        if (args.predicate(window)) {
            activeStart ??= window
            activeEnd = window
            count += 1
            continue
        }

        flush()
    }

    flush()
    return alerts
}

function buildAlerts(windows: FaceAnalysisWindow[], config: FaceAnalysisConfig) {
    return [
        ...groupWindowAlerts({
            windows,
            type: "face-missing",
            severity: "medium",
            predicate: (window) => window.faceDetectedPct < config.alerts.lowFaceDetectedPct,
        }),
        ...groupWindowAlerts({
            windows,
            type: "off-center",
            severity: "medium",
            predicate: (window) => window.avgFrontalFacingScore < config.alerts.lowFrontalFacingScore,
        }),
        ...groupWindowAlerts({
            windows,
            type: "high-movement",
            severity: "medium",
            predicate: (window) => window.avgHeadMovement > config.alerts.highHeadMovement,
        }),
        ...groupWindowAlerts({
            windows,
            type: "low-speaking",
            severity: "medium",
            predicate: (window) => window.speakingActivityPct < config.alerts.lowSpeakingActivityPct,
        }),
    ]
}

function buildHeadline(score: number) {
    if (score >= 80) return "Solide Kamerapraesenz mit insgesamt ruhiger und konsistenter Delivery."
    if (score >= 60) return "In Summe stabil, aber mit einigen klaren Optimierungspunkten in der Delivery."
    if (score >= 40) return "Mehrere Signale sind inkonsistent und sollten vor dem naechsten Uebungsinterview gezielt verbessert werden."
    return "Die Session zeigt deutliche Tracking- oder Delivery-Probleme und braucht eine saubere Nachbearbeitung."
}

function buildStrengths(parameters: FaceAnalysisParameterReport[]) {
    return parameters
        .filter((parameter) => parameter.score >= 75)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((parameter) => `${parameter.label}: ${parameter.summary}`)
}

function buildRisks(parameters: FaceAnalysisParameterReport[]) {
    return parameters
        .filter((parameter) => parameter.score < 60)
        .sort((left, right) => left.score - right.score)
        .slice(0, 3)
        .map((parameter) => `${parameter.label}: ${parameter.summary}`)
}

function buildNextSteps(parameters: FaceAnalysisParameterReport[]) {
    const lowKeys = new Set(parameters.filter((parameter) => parameter.score < 60).map((parameter) => parameter.key))
    const nextSteps: string[] = []

    if (lowKeys.has("cameraPresence")) {
        nextSteps.push("Kamerahoehe, Licht und Sitzposition fixieren, damit das Gesicht dauerhaft sauber im Frame bleibt.")
    }
    if (lowKeys.has("frontalFocus")) {
        nextSteps.push("Antworten oefnen, waehrend der Blick stabiler zur Kamera gehalten wird und seitliche Kopfrotation sinkt.")
    }
    if (lowKeys.has("headStability")) {
        nextSteps.push("Bei laengeren Antworten ruhiger sitzen und Bewegungsdrang ueber Tisch, Stuhl und Haltung reduzieren.")
    }
    if (lowKeys.has("speakingPresence")) {
        nextSteps.push("Abschnitte mit wenig Sprechaktivitaet gegen das Transkript legen: zu lange Pausen, zu leise Stellen oder Tracking-Aussetzer pruefen.")
    }
    if (lowKeys.has("blinkNaturalness")) {
        nextSteps.push("Blinkmuster nur als schwaches Signal lesen und eher auf Stress, Trockenheit oder Setup-Probleme als auf Leistung schliessen.")
    }
    if (lowKeys.has("deliveryConsistency")) {
        nextSteps.push("Die markierten 10-Sekunden-Fenster isoliert wiederholen, statt nur auf den Gesamtscore zu schauen.")
    }

    return nextSteps.slice(0, 4)
}

export function analyzeFaceLandmarkSession(args: {
    snapshots: FaceLandmarkExportSnapshot[]
    role?: string | null
    config?: FaceAnalysisConfig
}) {
    const config = args.config ?? DEFAULT_FACE_ANALYSIS_CONFIG
    const snapshots = [...args.snapshots].sort((left, right) => left.ts - right.ts || left.snapshot - right.snapshot)

    if (snapshots.length === 0) {
        throw new Error("Es wurden keine Snapshots fuer die Analyse uebergeben.")
    }

    const windows = buildWindows(snapshots, config)
    const globalMetrics = buildGlobalMetrics(snapshots, windows, config)
    const parameters = createParameterReports(globalMetrics, config)
    const overallScore = round(
        parameters.reduce((sum, parameter) => sum + parameter.score * parameter.weight, 0) /
            Math.max(0.0001, parameters.reduce((sum, parameter) => sum + parameter.weight, 0)),
        1
    )
    const overallStatus = toStatus(overallScore)
    const alerts = buildAlerts(windows, config)
    const strengths = buildStrengths(parameters)
    const risks = buildRisks(parameters)
    const nextSteps = buildNextSteps(parameters)
    const startedAt = snapshots[0].isoTime || toIso(snapshots[0].ts)
    const endedAt = snapshots[snapshots.length - 1].isoTime || toIso(snapshots[snapshots.length - 1].ts)
    const durationMs = Math.max(0, snapshots[snapshots.length - 1].ts - snapshots[0].ts)

    return {
        analysisVersion: "face-analysis-v1",
        mode: "heuristic-coaching",
        role: args.role?.trim() || snapshots[0]?.role || null,
        startedAt,
        endedAt,
        durationMs,
        durationLabel: formatDuration(durationMs),
        sampleCount: snapshots.length,
        windowCount: windows.length,
        overallScore,
        overallStatus,
        globalMetrics,
        parameters,
        alerts,
        windows,
        summary: {
            headline: buildHeadline(overallScore),
            strengths: strengths.length > 0 ? strengths : [`Gesamtscore: ${formatScore(overallScore)}.`],
            risks: risks.length > 0 ? risks : ["Keine akuten Risikoparameter im aktuellen Regelset erkannt."],
            nextSteps: nextSteps.length > 0 ? nextSteps : ["Die Session mit dem Transkript koppeln und nur die markierten Zeitfenster manuell reviewen."],
        },
        limitations: [
            "Die Auswertung ist regelbasiert und dient nur als Coaching-Feedback fuer Uebungsinterviews.",
            "Face-Landmarks sind kein belastbarer Ersatz fuer menschliche Beurteilung und sollten nicht fuer automatische Hiring-Entscheidungen genutzt werden.",
            "Auffaelligkeiten koennen durch Licht, Kamera, Framing, Brille, Netzwerk oder Tracking-Artefakte entstehen.",
        ],
    } satisfies FaceAnalysisReport
}
