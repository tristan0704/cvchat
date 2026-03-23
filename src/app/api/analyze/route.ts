import { analyzeWithLLM, type JobProfile } from "@/lib/cv-analysis/analyzeWithLLM"
import { pdfToText } from "@/lib/cv-analysis/pdfToText"

export const runtime = "nodejs"

const MAX_CV_BYTES = 20_000_000

/*
const JOB_PROFILES: Record<string, JobProfile> = {
    "backend developer": {
        role: "Backend Developer",
        must_have: ["REST APIs", "TypeScript", "Node.js"],
        nice_to_have: ["GraphQL", "Testing", "Docker"],
        bonus: ["Go", "Rust"],
    },
    "data scientist": {
        role: "Data Scientist",
        must_have: ["Python", "Statistics", "Machine Learning"],
        nice_to_have: ["SQL", "Data Engineering", "MLOps"],
        bonus: ["PySpark", "Snowflake"],
    },
    default: {
        role: "Generalist",
        must_have: ["Problem Solving", "Team Collaboration"],
        nice_to_have: ["Mentoring", "Public Speaking"],
        bonus: ["Open Source Contributions"],
    },
}
 */

const JOB_PROFILES: Record<string, JobProfile> = {
    "backend developer": {
        role: "Backend Developer",
        must_have: [
            "REST APIs", "TypeScript", "Node.js", "Express", "Databases", "API Design"
        ],
        nice_to_have: [
            "GraphQL", "Testing", "Docker", "Kubernetes", "CI/CD", "Microservices"
        ],
        bonus: [
            "Go", "Rust", "Serverless", "Redis", "Message Queues"
        ],
    },
    "data scientist": {
        role: "Data Scientist",
        must_have: [
            "Python", "Statistics", "Machine Learning", "Data Analysis", "Pandas", "NumPy"
        ],
        nice_to_have: [
            "SQL", "Data Engineering", "MLOps", "Visualization", "scikit-learn", "Experiment Tracking"
        ],
        bonus: [
            "PySpark", "Snowflake", "Big Data", "TensorFlow", "Deep Learning", "NLP"
        ],
    },
    "generalist": {
        role: "Generalist",
        must_have: [
            "Problem Solving", "Team Collaboration", "Adaptability", "Communication"
        ],
        nice_to_have: [
            "Mentoring", "Public Speaking", "Project Management", "Agile", "Critical Thinking"
        ],
        bonus: [
            "Open Source Contributions", "Hackathons", "Community Engagement"
        ],
    },
}


function getJobProfile(rawRole: string | null): JobProfile {
    if (!rawRole) {
        return JOB_PROFILES.default
    }

    const key = rawRole.toLowerCase().trim()
    return JOB_PROFILES[key as keyof typeof JOB_PROFILES] ?? JOB_PROFILES.default
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file")
        const role = formData.get("role")?.toString().trim() ?? "Generalist"

        if (!file || !(file instanceof File)) {
            return Response.json({ error: "PDF file is required" }, { status: 400 })
        }

        if (file.type !== "application/pdf") {
            return Response.json({ error: "PDF file must be application/pdf" }, { status: 400 })
        }

        if (file.size > MAX_CV_BYTES) {
            return Response.json({ error: "PDF must be smaller than 20MB" }, { status: 400 })
        }

        console.log("[api/analyze] file metadata", {
            name: file.name,
            size: file.size,
            type: file.type,
        })

        const arrayBuffer = await file.arrayBuffer()
        console.log("[api/analyze] converted to buffer (bytes)", arrayBuffer.byteLength)
        const buffer = Buffer.from(arrayBuffer)

        console.log("[api/analyze] starting text extraction")
        const cvText = await pdfToText(buffer)
        console.log("[api/analyze] extracted text preview", cvText.slice(0, 300))

        const jobProfile = getJobProfile(role)
        console.log("[api/analyze] job profile selected", jobProfile)
        const analysis = await analyzeWithLLM(cvText, jobProfile)
        console.log("[api/analyze] received analysis output", analysis)

        return Response.json({ ok: true, analysis })
    } catch (error) {
        console.error("[api/analyze]", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
