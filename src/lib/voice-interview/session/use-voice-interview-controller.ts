"use client"

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import type { Session } from "@google/genai"
import type { FaceLandmarkPanelHandle } from "@/lib/face-landmark-panel-handle"
import { getInterviewQuestionPool } from "@/lib/questionpool"
import { useHostPlayback } from "@/lib/voice-interview/playback/use-host-playback"
import { CALL_DURATION_SECONDS } from "@/lib/voice-interview/core/config"
import type { CallLifecyclePhase, ConnectionStatus } from "@/lib/voice-interview/core/types"
import {
    type CallTiming,
    type InterviewEndgameState,
    type InterviewTurnState,
} from "@/lib/voice-interview/session/endgame"
import { useVoiceCapture } from "@/lib/voice-interview/session/use-voice-capture"
import { useVoiceEndgame } from "@/lib/voice-interview/session/use-voice-endgame"
import { useVoiceSessionLifecycle } from "@/lib/voice-interview/session/use-voice-session-lifecycle"
import { useVoiceTiming } from "@/lib/voice-interview/session/use-voice-timing"
import { useVoiceTranscript } from "@/lib/voice-interview/transcript/use-voice-transcript"

/**
 * Kleiner Alias für die Stop-Funktion.
 * Dadurch muss die lange Funktionssignatur nicht überall direkt im Code stehen.
 */
type StopCallFn = (
    options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }
) => Promise<void>

/**
 * Ref-Typ für die Stop-Funktion.
 * Die eigentliche Funktion wird später von der Lifecycle-Logik gesetzt.
 */
type StopCallRef = MutableRefObject<StopCallFn | null>

