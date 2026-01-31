export type Cv = {
    meta: {
        token: string
        uploadedAt: string
    }

    person: {
        name?: string
        title?: string
        location?: string
        summary?: string
    }

    skills: string[]

    experience: {
        organization: string
        role: string
        start?: string
        end?: string
        tasks: string[]
        keywords: string[]
    }[]

    education: {
        institution: string
        degree?: string
        start?: string
        end?: string
    }[]

    certificates: {
        name: string
        issuer?: string
        year?: string
    }[]

    languages: {
        language: string
        level?: string
    }[]
}
