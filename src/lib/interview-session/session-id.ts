"use client"

export function getInterviewSessionId(param: string | string[] | undefined) {
    if (Array.isArray(param)) {
        return param[0] ?? "standalone"
    }

    return param ?? "standalone"
}
