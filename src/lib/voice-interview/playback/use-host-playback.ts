"use client"

import { useCallback, useRef, useState, type MutableRefObject } from "react"
import { type Speaker } from "@/lib/interview-transcript"
import { decodePcm16, parseSampleRate } from "@/lib/audio"
import {
    HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS,
    type HostVoicePhrase,
} from "@/lib/voice-interview/playback/host-phrases"

type UseHostPlaybackArgs = {
    audioContextRef: MutableRefObject<AudioContext | null>
    recapMixDestinationRef: MutableRefObject<MediaStreamAudioDestinationNode | null>
    appendTranscript: (speaker: Speaker, text: string, options?: { mergeWithPrevious?: boolean }) => void
    markInterviewRecapCaptureGap: () => void
}

export function useHostPlayback({
                                    audioContextRef,
                                    recapMixDestinationRef,
                                    appendTranscript,
                                    markInterviewRecapCaptureGap,
                                }: UseHostPlaybackArgs) {
    // ----------------------------
    // Sichtbarer UI-State
    // ----------------------------

    /**
     * Zeigt der UI, ob gerade Host-Audio abgespielt wird.
     *
     * Das umfasst:
     * - feste Audio-Dateien
     * - SpeechSynthesis-Fallback
     * - gestreamte Audio-Chunks vom Modell
     */
    const [playbackActive, setPlaybackActive] = useState(false)

    // ----------------------------
    // Playback Runtime Refs
    // ----------------------------

    /**
     * Enthält aktuell geplante / laufende AudioBufferSourceNodes
     * für gestreamte Modell-Audio-Chunks.
     *
     * Wichtig:
     * AudioBufferSourceNodes kann man nicht wiederverwenden.
     * Jede Audio-Ausgabe braucht eine neue Source.
     */
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([])

    /**
     * Zeitpunkt, zu dem der nächste Audio-Chunk starten soll.
     *
     * Dadurch werden gestreamte Audio-Chunks sauber hintereinander geplant,
     * statt sich zu überlappen.
     */
    const nextPlaybackTimeRef = useRef(0)

    /**
     * Aktive Browser-SpeechSynthesis-Utterance.
     * Wird nur für den Fallback verwendet, wenn ein Host-Audio-Asset nicht lädt.
     */
    const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    /**
     * Aktive Audio-Source für feste Host-Phrasen.
     * Beispiel: Begrüßung oder erste Frage als lokales Asset.
     */
    const fixedPhraseSourceRef = useRef<AudioBufferSourceNode | null>(null)

    /**
     * Monoton steigende Playback-Sequenz.
     *
     * Zweck:
     * Wenn während eines alten Playback-Vorgangs ein neuer gestartet oder alles
     * gecancelt wird, können alte async callbacks erkennen, dass sie veraltet sind.
     */
    const hostPlaybackSequenceRef = useRef(0)

    // ----------------------------
    // Gemeinsamer Helper: Playback-Status beenden
    // ----------------------------

    /**
     * Setzt den sichtbaren Playback-State zurück.
     *
     * Kleine Hilfsfunktion, damit nicht überall direkt setPlaybackActive(false)
     * verstreut ist.
     */
    const markPlaybackInactive = useCallback(() => {
        setPlaybackActive(false)
    }, [])

    // ----------------------------
    // SpeechSynthesis-Fallback abbrechen
    // ----------------------------

    /**
     * Bricht laufende Browser-Sprachausgabe ab.
     *
     * Diese wird nur als Fallback verwendet, wenn das feste Audio-Asset
     * nicht geladen oder nicht abgespielt werden kann.
     */
    const cancelLocalSpeech = useCallback(() => {
        localSpeechUtteranceRef.current = null

        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            markPlaybackInactive()
            return
        }

        window.speechSynthesis.cancel()
        markPlaybackInactive()
    }, [markPlaybackInactive])

    // ----------------------------
    // Festes Host-Audio abbrechen
    // ----------------------------

    /**
     * Stoppt die aktuell laufende feste Host-Phrase.
     *
     * Beispiel:
     * - fixe Begrüßung
     * - fixe erste Frage
     */
    const cancelFixedPhraseAudio = useCallback(() => {
        const activeSource = fixedPhraseSourceRef.current
        fixedPhraseSourceRef.current = null

        if (!activeSource) {
            markPlaybackInactive()
            return
        }

        try {
            activeSource.onended = null
            activeSource.stop()
            activeSource.disconnect()
        } catch {
            /**
             * AudioBufferSourceNode.stop() kann werfen, wenn die Source schon
             * gestoppt wurde. Das ist hier unkritisch.
             */
        }

        markPlaybackInactive()
    }, [markPlaybackInactive])

    // ----------------------------
    // Alles Host-Playback abbrechen
    // ----------------------------

    /**
     * Bricht alle Host-Playback-Arten ab:
     * - feste Audio-Datei
     * - SpeechSynthesis-Fallback
     *
     * Außerdem wird die Playback-Sequenz erhöht, damit alte async callbacks
     * sich selbst als veraltet erkennen.
     */
    const cancelHostPlayback = useCallback(() => {
        hostPlaybackSequenceRef.current += 1
        cancelFixedPhraseAudio()
        cancelLocalSpeech()
    }, [cancelFixedPhraseAudio, cancelLocalSpeech])

    // ----------------------------
    // AudioNode an Output und Recap-Mix anschließen
    // ----------------------------

    /**
     * Verbindet eine Audioquelle:
     * 1. mit den Lautsprechern / Kopfhörern
     * 2. optional mit dem Recap-Mix, damit Host-Audio im Recap landet
     */
    const connectPlaybackSource = useCallback(
        (source: AudioNode, audioContext: AudioContext) => {
            source.connect(audioContext.destination)

            const recapMixDestination = recapMixDestinationRef.current
            if (recapMixDestination) {
                source.connect(recapMixDestination)
            }
        },
        [recapMixDestinationRef]
    )

    // ----------------------------
    // Fallback: Browser SpeechSynthesis
    // ----------------------------

    /**
     * Spielt Text mit Browser SpeechSynthesis ab.
     *
     * Rückgabe:
     * - true: Fallback wurde erfolgreich fertig abgespielt
     * - false: Fallback nicht verfügbar, abgebrochen oder Fehler
     *
     * playbackSequence verhindert, dass alte Playback-Vorgänge nach einem Cancel
     * noch fälschlich State ändern.
     */
    const playSpeechFallback = useCallback(
        (text: string, playbackSequence: number) =>
            new Promise<boolean>((resolve) => {
                if (typeof window === "undefined" || !("speechSynthesis" in window)) {
                    resolve(false)
                    return
                }

                window.speechSynthesis.cancel()

                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = "de-DE"
                utterance.rate = 1
                utterance.pitch = 1

                const finish = (result: boolean) => {
                    if (localSpeechUtteranceRef.current === utterance) {
                        localSpeechUtteranceRef.current = null
                    }

                    markPlaybackInactive()
                    resolve(result)
                }

                utterance.onstart = () => {
                    if (hostPlaybackSequenceRef.current !== playbackSequence) {
                        window.speechSynthesis.cancel()
                        finish(false)
                        return
                    }

                    /**
                     * Browser SpeechSynthesis lässt sich nicht sauber in den Recap-Mix
                     * einspeisen. Deshalb markieren wir hier bewusst eine Capture-Lücke.
                     */
                    markInterviewRecapCaptureGap()
                    setPlaybackActive(true)
                }

                utterance.onend = () => {
                    finish(hostPlaybackSequenceRef.current === playbackSequence)
                }

                utterance.onerror = () => {
                    finish(false)
                }

                localSpeechUtteranceRef.current = utterance
                window.speechSynthesis.speak(utterance)
            }),
        [markInterviewRecapCaptureGap, markPlaybackInactive]
    )

    // ----------------------------
    // Festes Host-Audio-Asset abspielen
    // ----------------------------

    /**
     * Lädt und spielt ein festes Host-Audio-Asset.
     *
     * Beispiel:
     * - Begrüßung als Audio-Datei
     * - erste Frage als Audio-Datei
     *
     * Rückgabe:
     * - true: Asset wurde erfolgreich abgespielt
     * - false: Asset konnte nicht geladen/abgespielt werden oder wurde abgebrochen
     */
    const playFixedPhraseAsset = useCallback(
        (assetPath: string, playbackSequence: number) =>
            new Promise<boolean>((resolve) => {
                const audioContext = audioContextRef.current

                if (typeof window === "undefined" || !audioContext) {
                    resolve(false)
                    return
                }

                let settled = false
                let source: AudioBufferSourceNode | null = null

                /**
                 * Wenn das Asset zu lange lädt, geben wir false zurück.
                 * Danach kann der SpeechSynthesis-Fallback übernehmen.
                 */
                const startTimeoutId = window.setTimeout(
                    () => finish(false),
                    HOST_ASSET_LOAD_FALLBACK_TIMEOUT_MS
                )

                const cleanup = () => {
                    window.clearTimeout(startTimeoutId)

                    if (!source) return

                    source.onended = null

                    if (fixedPhraseSourceRef.current === source) {
                        fixedPhraseSourceRef.current = null
                    }

                    try {
                        source.disconnect()
                    } catch {
                        /**
                         * Disconnect kann werfen, wenn die Source bereits getrennt wurde.
                         * Für Cleanup ist das unkritisch.
                         */
                    }
                }

                const finish = (result: boolean) => {
                    if (settled) return

                    settled = true
                    cleanup()
                    markPlaybackInactive()
                    resolve(result)
                }

                void (async () => {
                    try {
                        await audioContext.resume().catch(() => undefined)

                        const response = await fetch(assetPath, {
                            cache: "force-cache",
                        })

                        if (!response.ok || settled || hostPlaybackSequenceRef.current !== playbackSequence) {
                            finish(false)
                            return
                        }

                        const assetBytes = await response.arrayBuffer()

                        if (settled || hostPlaybackSequenceRef.current !== playbackSequence) {
                            finish(false)
                            return
                        }

                        /**
                         * slice(0) sorgt dafür, dass decodeAudioData eine eigene Kopie bekommt.
                         * Das ist browser-kompatibler, weil decodeAudioData den Buffer konsumieren kann.
                         */
                        const decodedBuffer = await audioContext.decodeAudioData(assetBytes.slice(0))

                        if (settled || hostPlaybackSequenceRef.current !== playbackSequence) {
                            finish(false)
                            return
                        }

                        source = audioContext.createBufferSource()
                        source.buffer = decodedBuffer
                        connectPlaybackSource(source, audioContext)

                        source.onended = () => {
                            finish(hostPlaybackSequenceRef.current === playbackSequence)
                        }

                        fixedPhraseSourceRef.current = source
                        setPlaybackActive(true)

                        window.clearTimeout(startTimeoutId)

                        /**
                         * Minimaler Start-Offset, damit AudioContext Scheduling stabil ist.
                         */
                        source.start(audioContext.currentTime + 0.01)
                    } catch (error) {
                        console.warn("Host asset playback failed:", assetPath, error)
                        finish(false)
                    }
                })()
            }),
        [audioContextRef, connectPlaybackSource, markPlaybackInactive]
    )

    // ----------------------------
    // Host-Phrase abspielen
    // ----------------------------

    /**
     * Spielt eine Host-Phrase ab.
     *
     * Ablauf:
     * 1. Text ins Transcript schreiben
     * 2. neue Playback-Sequenz starten
     * 3. zuerst festes Audio-Asset probieren
     * 4. falls Asset fehlschlägt: SpeechSynthesis-Fallback
     */
    const playHostPhrase = useCallback(
        async (phrase: HostVoicePhrase, options?: { appendTranscriptSpeaker?: Speaker }) => {
            const transcriptSpeaker = options?.appendTranscriptSpeaker ?? "interviewer"

            appendTranscript(transcriptSpeaker, phrase.text, {
                mergeWithPrevious: false,
            })

            const playbackSequence = hostPlaybackSequenceRef.current + 1
            hostPlaybackSequenceRef.current = playbackSequence

            const assetPlayed = await playFixedPhraseAsset(phrase.assetPath, playbackSequence)
            if (assetPlayed) return true

            if (hostPlaybackSequenceRef.current !== playbackSequence) {
                return false
            }

            return await playSpeechFallback(phrase.text, playbackSequence)
        },
        [appendTranscript, playFixedPhraseAsset, playSpeechFallback]
    )

    // ----------------------------
    // Gestreamtes Modell-Playback stoppen
    // ----------------------------

    /**
     * Stoppt alle geplanten / laufenden Audio-Chunks vom Modell.
     *
     * Das betrifft NICHT zwingend die festen Host-Phrasen,
     * sondern vor allem gestreamte Live-Antworten.
     */
    const stopScheduledPlayback = useCallback(() => {
        for (const source of scheduledSourcesRef.current) {
            try {
                source.stop()
            } catch {
                /**
                 * stop() kann werfen, wenn die Source schon beendet ist.
                 * Für einen Stop-All ist das unkritisch.
                 */
            }
        }

        scheduledSourcesRef.current = []
        markPlaybackInactive()
        nextPlaybackTimeRef.current = audioContextRef.current?.currentTime ?? 0
    }, [audioContextRef, markPlaybackInactive])

    // ----------------------------
    // Gestreamten Audio-Chunk abspielen
    // ----------------------------

    /**
     * Spielt einen einzelnen PCM16-Base64-Audiochunk ab.
     *
     * Ablauf:
     * 1. Sample Rate aus MIME-Type lesen
     * 2. Base64 PCM16 decodieren
     * 3. AudioBuffer erstellen
     * 4. Source erstellen
     * 5. Source sauber in die Playback Queue einplanen
     */
    const playAudioChunk = useCallback(
        (base64: string, mimeType?: string) => {
            const audioContext = audioContextRef.current
            if (!audioContext) return

            const sampleRate = parseSampleRate(mimeType)
            const samples = decodePcm16(base64)

            const audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate)
            audioBuffer.copyToChannel(samples, 0)

            const source = audioContext.createBufferSource()
            source.buffer = audioBuffer

            connectPlaybackSource(source, audioContext)

            /**
             * Audio-Chunks werden hintereinander geplant.
             * Dadurch entsteht ein flüssiger Stream statt überlappender Chunks.
             */
            const startTime = Math.max(
                audioContext.currentTime + 0.05,
                nextPlaybackTimeRef.current
            )

            source.start(startTime)
            setPlaybackActive(true)

            nextPlaybackTimeRef.current = startTime + audioBuffer.duration
            scheduledSourcesRef.current.push(source)

            source.onended = () => {
                scheduledSourcesRef.current = scheduledSourcesRef.current.filter(
                    (item) => item !== source
                )

                if (scheduledSourcesRef.current.length === 0) {
                    markPlaybackInactive()
                }
            }
        },
        [audioContextRef, connectPlaybackSource, markPlaybackInactive]
    )

    // ----------------------------
    // Statusabfrage für geplantes Playback
    // ----------------------------

    /**
     * Wird von der Endgame-/Lifecycle-Logik verwendet, um zu prüfen,
     * ob noch Modell-Audio geplant oder aktiv ist.
     */
    const hasScheduledPlayback = useCallback(() => {
        return scheduledSourcesRef.current.length > 0
    }, [])

    // ----------------------------
    // Öffentliche API des Hooks
    // ----------------------------

    return {
        playbackActive,
        cancelHostPlayback,
        playAudioChunk,
        playHostPhrase,
        stopScheduledPlayback,
        hasScheduledPlayback,
    }
}