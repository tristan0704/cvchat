"use client"

import { useCallback, useEffect } from "react"
import {
    ActivityHandling,
    EndSensitivity,
    GoogleGenAI,
    type LiveCallbacks,
    LiveServerMessage,
    MediaResolution,
    Modality,
    StartSensitivity,
    TurnCoverage,
} from "@google/genai"
import { mergeModelTurnText } from "@/lib/live-interviewer-turns"
import { resolveGreetingPhrase, resolveOpeningQuestionPhrase } from "@/lib/voice-interview/playback/host-phrases"
import { createCallTiming } from "@/lib/voice-interview/session/endgame"
import {
    CALL_DURATION_SECONDS,
    LIVE_INPUT_PREFIX_PADDING_MS,
    LIVE_INPUT_SILENCE_DURATION_MS,
    LIVE_MODEL,
    LIVE_VOICE,
} from "@/lib/voice-interview/core/config"
import type { ConnectionStatus, LiveTokenResponse } from "@/lib/voice-interview/core/types"
import type { UseVoiceSessionLifecycleArgs } from "@/lib/voice-interview/session/session-lifecycle-types"

export function useVoiceSessionLifecycle({
                                             role,
                                             questionPlan,
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
                                             transcript,
                                             capture,
                                             playback,
                                             timing,
                                             endgame,
                                         }: UseVoiceSessionLifecycleArgs) {
    // ----------------------------
    // Transcript-Dependencies entpacken
    // ----------------------------

    /**
     * Alles rund um Text / Transcript / Persistenz.
     * Wir destructuren das gleich am Anfang, damit der Rest des Hooks lesbarer ist.
     */
    const {
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        appendTranscript,
        flushPendingTranscript,
        handleLiveTranscription,
        transcribeCandidateAudio,
        persistDraft,
        resetTranscriptState,
        resetPendingTranscripts,
        markPostCallTranscriptError,
    } = transcript

    // ----------------------------
    // Capture-Dependencies entpacken
    // ----------------------------

    /**
     * Alles rund um Mikrofon / Recording / Cleanup von Audio-Capture.
     */
    const {
        recorderSupported,
        interviewRecapStatusRef,
        clearInterviewRecap,
        markInterviewRecapReady,
        markInterviewRecapError,
        resetRealtimeAudioPipeline,
        startMicrophone,
        stopCandidateRecording,
        stopInterviewRecapRecording,
        stopMicrophoneTracks,
        cleanupCapture,
    } = capture

    // ----------------------------
    // Playback-Dependencies entpacken
    // ----------------------------

    /**
     * Alles für Host-Audio und geplantes Playback.
     */
    const {
        cancelHostPlayback,
        playAudioChunk,
        playHostPhrase,
        stopScheduledPlayback,
    } = playback

    // ----------------------------
    // Timing-Dependencies entpacken
    // ----------------------------

    //
    /**
     * Alles für Timing-Zustände und Abschluss laufender Antworten.
     */
    const {
        finalizeActiveCandidateAnswer,
        resetRealtimeTimingState,
        resetTiming,
    } = timing

    // ----------------------------
    // Endgame-Dependencies entpacken
    // ----------------------------

    /**
     * Alles für Schlussphase / graceful stop / kontrolliertes Beenden.
     */
    const {
        realtimeSessionDetachedRef,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        beginLastMinuteLock,
        detachForControlledEnding,
        armFinalAnswerWindow,
        requestGracefulStop,
        resetClosingState,
    } = endgame

    // ----------------------------
    // Countdown synchronisieren
    // ----------------------------

    /**
     * Aktualisiert den sichtbaren Countdown basierend auf dem geplanten Endzeitpunkt.
     *
     * Falls noch kein Timing-Fenster aktiv ist, zeigen wir einfach die volle Dauer an.
     */
    const syncCountdown = useCallback(() => {
        const targetEndAtMs = callTimingRef.current?.targetEndAtMs

        if (!targetEndAtMs) {
            setSecondsLeft(CALL_DURATION_SECONDS)
            return
        }

        const remainingMs = Math.max(0, targetEndAtMs - Date.now())
        setSecondsLeft(Math.ceil(remainingMs / 1_000))
    }, [callTimingRef, setSecondsLeft])

    // ----------------------------
    // Gemeinsame Fehlerbehandlung beim Start
    // ----------------------------

    /**
     * Vereinheitlicht den typischen Fehlerpfad beim Start:
     * - laufenden Start sauber zurückbauen
     * - Status auf error setzen
     * - Fehlermeldung anzeigen
     */
    const failStart = useCallback(
        async (message: string) => {
            await stopCallRef.current?.()
            updateConnectionStatus("error")
            setError(message)
        },
        [setError, stopCallRef, updateConnectionStatus]
    )

    // ----------------------------
    // Server-Nachrichten der Live-Session verarbeiten
    // ----------------------------

    /**
     * Diese Funktion reagiert auf eingehende Events vom Live-Modell.
     *
     * Sie kümmert sich u. a. um:
     * - Unterbrechungen von Playback
     * - Input-/Output-Transkription
     * - Zusammenführen von Model-Turn-Text
     * - Audio-Playback der Modell-Antwort
     * - Turn-State-Wechsel
     * - Endgame-Trigger
     * - goAway / Session läuft aus
     */
    const handleServerMessage = useCallback((message: LiveServerMessage) => {
        // Wenn der Server signalisiert, dass eine laufende Ausgabe unterbrochen wurde,
        // stoppen wir geplantes Playback.
        if (message.serverContent?.interrupted) {
            stopScheduledPlayback()
        }

        // Live-Transkription des Kandidaten verarbeiten
        handleLiveTranscription(
            "candidate",
            message.serverContent?.inputTranscription?.text,
            message.serverContent?.inputTranscription?.finished
        )

        // Live-Transkription des Interviewers / Modells verarbeiten
        handleLiveTranscription(
            "interviewer",
            message.serverContent?.outputTranscription?.text,
            message.serverContent?.outputTranscription?.finished
        )

        /**
         * Falls keine direkte Output-Transkription kam, aber modelTurn parts vorhanden sind,
         * bauen wir daraus den Interviewer-Text zusammen.
         */
        const modelTurnParts = message.serverContent?.modelTurn?.parts ?? []

        if (!message.serverContent?.outputTranscription?.text && modelTurnParts.length) {
            // Falls noch Kandidaten-Text offen ist, zuerst flushen,
            // damit die Reihenfolge im Transcript sauber bleibt.
            if (pendingCandidateTranscriptRef.current) {
                flushPendingTranscript("candidate")
            }

            pendingInterviewerTranscriptRef.current = mergeModelTurnText(
                pendingInterviewerTranscriptRef.current,
                modelTurnParts
            )
        }

        // Sobald Modell-Teile eintreffen, gilt der Interviewer als sprechend.
        if (modelTurnParts.length) {
            updateTurnState("interviewer-speaking")
        }

        /**
         * Alle Audio-Parts des Modell-Turns abspielen,
         * außer wir sind schon im Closing / Stopping.
         */
        for (const part of modelTurnParts) {
            if (!part.inlineData?.data) continue
            if (callLifecyclePhaseRef.current === "closing" || callLifecyclePhaseRef.current === "stopping") continue

            playAudioChunk(part.inlineData.data, part.inlineData.mimeType)
        }

        /**
         * Wenn der Turn vollständig ist oder der Server wieder Input erwartet:
         * - beide Pending-Transcripts flushen
         * - Turn-State passend weiterdrehen
         */
        if (message.serverContent?.turnComplete || message.serverContent?.waitingForInput) {
            flushPendingTranscript("interviewer")
            flushPendingTranscript("candidate")

            if (turnStateRef.current === "interviewer-speaking") {
                updateTurnState("awaiting-candidate-answer")
            } else if (
                endgameStateRef.current === "normal" &&
                turnStateRef.current === "candidate-speaking" &&
                !candidateSpeechLiveRef.current
            ) {
                updateTurnState("between-questions")
            }
        }

        /**
         * Falls wir gerade im Zustand "finishing-current-question" sind und jetzt
         * die Kandidaten-Antwortphase beginnt, koppeln wir die Realtime-Session ab
         * und starten das kontrollierte Final-Answer-Fenster.
         */
        if (
            endgameStateRef.current === "finishing-current-question" &&
            turnStateRef.current === "awaiting-candidate-answer" &&
            !realtimeSessionDetachedRef.current
        ) {
            detachForControlledEnding()
            armFinalAnswerWindow({ candidateAlreadySpeaking: candidateSpeechLiveRef.current })
        }

        /**
         * Falls der Server signalisiert, dass die Session bald ausläuft,
         * zeigen wir einen Fehlerhinweis und stoßen einen graceful stop an.
         */
        if (message.goAway?.timeLeft) {
            setError(`Live-Session laeuft aus. Verbleibende Zeit: ${message.goAway.timeLeft}`)

            if (
                callLifecyclePhaseRef.current !== "closing" &&
                callLifecyclePhaseRef.current !== "stopping"
            ) {
                void requestGracefulStop("goAway")
            }
        }
    }, [
        callLifecyclePhaseRef,
        candidateSpeechLiveRef,
        endgameStateRef,
        armFinalAnswerWindow,
        detachForControlledEnding,
        flushPendingTranscript,
        handleLiveTranscription,
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        playAudioChunk,
        realtimeSessionDetachedRef,
        requestGracefulStop,
        setError,
        stopScheduledPlayback,
        turnStateRef,
        updateTurnState,
    ])

    // ----------------------------
    // Gemeinsamer Shutdown laufender Ressourcen
    // ----------------------------

    /**
     * Stoppt / schließt die aktiven Runtime-Ressourcen des Calls.
     *
     * Das ist KEIN kompletter Business-Reset, sondern der technische
     * Resource-Shutdown-Teil innerhalb von stopCall.
     */
    const shutdownRuntimeResources = useCallback(
        async (closeSession: boolean) => {
            if (closeSession) {
                closeRealtimeSession({ sendAudioStreamEnd: true })
            } else {
                sessionRef.current = null
            }

            resetRealtimeAudioPipeline()
            stopMicrophoneTracks()
            stopScheduledPlayback()

            if (audioContextRef.current) {
                await audioContextRef.current.close().catch(() => undefined)
            }

            audioContextRef.current = null
        },
        [
            audioContextRef,
            closeRealtimeSession,
            resetRealtimeAudioPipeline,
            sessionRef,
            stopMicrophoneTracks,
            stopScheduledPlayback,
        ]
    )

    // ----------------------------
    // Öffentliche Stop-Logik
    // ----------------------------

    /**
     * Zentrale Stop-Funktion des Calls.
     *
     * Aufgaben:
     * - parallele Stops verhindern
     * - Audio / Session beenden
     * - offene Transcripts sichern
     * - Draft persistieren
     * - Aufnahmen finalisieren
     * - States zurücksetzen
     * - Post-Call-Transkription anstoßen
     * - Face-Analyse abschließen
     */
    const stopCall = useCallback(async (options?: { terminalStatus?: ConnectionStatus; closeSession?: boolean }) => {
        if (stopCallInFlightRef.current) return

        stopCallInFlightRef.current = true

        const {
            terminalStatus = "idle",
            closeSession = true,
        } = options ?? {}

        updateCallLifecyclePhase("stopping")

        try {
            // Harte Endgame-Timer stoppen
            clearClosingHardStopTimer()

            // laufende Ausgabe / Playback anhalten
            cancelHostPlayback()

            // offene Textfragmente sichern
            flushPendingTranscript("candidate")
            flushPendingTranscript("interviewer")

            // falls gerade noch eine Kandidatenantwort "offen" ist, sauber abschließen
            finalizeActiveCandidateAnswer()

            // aktuellen Draft sichern
            persistDraft()

            /**
             * Aufnahmen beenden.
             * Fehler dabei sollen den gesamten Stop nicht crashen,
             * daher .catch(() => null).
             */
            const recordedAudioBlob = await stopCandidateRecording().catch(() => null)
            const interviewRecapBlob = await stopInterviewRecapRecording().catch(() => null)

            // technische Runtime-Ressourcen schließen
            await shutdownRuntimeResources(closeSession)

            // sichtbare UI-/Lifecycle-States zurücksetzen
            updateConnectionStatus(terminalStatus)
            updateCallLifecyclePhase("idle")
            callTimingRef.current = null
            setSecondsLeft(CALL_DURATION_SECONDS)

            // interne Endgame-/Timing-/Transcript-Zustände zurücksetzen
            clearEndgameTimers()
            resetClosingState(false)
            resetPendingTranscripts()
            resetRealtimeTimingState()

            // Start-Guard wieder freigeben
            startCallInFlightRef.current = false

            /**
             * Face-Analyse kann nach dem technischen Stop weiterlaufen.
             * Wir stoßen sie an, warten aber erst später darauf.
             */
            const faceAnalysisPromise = faceLandmarkPanelRef.current?.stopAndAnalyze().catch(() => null)

            /**
             * Falls ein komplettes Interview-Recap vorhanden ist, erzeugen wir eine URL.
             * Sonst markieren wir einen Fehler, wenn eigentlich eine Aufnahme lief.
             */
            if (interviewRecapBlob && interviewRecapBlob.size > 0) {
                markInterviewRecapReady(URL.createObjectURL(interviewRecapBlob))
            } else if (interviewRecapStatusRef.current === "recording") {
                markInterviewRecapError("Das komplette Interview konnte nicht als Recap-Datei gespeichert werden.")
            }

            /**
             * Falls ein Kandidaten-Audio-Blob vorliegt, starten wir die
             * Post-Call-Transkription.
             */
            if (recordedAudioBlob && recordedAudioBlob.size > 0) {
                const transcriptionResult = await transcribeCandidateAudio(recordedAudioBlob)

                if (!transcriptionResult.ok) {
                    const message = transcriptionResult.error

                    markPostCallTranscriptError(message)
                    persistDraft({
                        postCallTranscriptStatus: "error",
                        postCallTranscriptError: message,
                    })
                }
            }

            // Falls Face-Analyse läuft, hier sauber abwarten
            await faceAnalysisPromise
        } finally {
            stopCallInFlightRef.current = false
        }
    }, [
        callTimingRef,
        faceLandmarkPanelRef,
        setSecondsLeft,
        startCallInFlightRef,
        stopCallInFlightRef,
        cancelHostPlayback,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        finalizeActiveCandidateAnswer,
        flushPendingTranscript,
        interviewRecapStatusRef,
        markInterviewRecapError,
        markInterviewRecapReady,
        markPostCallTranscriptError,
        persistDraft,
        resetClosingState,
        resetPendingTranscripts,
        resetRealtimeTimingState,
        shutdownRuntimeResources,
        stopCandidateRecording,
        stopInterviewRecapRecording,
        transcribeCandidateAudio,
        updateCallLifecyclePhase,
        updateConnectionStatus,
    ])

    /**
     * Die Stop-Funktion wird in eine Ref gespiegelt,
     * damit andere Teile des Systems immer die aktuelle Version aufrufen können.
     */
    stopCallRef.current = stopCall

    // ----------------------------
    // Cleanup beim Unmount
    // ----------------------------

    /**
     * Falls die Komponente unmountet, räumen wir möglichst defensiv alles auf:
     * - Timer
     * - Playback
     * - Realtime-Session
     * - Capture
     * - AudioContext
     */
    useEffect(() => {
        return () => {
            clearClosingHardStopTimer()
            clearEndgameTimers()
            cancelHostPlayback()
            closeRealtimeSession({ sendAudioStreamEnd: true })
            cleanupCapture()
            stopScheduledPlayback()

            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                void audioContextRef.current.close().catch(() => undefined)
            }
        }
    }, [
        audioContextRef,
        cancelHostPlayback,
        cleanupCapture,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        closeRealtimeSession,
        stopScheduledPlayback,
    ])

    // ----------------------------
    // Countdown- / Hard-Stop-Überwachung
    // ----------------------------

    /**
     * Solange wir im eigentlichen Interview sind:
     * - Countdown synchronisieren
     * - Hard Stop überwachen
     * - Last-Minute-Lock aktivieren
     *
     * Hinweis:
     * Das Original lief alle 250ms.
     * Für einen sicheren Cleanup lasse ich das bewusst gleich,
     * damit wir das Verhalten nicht unbeabsichtigt verändern.
     */
    useEffect(() => {
        if (callLifecyclePhase !== "interviewing") return

        syncCountdown()

        const intervalId = window.setInterval(() => {
            syncCountdown()

            const timingWindow = callTimingRef.current
            if (!timingWindow) return

            const now = Date.now()

            if (now >= timingWindow.absoluteHardStopAtMs) {
                void requestGracefulStop("timer")
                return
            }

            if (
                endgameStateRef.current === "normal" &&
                now >= timingWindow.lastMinuteAtMs
            ) {
                beginLastMinuteLock()
            }
        }, 250)

        return () => window.clearInterval(intervalId)
    }, [
        beginLastMinuteLock,
        callLifecyclePhase,
        callTimingRef,
        endgameStateRef,
        requestGracefulStop,
        syncCountdown,
    ])

    // ----------------------------
    // Start-Vorbedingungen prüfen
    // ----------------------------

    /**
     * Prüft Browser-/Runtime-Voraussetzungen für den Call-Start.
     * Gibt einen Fehlertext zurück, falls etwas fehlt, sonst einen leeren String.
     */
    const getStartValidationError = useCallback(() => {
        if (!window.isSecureContext) {
            return "Mikrofonzugriff funktioniert nur auf localhost oder HTTPS."
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            return "Dieser Browser stellt keine getUserMedia-API bereit."
        }

        if (!recorderSupported) {
            return "MediaRecorder ist fuer diese Aufnahme-Konfiguration nicht verfuegbar."
        }

        return ""
    }, [recorderSupported])

    // ----------------------------
    // Live-Token laden
    // ----------------------------

    /**
     * Holt das Live-Token vom Backend.
     * Wir kapseln das in eine kleine Hilfsfunktion, damit startCall lesbarer wird.
     */
    const fetchLiveToken = useCallback(async () => {
        const tokenResponse = await fetch("/api/gemini/live-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
        })

        const tokenData = (await tokenResponse.json()) as Partial<LiveTokenResponse> & { error?: string }

        if (!tokenResponse.ok || !tokenData.token) {
            throw new Error(tokenData.error || "Live-Token konnte nicht erstellt werden.")
        }

        return tokenData
    }, [role])

    // ----------------------------
    // Live-Session verbinden
    // ----------------------------

    /**
     * Baut GenAI Client + Live-Callbacks + Session-Verbindung auf.
     */
    const connectLiveSession = useCallback(async (tokenData: Partial<LiveTokenResponse>) => {
        const ai = new GoogleGenAI({
            apiKey: tokenData.token,
            httpOptions: { apiVersion: "v1alpha" },
        })

        const liveCallbacks: LiveCallbacks = {
            onopen: () => updateConnectionStatus("connected"),
            onmessage: (message: LiveServerMessage) => handleServerMessage(message),
            onerror: (event: ErrorEvent) => {
                setError(event.message || "Fehler in der Live-Session.")
                void requestGracefulStop("technicalError")
            },
            onclose: () => {
                if (realtimeSessionDetachedRef.current) return
                if (stopCallInFlightRef.current) return

                void requestGracefulStop("technicalError")
            },
        }

        return ai.live.connect({
            model: tokenData.model || LIVE_MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
                realtimeInputConfig: {
                    activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
                    turnCoverage: TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
                    automaticActivityDetection: {
                        startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
                        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
                        prefixPaddingMs: LIVE_INPUT_PREFIX_PADDING_MS,
                        silenceDurationMs: LIVE_INPUT_SILENCE_DURATION_MS,
                    },
                },
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: tokenData.voiceName || LIVE_VOICE,
                        },
                    },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: liveCallbacks,
        })
    }, [
        handleServerMessage,
        realtimeSessionDetachedRef,
        requestGracefulStop,
        setError,
        stopCallInFlightRef,
        updateConnectionStatus,
    ])

    // ----------------------------
    // Interview-Eröffnung vorbereiten
    // ----------------------------

    /**
     * Baut den Fragekontext für den System-Transcript.
     */
    const buildPlannedQuestionContext = useCallback(() => {
        return questionPlan
            .map((question, index) => `${index + 1}. ${question.text}`)
            .join(" ")
    }, [questionPlan])

    /**
     * Führt Intro + erste Frage aus.
     *
     * Rückgabewert:
     * - true = Eröffnung erfolgreich
     * - false = feste erste Frage konnte nicht abgespielt werden
     */
    const runInterviewOpening = useCallback(async () => {
        const plannedQuestionContext = buildPlannedQuestionContext()
        const openingQuestionPhrase = resolveOpeningQuestionPhrase(role)

        appendTranscript("system", `Interviewrahmen fuer ${role}: ${plannedQuestionContext}`)

        const greetingPlayed = await playHostPhrase(resolveGreetingPhrase(role), {
            appendTranscriptSpeaker: "system",
        })

        if (!greetingPlayed) {
            appendTranscript(
                "system",
                "Die feste Begrüssung konnte lokal nicht abgespielt werden. Das Interview startet ohne Intro."
            )
            console.warn("Greeting playback failed. Continuing with opening question.")
        }

        updateTurnState("interviewer-speaking")

        const openingQuestionPlayed = await playHostPhrase(openingQuestionPhrase)
        if (!openingQuestionPlayed) {
            return {
                ok: false as const,
                error: "Die feste erste Frage konnte nicht abgespielt werden.",
            }
        }

        return {
            ok: true as const,
            openingQuestionPhrase,
        }
    }, [
        appendTranscript,
        buildPlannedQuestionContext,
        playHostPhrase,
        role,
        updateTurnState,
    ])

    // ----------------------------
    // Öffentliche Start-Logik
    // ----------------------------

    /**
     * Startet den kompletten Voice-Call.
     *
     * Ablauf grob:
     * 1. Guards / Reset / UI vorbereiten
     * 2. Start-Voraussetzungen prüfen
     * 3. AudioContext anlegen
     * 4. Token holen
     * 5. Live-Session verbinden
     * 6. Mikrofon starten
     * 7. Intro + erste Frage abspielen
     * 8. Timing aktivieren
     * 9. Session in Interviewing-Zustand bringen
     */
    const startCall = useCallback(async () => {
        if (startCallInFlightRef.current || callLifecyclePhaseRef.current !== "idle") return

        startCallInFlightRef.current = true

        // Vorherigen Zustand aufräumen / zurücksetzen
        clearInterviewRecap()
        setError("")
        resetTranscriptState()
        resetTiming()
        sessionShutdownRequestedRef.current = false
        updateCallLifecyclePhase("opening")
        setSecondsLeft(CALL_DURATION_SECONDS)
        resetClosingState(true)
        callTimingRef.current = null
        clearClosingHardStopTimer()
        clearEndgameTimers()
        cancelHostPlayback()
        updateConnectionStatus("connecting")

        try {
            // Browser-/Runtime-Vorbedingungen prüfen
            const startValidationError = getStartValidationError()
            if (startValidationError) {
                await failStart(startValidationError)
                return
            }

            // AudioContext initialisieren
            const audioContext = new AudioContext()
            audioContextRef.current = audioContext
            await audioContext.resume().catch(() => undefined)

            // Live-Token laden
            const tokenData = await fetchLiveToken()

            // Realtime-Session aufbauen
            const session = await connectLiveSession(tokenData)
            sessionRef.current = session

            // Mikrofon starten
            const microphoneStartResult = await startMicrophone(audioContext, session)
            if (!microphoneStartResult.ok) {
                await failStart(microphoneStartResult.error)
                return
            }

            // Intro + erste Frage abspielen
            const openingResult = await runInterviewOpening()
            if (!openingResult.ok) {
                await failStart(openingResult.error)
                return
            }

            // Timing starten
            callTimingRef.current = createCallTiming()
            syncCountdown()

            /**
             * Dem Modell die Eröffnungsfrage als bereits laufenden Modell-Turn geben,
             * damit die nachfolgende Gesprächslogik sauber anschließt.
             */
            session.sendClientContent({
                turns: [
                    {
                        role: "model",
                        parts: [
                            {
                                text: openingResult.openingQuestionPhrase.text,
                            },
                        ],
                    },
                ],
                turnComplete: false,
            })

            // Gespräch offiziell in den Interviewing-Zustand bringen
            candidateAudioSuppressedRef.current = false
            updateCallLifecyclePhase("interviewing")
            updateTurnState("awaiting-candidate-answer")
        } catch (startError) {
            await failStart(
                startError instanceof Error
                    ? startError.message
                    : "Voice-Call konnte nicht gestartet werden."
            )
        } finally {
            startCallInFlightRef.current = false
        }
    }, [
        audioContextRef,
        callLifecyclePhaseRef,
        callTimingRef,
        candidateAudioSuppressedRef,
        cancelHostPlayback,
        clearClosingHardStopTimer,
        clearEndgameTimers,
        clearInterviewRecap,
        connectLiveSession,
        failStart,
        fetchLiveToken,
        getStartValidationError,
        role,
        sessionRef,
        sessionShutdownRequestedRef,
        setError,
        setSecondsLeft,
        startCallInFlightRef,
        startMicrophone,
        syncCountdown,
        resetClosingState,
        resetTiming,
        resetTranscriptState,
        runInterviewOpening,
        updateCallLifecyclePhase,
        updateConnectionStatus,
        updateTurnState,
    ])

    return {
        startCall,
        stopCall,
    }
}