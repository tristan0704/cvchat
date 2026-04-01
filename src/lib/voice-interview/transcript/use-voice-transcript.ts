"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import { mergeStreamingTurnText } from "@/lib/live-interviewer-turns"
import {
    buildTranscriptQaExport,
    buildTranscriptQaPairs,
    extractInterviewerQuestions,
    normalizeTranscriptQaPairs,
    normalizeTranscriptText,
    persistVoiceFeedbackDraft,
    type PostCallTranscriptStatus,
    type Speaker,
    type TranscriptEntry,
    type TranscriptQaPair,
} from "@/lib/interview-transcript"
import type { AsyncResult } from "@/lib/voice-interview/core/types"
import type { InterviewEndgameState, InterviewTurnState } from "@/lib/voice-interview/session/endgame"

type UseVoiceTranscriptArgs = {
    role: string
    turnStateRef: MutableRefObject<InterviewTurnState>
    endgameStateRef: MutableRefObject<InterviewEndgameState>
    pendingCandidateTranscriptRef: MutableRefObject<string>
    pendingInterviewerTranscriptRef: MutableRefObject<string>
    updateTurnState: (nextState: InterviewTurnState) => void
}

type PersistDraftOverrides = {
    transcriptEntries?: TranscriptEntry[]
    postCallCandidateTranscript?: string
    mappedTranscriptQaPairs?: TranscriptQaPair[]
    postCallTranscriptStatus?: PostCallTranscriptStatus
    postCallTranscriptError?: string
}