export function useVoiceInterviewController(
    role: string,
    questionPlanOverride?: ReturnType<typeof getInterviewQuestionPool>,
    interviewId?: string,
    interviewMode: "voice" | "face" = "face"
) {
    /**
     * Falls von außen ein fertiger Question Plan reinkommt, verwenden wir ihn.
     * Sonst erzeugen wir ihn aus der Rolle.
     */
    const questionPlan = questionPlanOverride ?? getInterviewQuestionPool(role)

    // ----------------------------
    // React State für UI-relevante Werte
    // ----------------------------

    /**
     * Sichtbarer Verbindungsstatus für die UI.
     * Beispiel: idle / connecting / connected / error
     */
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle")

    /**
     * Sichtbarer Fehlertext für die UI.
     */
    const [error, setError] = useState("")

    /**
     * Grobe Phase des Calls, z. B. idle / running / ending.
     * Wird für UI und Ablaufsteuerung verwendet.
     */
    const [callLifecyclePhase, setCallLifecyclePhase] = useState<CallLifecyclePhase>("idle")

    /**
     * Countdown-Anzeige für die verbleibende Gesprächsdauer.
     */
    const [secondsLeft, setSecondsLeft] = useState(CALL_DURATION_SECONDS)

    // ----------------------------
    // Refs: Realtime / Audio / Session
    // ----------------------------

    /**
     * Aktive Google GenAI Session.
     * useRef statt useState, weil Änderungen daran keine Re-Renders triggern sollen.
     */
    const sessionRef = useRef<Session | null>(null)

    /**
     * Zentrale AudioContext-Referenz für Playback / Audio-Verarbeitung.
     */
    const audioContextRef = useRef<AudioContext | null>(null)

    /**
     * Feingranularer Gesprächszustand:
     * z. B. ob gerade Frage, Antwort oder Übergang läuft.
     */
    const turnStateRef = useRef<InterviewTurnState>("between-questions")

    /**
     * Zustand für die Schlussphase des Interviews.
     * Beispiel: normal vs. Endgame / Abschlusslogik.
     */
    const endgameStateRef = useRef<InterviewEndgameState>("normal")

    /**
     * Zwischengespeicherter Kandidaten-Text, der noch nicht final ins Transcript geflusht wurde.
     */
    const pendingCandidateTranscriptRef = useRef("")

    /**
     * Zwischengespeicherter Interviewer-Text, der noch nicht final ins Transcript geflusht wurde.
     */
    const pendingInterviewerTranscriptRef = useRef("")

    /**
     * Signalisiert, ob der Kandidat gerade aktiv spricht.
     * Wird fürs Timing / Turn-Handling verwendet.
     */
    const candidateSpeechLiveRef = useRef(false)

    /**
     * Unterdrückt Kandidaten-Audio in bestimmten Phasen,
     * z. B. bei kontrollierten Übergängen oder Endgame.
     */
    const candidateAudioSuppressedRef = useRef(false)

    /**
     * Startzeitpunkt der finalen Antwortphase in Millisekunden.
     */
    const finalAnswerStartedAtMsRef = useRef<number | null>(null)

    /**
     * Schutz davor, Session-Shutdown mehrfach anzustoßen.
     */
    const sessionShutdownRequestedRef = useRef(false)

    /**
     * Ref auf die zentrale Stop-Funktion des Calls.
     * Wird später von Lifecycle/Endgame gesetzt und von anderen Teilen benutzt.
     */
    const stopCallRef: StopCallRef = useRef(null)

    /**
     * Ref-Version des Connection Status.
     * Praktisch für Logik, die immer den aktuellsten Wert braucht,
     * ohne auf React-Re-Renders zu warten.
     */
    const connectionStatusRef = useRef<ConnectionStatus>("idle")

    /**
     * Ref-Version der Lifecycle-Phase.
     */
    const callLifecyclePhaseRef = useRef<CallLifecyclePhase>("idle")

    /**
     * Schutz gegen doppelte parallele Start-Aufrufe.
     */
    const startCallInFlightRef = useRef(false)

    /**
     * Schutz gegen doppelte parallele Stop-Aufrufe.
     */
    const stopCallInFlightRef = useRef(false)

    /**
     * Sammelobjekt / Ref für Timing-Daten des Interviews.
     */
    const callTimingRef = useRef<CallTiming | null>(null)

    /**
     * Ref zur Face-Landmark-Komponente / Panel-API.
     * Wird vermutlich für Video-/Face-Analyse genutzt.
     */
    const faceLandmarkPanelRef = useRef<FaceLandmarkPanelHandle | null>(null)

    /**
     * "Brücken-Ref" zur aktuell aktiven Timing-TurnState-Handler-Funktion.
     * So kann updateTurnState immer die aktuellste Logik anstoßen.
     */
    const timingHandleTurnStateChangeRef = useRef<(nextState: InterviewTurnState) => void>(() => undefined)

    /**
     * "Brücken-Ref" für Audio-Chunks vom Kandidaten.
     * So können Capture und Timing entkoppelt werden.
     */
    const onCandidateAudioChunkRef = useRef<(input: Float32Array) => void>(() => undefined)

    // ----------------------------
    // Helper: State + Ref synchron halten
    // ----------------------------

    /**
     * Aktualisiert sowohl die Ref-Version als auch den React State.
     * Dadurch haben interne Logik und UI denselben Wert.
     */
    const updateConnectionStatus = useCallback((nextStatus: ConnectionStatus) => {
        connectionStatusRef.current = nextStatus
        setConnectionStatus(nextStatus)
    }, [])

    /**
     * Aktualisiert sowohl die Ref-Version als auch den React State
     * der Lifecycle-Phase.
     */
    const updateCallLifecyclePhase = useCallback((nextPhase: CallLifecyclePhase) => {
        callLifecyclePhaseRef.current = nextPhase
        setCallLifecyclePhase(nextPhase)
    }, [])

    /**
     * Aktualisiert den Turn-State.
     * Wichtig: zuerst wird die Timing-Logik informiert,
     * danach wird der aktuelle Turn-State in der Ref gesetzt.
     */
    const updateTurnState = useCallback((nextState: InterviewTurnState) => {
        timingHandleTurnStateChangeRef.current(nextState)
        turnStateRef.current = nextState
    }, [])

    // ----------------------------
    // Session sauber schließen
    // ----------------------------

    /**
     * Schließt die aktive Realtime-Session kontrolliert.
     *
     * Ablauf:
     * 1. Aktive Session holen
     * 2. sessionRef direkt leeren
     * 3. Doppel-Shutdown verhindern
     * 4. optional audioStreamEnd senden
     * 5. Session schließen
     *
     * Wichtig:
     * Diese Funktion ändert bewusst nicht die eigentliche Business-Logik,
     * sondern kapselt nur das Session-Close-Verhalten.
     */
    const closeRealtimeSession = useCallback((options?: { sendAudioStreamEnd?: boolean; markDetached?: boolean }) => {
        const activeSession = sessionRef.current
        sessionRef.current = null

        if (!activeSession || sessionShutdownRequestedRef.current) return
        sessionShutdownRequestedRef.current = true

        const websocket = (activeSession.conn as { ws?: WebSocket }).ws
        const canSendAudioStreamEnd =
            options?.sendAudioStreamEnd !== false && websocket?.readyState === WebSocket.OPEN

        if (canSendAudioStreamEnd) {
            try {
                activeSession.sendRealtimeInput({ audioStreamEnd: true })
            } catch {}
        }

        try {
            activeSession.close()
        } catch {}
    }, [])

    // ----------------------------
    // Transcript-Logik
    // ----------------------------

    /**
     * Verwaltet:
     * - Live Transcript
     * - Pending Transcript Buffers
     * - Post-Call Transcript
     * - Export / Persistenz
     */
    const transcript = useVoiceTranscript({
        interviewId,
        role,
        turnStateRef,
        endgameStateRef,
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        updateTurnState,
    })

    // ----------------------------
    // Capture-Logik
    // ----------------------------

    /**
     * Verwaltet:
     * - Mikrofon
     * - Aufnahme
     * - Recap-Recording
     * - Audio Pipeline Reset / Cleanup
     */
    const capture = useVoiceCapture({
        connectionStatusRef,
        candidateAudioSuppressedRef,
        onCandidateAudioChunk: (input) => onCandidateAudioChunkRef.current(input),
        onPostCallRecordingStarted: transcript.markPostCallRecordingStarted,
    })

    // ----------------------------
    // Playback-Logik
    // ----------------------------

    /**
     * Verwaltet:
     * - Host Audio Playback
     * - geplantes Playback
     * - Audio Chunk Ausgabe
     */
    const playback = useHostPlayback({
        audioContextRef,
        recapMixDestinationRef: capture.recapMixDestinationRef,
        appendTranscript: transcript.appendTranscript,
        markInterviewRecapCaptureGap: capture.markInterviewRecapCaptureGap,
    })

    // ----------------------------
    // Endgame-Logik
    // ----------------------------

    /**
     * Verwaltet die Schlussphase des Interviews:
     * - Graceful Stop
     * - final answer window
     * - Endgame Timer
     * - kontrolliertes Beenden
     */
    const endgame = useVoiceEndgame({
        callTimingRef,
        stopCallInFlightRef,
        stopCallRef,
        turnStateRef,
        endgameStateRef,
        finalAnswerStartedAtMsRef,
        candidateAudioSuppressedRef,
        candidateSpeechLiveRef,
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        updateTurnState,
        updateCallLifecyclePhase,
        closeRealtimeSession,
        hasScheduledPlayback: playback.hasScheduledPlayback,
        stopScheduledPlayback: playback.stopScheduledPlayback,
        cancelHostPlayback: playback.cancelHostPlayback,
        flushPendingTranscript: transcript.flushPendingTranscript,
        appendTranscript: transcript.appendTranscript,
        playHostPhrase: playback.playHostPhrase,
    })

    // ----------------------------
    // Timing-Logik
    // ----------------------------

    /**
     * Verwaltet:
     * - Antwortfenster
     * - Turn Timing
     * - Candidate speaking timing
     * - Timing-Metriken
     */
    const timing = useVoiceTiming({
        callLifecyclePhaseRef,
        turnStateRef,
        endgameStateRef,
        finalAnswerStartedAtMsRef,
        candidateSpeechLiveRef,
        candidateTranscriptWordSource: transcript.candidateTranscriptWordSource,
        updateTurnState,
        clearFinalAnswerStartTimer: endgame.clearFinalAnswerStartTimer,
        armFinalAnswerMaxTimer: endgame.armFinalAnswerMaxTimer,
        requestGracefulStop: endgame.requestGracefulStop,
    })

    // ----------------------------
    // Aktuelle Handler-Funktionen in Brücken-Refs spiegeln
    // ----------------------------

    /**
     * Diese Effect-Brücke stellt sicher, dass Capture/Timing immer
     * die neuesten Handler-Funktionen verwenden, ohne dass andere
     * Teile des Systems ständig neu verdrahtet werden müssen.
     */
    useEffect(() => {
        timingHandleTurnStateChangeRef.current = timing.handleTurnStateChange
        onCandidateAudioChunkRef.current = timing.handleCandidateAudioChunk
    }, [timing.handleCandidateAudioChunk, timing.handleTurnStateChange])

    // ----------------------------
    // Session-Lifecycle-Logik
    // ----------------------------

    /**
     * Das ist der zentrale Lifecycle-Hook für Start / Lauf / Ende der Session.
     * Er bekommt hier alle benötigten Dependencies injiziert:
     * - Refs
     * - State-Setter
     * - Transcript
     * - Capture
     * - Playback
     * - Timing
     * - Endgame
     *
     * Wichtig:
     * Wir ändern hier NICHT die Struktur der Props,
     * damit keine anderen Dateien angepasst werden müssen.
     */
    const { startCall } = useVoiceSessionLifecycle({
        role,
        questionPlan,
        faceAnalysisEnabled: interviewMode === "face",
        faceLandmarkPanelRef,
        sessionRef,
        audioContextRef,
        turnStateRef,
        endgameStateRef,
        candidateSpeechLiveRef,
        candidateAudioSuppressedRef,
        sessionShutdownRequestedRef,
        stopCallRef,
        callTimingRef,
        callLifecyclePhase,
        callLifecyclePhaseRef,
        startCallInFlightRef,
        stopCallInFlightRef,
        setError,
        setSecondsLeft,
        updateConnectionStatus,
        updateCallLifecyclePhase,
        updateTurnState,
        closeRealtimeSession,
        transcript: {
            pendingCandidateTranscriptRef,
            pendingInterviewerTranscriptRef,
            appendTranscript: transcript.appendTranscript,
            flushPendingTranscript: transcript.flushPendingTranscript,
            handleLiveTranscription: transcript.handleLiveTranscription,
            transcribeCandidateAudio: transcript.transcribeCandidateAudio,
            persistDraft: transcript.persistDraft,
            resetTranscriptState: transcript.reset,
            resetPendingTranscripts: transcript.resetPendingTranscripts,
            markPostCallTranscriptError: transcript.markPostCallTranscriptError,
        },
        capture: {
            recorderSupported: capture.recorderSupported,
            interviewRecapStatusRef: capture.interviewRecapStatusRef,
            clearInterviewRecap: capture.clearInterviewRecap,
            markInterviewRecapReady: capture.markInterviewRecapReady,
            markInterviewRecapError: capture.markInterviewRecapError,
            resetRealtimeAudioPipeline: capture.resetRealtimeAudioPipeline,
            startMicrophone: capture.startMicrophone,
            stopCandidateRecording: capture.stopCandidateRecording,
            stopInterviewRecapRecording: capture.stopInterviewRecapRecording,
            stopMicrophoneTracks: capture.stopMicrophoneTracks,
            cleanupCapture: capture.cleanupCapture,
        },
        playback: {
            cancelHostPlayback: playback.cancelHostPlayback,
            playAudioChunk: playback.playAudioChunk,
            playHostPhrase: playback.playHostPhrase,
            stopScheduledPlayback: playback.stopScheduledPlayback,
        },
        timing: {
            finalizeActiveCandidateAnswer: timing.finalizeActiveCandidateAnswer,
            resetRealtimeTimingState: timing.resetRealtimeTimingState,
            resetTiming: timing.resetTiming,
        },
        endgame: {
            realtimeSessionDetachedRef: endgame.realtimeSessionDetachedRef,
            clearClosingHardStopTimer: endgame.clearClosingHardStopTimer,
            clearEndgameTimers: endgame.clearEndgameTimers,
            beginLastMinuteLock: endgame.beginLastMinuteLock,
            detachForControlledEnding: endgame.detachForControlledEnding,
            armFinalAnswerWindow: endgame.armFinalAnswerWindow,
            requestGracefulStop: endgame.requestGracefulStop,
            resetClosingState: endgame.resetClosingState,
        },
    })

    // ----------------------------
    // Öffentliche API dieses Controller-Hooks
    // ----------------------------

    /**
     * Alles, was die konsumierende UI / Page / Komponente braucht.
     * Hier bleibt die bestehende API unverändert.
     */
    return {
        faceLandmarkPanelRef,

        connectionStatus,
        error,
        callLifecyclePhase,
        secondsLeft,

        microphoneSupported: capture.microphoneSupported,
        recorderSupported: capture.recorderSupported,
        interviewRecapUrl: capture.interviewRecapUrl,
        interviewRecapStatus: capture.interviewRecapStatus,
        interviewRecapError: capture.interviewRecapError,
        interviewRecapCaptureNote: capture.interviewRecapCaptureNote,

        playbackActive: playback.playbackActive,

        postCallCandidateTranscript: transcript.postCallCandidateTranscript,
        postCallTranscriptStatus: transcript.postCallTranscriptStatus,
        postCallTranscriptError: transcript.postCallTranscriptError,
        canExportTranscript: transcript.canExportTranscript,
        transcriptExport: transcript.transcriptExport,

        interviewTimingMetrics: timing.interviewTimingMetrics,
        hasTimingMetrics: timing.hasTimingMetrics,

        startCall,
        requestGracefulStop: endgame.requestGracefulStop,
        exportTranscriptAsTxt: transcript.exportTranscriptAsTxt,
    }
}
