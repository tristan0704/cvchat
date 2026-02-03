"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

type CvMeta = {
    name: string
    position: string
    summary: string
    imageUrl?: string | null
}

export default function CvPage() {
    const params = useParams()
    const token = params.token as string

    // ---- meta ----
    const [meta, setMeta] = useState<CvMeta | null>(null)

    // ---- chat ----
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // ---- share ----
    const [copied, setCopied] = useState(false)

    // --------------------
    // LOAD CV META
    // --------------------
    useEffect(() => {
        async function loadMeta() {
            try {
                const res = await fetch(`/api/cv/${token}`)
                if (res.ok) {
                    const data = await res.json()
                    setMeta(data)
                }
            } catch {
                // silent fail (page still usable)
            }
        }

        loadMeta()
    }, [token])

    // --------------------
    // ASK QUESTION
    // --------------------
    async function askQuestion() {
        if (!question.trim()) return

        setLoading(true)
        setError("")
        setAnswer("")

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    question,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Something went wrong")
                return
            }

            setAnswer(data.answer)
        } catch {
            setError("Server not reachable")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-xl">

                {/* -------------------- */}
                {/* META HEADER */}
                {/* -------------------- */}
                {meta && (
                    <div className="flex items-start gap-4 mb-12">
                        {meta.imageUrl ? (
                            <img
                                src={meta.imageUrl}
                                alt={meta.name}
                                className="h-14 w-14 rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-14 w-14 rounded-full bg-gray-300 flex items-center justify-center">
        <span className="text-sm font-medium text-gray-700">
          {meta.name?.[0] ?? "?"}
        </span>
                            </div>
                        )}

                        <div>
                            <p className="font-medium text-gray-900">
                                {meta.name}
                            </p>
                            <p className="text-sm text-gray-500 mb-2">
                                {meta.position}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {meta.summary}
                            </p>
                        </div>
                    </div>
                )}


                {/* -------------------- */}
                {/* INTRO */}
                {/* -------------------- */}
                <section className="mb-12">
                    <h1 className="text-3xl font-semibold mb-4">
                        Chat with this CV
                    </h1>

                    <p className="text-sm text-gray-500 leading-relaxed">
                        Answers are generated strictly from the uploaded CV.
                        If information is not present, the system will say so.
                    </p>
                </section>

                {/* -------------------- */}
                {/* SHARE LINK */}
                {/* -------------------- */}
                <div className="mb-16">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1600)
                        }}
                        className={`
              w-full rounded-md px-7 py-4 font-medium
              border transition-all
              ${
                            copied
                                ? "bg-green-600 border-green-600 text-white"
                                : "bg-white border-gray-300 text-gray-800 hover:border-black"
                        }
            `}
                    >
                        {copied ? "Link copied ✓" : "Copy share link"}
                    </button>
                </div>

                {/* -------------------- */}
                {/* QUESTION INPUT */}
                {/* -------------------- */}
                <section className="mb-20">
          <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about the candidate’s experience…"
              rows={4}
              className="
              w-full rounded-md border border-gray-300 p-4 mb-8
              focus:outline-none focus:ring-2 focus:ring-black
            "
          />

                    <button
                        onClick={askQuestion}
                        disabled={loading}
                        className="
              w-full rounded-md bg-black px-7 py-4 text-white font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
            "
                    >
                        {loading ? "Thinking…" : "Ask question"}
                    </button>

                    {error && (
                        <p className="mt-6 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </section>

                {/* -------------------- */}
                {/* ANSWER */}
                {/* -------------------- */}
                {answer && (
                    <section className="mb-20">
                        <div className="rounded-md border border-gray-200 bg-gray-50 p-6">
                            <p className="text-sm font-medium mb-3 text-gray-700">
                                Answer
                            </p>
                            <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                                {answer}
                            </p>
                        </div>
                    </section>
                )}

                {/* -------------------- */}
                {/* FOOTER */}
                {/* -------------------- */}
                <section>
                    <p className="text-xs text-gray-400">
                        Private link · Token-based access
                    </p>
                </section>

            </div>
        </main>
    )
}
