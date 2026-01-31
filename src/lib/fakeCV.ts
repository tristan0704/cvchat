import type { Cv } from "./cvSchema"

export const fakeCv: Cv = {
    meta: {
        token: "test-token",
        uploadedAt: new Date().toISOString(),
    },

    person: {
        name: "Alex Example",
        title: "Project Coordinator",
        location: "Austria",
        summary: "Organized professional with experience in coordination and documentation.",
    },

    skills: ["Organization", "Communication", "Documentation"],

    experience: [
        {
            organization: "Example Company",
            role: "Project Coordinator",
            tasks: [
                "Coordinated internal tasks",
                "Maintained project documentation",
            ],
            keywords: ["Project coordination", "Documentation"],
        },
    ],

    education: [],
    certificates: [],
    languages: [],
}