export function useVoiceTranscript({
    role,
    turnStateRef,
    endgameStateRef,
    pendingCandidateTranscriptRef,
    pendingInterviewerTranscriptRef,
    updateTurnState,
}: UseVoiceTranscriptArgs) {
    const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
    const [postCallCandidateTranscript, setPostCallCandidateTranscript] = useState("")
    const [mappedTranscriptQaPairs, setMappedTranscriptQaPairs] = useState<TranscriptQaPair[]>([])
    const [postCallTranscriptStatus, setPostCallTranscriptStatus] = useState<PostCallTranscriptStatus>("idle")
    const [postCallTranscriptError, setPostCallTranscriptError] = useState("")

    const transcriptCounterRef = useRef(0)
    const transcriptEntriesRef = useRef<TranscriptEntry[]>([])
    const postCallCandidateTranscriptRef = useRef("")
    const mappedTranscriptQaPairsRef = useRef<TranscriptQaPair[]>([])
    const postCallTranscriptStatusRef = useRef<PostCallTranscriptStatus>("idle")
    const postCallTranscriptErrorRef = useRef("")

    const transcriptQaPairs = useMemo(
        () => (mappedTranscriptQaPairs.length ? normalizeTranscriptQaPairs(mappedTranscriptQaPairs) : buildTranscriptQaPairs(transcriptEntries)),
        [mappedTranscriptQaPairs, transcriptEntries]
    )

    const canExportTranscript = useMemo(
        () => transcriptQaPairs.length > 0 || !!normalizeTranscriptText(postCallCandidateTranscript),
        [postCallCandidateTranscript, transcriptQaPairs]
    )

    const candidateTranscriptWordSource = useMemo(
        () =>
            normalizeTranscriptText(postCallCandidateTranscript) ||
            transcriptEntries
                .filter((entry) => entry.speaker === "candidate")
                .map((entry) => entry.text)
                .join(" "),
        [postCallCandidateTranscript, transcriptEntries]
    )

    useEffect(() => {
        transcriptEntriesRef.current = transcriptEntries
    }, [transcriptEntries])

    useEffect(() => {
        postCallCandidateTranscriptRef.current = postCallCandidateTranscript
    }, [postCallCandidateTranscript])

    useEffect(() => {
        mappedTranscriptQaPairsRef.current = mappedTranscriptQaPairs
    }, [mappedTranscriptQaPairs])

    useEffect(() => {
        postCallTranscriptStatusRef.current = postCallTranscriptStatus
    }, [postCallTranscriptStatus])

    useEffect(() => {
        postCallTranscriptErrorRef.current = postCallTranscriptError
    }, [postCallTranscriptError])

    useEffect(() => {
        persistVoiceFeedbackDraft({
            role,
            transcriptEntries,
            postCallCandidateTranscript,
            mappedTranscriptQaPairs,
            postCallTranscriptStatus,
            postCallTranscriptError,
        })
    }, [role, transcriptEntries, postCallCandidateTranscript, mappedTranscriptQaPairs, postCallTranscriptStatus, postCallTranscriptError])

    const persistDraft = useCallback(
        (overrides?: PersistDraftOverrides) => {
            persistVoiceFeedbackDraft({
                role,
                transcriptEntries: overrides?.transcriptEntries ?? transcriptEntriesRef.current,
                postCallCandidateTranscript: overrides?.postCallCandidateTranscript ?? postCallCandidateTranscriptRef.current,
                mappedTranscriptQaPairs: overrides?.mappedTranscriptQaPairs ?? mappedTranscriptQaPairsRef.current,
                postCallTranscriptStatus: overrides?.postCallTranscriptStatus ?? postCallTranscriptStatusRef.current,
                postCallTranscriptError: overrides?.postCallTranscriptError ?? postCallTranscriptErrorRef.current,
            })
        },
        [role]
    )

    const appendTranscript = useCallback((speaker: Speaker, text: string, options?: { mergeWithPrevious?: boolean }) => {
        const normalized = normalizeTranscriptText(text)
        if (!normalized) return

        const previousEntries = transcriptEntriesRef.current
        const lastEntry = previousEntries[previousEntries.length - 1]
        const nextEntries =
            options?.mergeWithPrevious !== false && lastEntry?.speaker === speaker
                ? [...previousEntries.slice(0, -1), { ...lastEntry, text: `${lastEntry.text} ${normalized}`.trim() }]
                : (() => {
                    transcriptCounterRef.current += 1
                    return [...previousEntries, { id: `${speaker}-${transcriptCounterRef.current}`, speaker, text: normalized }]
                })()

        transcriptEntriesRef.current = nextEntries
        setTranscriptEntries(nextEntries)
    }, [])

    const resetPendingTranscripts = useCallback(() => {
        pendingCandidateTranscriptRef.current = ""
        pendingInterviewerTranscriptRef.current = ""
    }, [pendingCandidateTranscriptRef, pendingInterviewerTranscriptRef])

    const reset = useCallback(() => {
        transcriptEntriesRef.current = []
        postCallCandidateTranscriptRef.current = ""
        mappedTranscriptQaPairsRef.current = []
        postCallTranscriptStatusRef.current = "idle"
        postCallTranscriptErrorRef.current = ""
        transcriptCounterRef.current = 0
        resetPendingTranscripts()

        setTranscriptEntries([])
        setPostCallCandidateTranscript("")
        setMappedTranscriptQaPairs([])
        setPostCallTranscriptStatus("idle")
        setPostCallTranscriptError("")
    }, [resetPendingTranscripts])

    const markPostCallRecordingStarted = useCallback(() => {
        postCallTranscriptStatusRef.current = "recording"
        postCallTranscriptErrorRef.current = ""
        setPostCallTranscriptStatus("recording")
        setPostCallTranscriptError("")
    }, [])

    const markPostCallTranscriptError = useCallback((message: string) => {
        postCallTranscriptStatusRef.current = "error"
        postCallTranscriptErrorRef.current = message
        setPostCallTranscriptStatus("error")
        setPostCallTranscriptError(message)
    }, [])

    const exportTranscriptAsTxt = useCallback(() => {
        if (typeof window === "undefined") return

        const content = buildTranscriptQaExport(role, transcriptEntriesRef.current, {
            qaPairs: mappedTranscriptQaPairsRef.current,
            candidateTranscript: postCallCandidateTranscriptRef.current,
        })
        if (!content) return

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `voice-transcript-${role.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "export"}.txt`
        anchor.click()
        window.URL.revokeObjectURL(url)
    }, [role])

    const flushPendingTranscript = useCallback(
        (speaker: Extract<Speaker, "candidate" | "interviewer">, fallbackText?: string) => {
            const pendingTranscriptRef = speaker === "candidate" ? pendingCandidateTranscriptRef : pendingInterviewerTranscriptRef
            const normalized = normalizeTranscriptText(pendingTranscriptRef.current || fallbackText || "")
            pendingTranscriptRef.current = ""
            if (!normalized) return

            const lastEntry = transcriptEntriesRef.current[transcriptEntriesRef.current.length - 1]
            if (lastEntry?.speaker === speaker && lastEntry.text === normalized) return

            appendTranscript(speaker, normalized, { mergeWithPrevious: false })
        },
        [appendTranscript, pendingCandidateTranscriptRef, pendingInterviewerTranscriptRef]
    )

    const handleLiveTranscription = useCallback(
        (speaker: Extract<Speaker, "candidate" | "interviewer">, text?: string, finished?: boolean) => {
            const pendingTranscriptRef = speaker === "candidate" ? pendingCandidateTranscriptRef : pendingInterviewerTranscriptRef
            if (typeof text === "string" && text.trim()) {
                if (speaker === "candidate" && pendingInterviewerTranscriptRef.current) {
                    flushPendingTranscript("interviewer")
                }

                if (speaker === "interviewer" && pendingCandidateTranscriptRef.current) {
                    flushPendingTranscript("candidate")
                }

                if (speaker === "interviewer") {
                    updateTurnState("interviewer-speaking")
                } else if (turnStateRef.current === "awaiting-candidate-answer" || turnStateRef.current === "candidate-speaking") {
                    updateTurnState("candidate-speaking")
                }

                pendingTranscriptRef.current = mergeStreamingTurnText(pendingTranscriptRef.current, text)
            }

            if (finished) {
                flushPendingTranscript(speaker, text)
                if (speaker === "interviewer") {
                    updateTurnState("awaiting-candidate-answer")
                } else if (endgameStateRef.current === "normal") {
                    updateTurnState("between-questions")
                }
            }
        },
        [endgameStateRef, flushPendingTranscript, pendingCandidateTranscriptRef, pendingInterviewerTranscriptRef, turnStateRef, updateTurnState]
    )

    const transcribeCandidateAudio = useCallback(
        async (audioBlob: Blob): Promise<AsyncResult<{ transcriptText: string; qaPairs: TranscriptQaPair[] }>> => {
            postCallTranscriptStatusRef.current = "transcribing"
            postCallTranscriptErrorRef.current = ""
            setPostCallTranscriptStatus("transcribing")
            setPostCallTranscriptError("")
            persistDraft({
                postCallTranscriptStatus: "transcribing",
                postCallTranscriptError: "",
            })

            const formData = new FormData()
            formData.append("role", role)
            formData.append("audio", new File([audioBlob], `voice-interview.${audioBlob.type.includes("mp4") ? "mp4" : "webm"}`, { type: audioBlob.type || "audio/webm" }))
            formData.append("interviewerQuestions", JSON.stringify(extractInterviewerQuestions(transcriptEntriesRef.current)))

            const response = await fetch("/api/interview/transcript", {
                method: "POST",
                body: formData,
            })
            const rawResponseText = await response.text()
            const data = (() => {
                try {
                    return JSON.parse(rawResponseText) as { transcriptText?: string; qaPairs?: TranscriptQaPair[]; error?: string; stage?: string }
                } catch {
                    return { error: rawResponseText || "Post-Call-Transkription fehlgeschlagen." }
                }
            })()

            if (!response.ok || !data.transcriptText) {
                return {
                    ok: false,
                    error: data.stage && data.error ? `[${data.stage}] ${data.error}` : data.error || "Post-Call-Transkription fehlgeschlagen.",
                }
            }

            const resolvedQaPairs = Array.isArray(data.qaPairs) ? data.qaPairs : []
            postCallCandidateTranscriptRef.current = data.transcriptText
            mappedTranscriptQaPairsRef.current = resolvedQaPairs
            postCallTranscriptStatusRef.current = "ready"
            postCallTranscriptErrorRef.current = ""

            setPostCallCandidateTranscript(data.transcriptText)
            setMappedTranscriptQaPairs(resolvedQaPairs)
            setPostCallTranscriptStatus("ready")
            setPostCallTranscriptError("")

            persistDraft({
                postCallCandidateTranscript: data.transcriptText,
                mappedTranscriptQaPairs: resolvedQaPairs,
                postCallTranscriptStatus: "ready",
                postCallTranscriptError: "",
            })

            return {
                ok: true,
                value: {
                    transcriptText: data.transcriptText,
                    qaPairs: resolvedQaPairs,
                },
            }
        },
        [persistDraft, role]
    )

    return {
        transcriptEntries,
        postCallCandidateTranscript,
        mappedTranscriptQaPairs,
        postCallTranscriptStatus,
        postCallTranscriptError,
        transcriptQaPairs,
        canExportTranscript,
        candidateTranscriptWordSource,
        transcriptEntriesRef,
        postCallCandidateTranscriptRef,
        mappedTranscriptQaPairsRef,
        postCallTranscriptStatusRef,
        postCallTranscriptErrorRef,
        pendingCandidateTranscriptRef,
        pendingInterviewerTranscriptRef,
        appendTranscript,
        exportTranscriptAsTxt,
        flushPendingTranscript,
        handleLiveTranscription,
        transcribeCandidateAudio,
        persistDraft,
        reset,
        resetPendingTranscripts,
        markPostCallRecordingStarted,
        markPostCallTranscriptError,
    }
}
