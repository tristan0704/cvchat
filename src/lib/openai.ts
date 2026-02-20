type OpenAiChatArgs = {
    prompt: string
    question?: string
    model?: string
    temperature?: number
    timeoutMs?: number
}

export async function callOpenAiChat(args: OpenAiChatArgs) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        return { ok: false as const, error: "OPENAI_API_KEY is not set" }
    }

    const controller = new AbortController()
    const timeoutMs = args.timeoutMs ?? 20_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const messages: Array<{ role: "system" | "user"; content: string }> = [
            { role: "system", content: args.prompt },
        ]

        if (args.question) {
            messages.push({ role: "user", content: args.question })
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: args.model ?? "gpt-4o-mini",
                messages,
                temperature: args.temperature ?? 0,
            }),
            signal: controller.signal,
        })

        if (!response.ok) {
            const body = await response.text().catch(() => "")
            return {
                ok: false as const,
                error: `OpenAI error (${response.status}): ${body.slice(0, 300)}`,
            }
        }

        const data = await response.json()
        const content = data?.choices?.[0]?.message?.content
        if (typeof content !== "string" || !content.trim()) {
            return { ok: false as const, error: "OpenAI returned no content" }
        }

        return { ok: true as const, content }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "OpenAI request failed"
        return { ok: false as const, error: message }
    } finally {
        clearTimeout(timeoutId)
    }
}
