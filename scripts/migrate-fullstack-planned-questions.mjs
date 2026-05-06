import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function readFirstDefined(...keys) {
    for (const key of keys) {
        const value = process.env[key]?.trim();

        if (value) {
            return value;
        }
    }

    return null;
}

function applyDatabaseEnvAliases() {
    const databaseUrl = readFirstDefined(
        "DATABASE_URL",
        "SUPBASE_POSTGRES_PRISMA_URL",
        "SUPBASE_POSTGRES_URL",
    );
    const directUrl = readFirstDefined(
        "DIRECT_URL",
        "SUPBASE_POSTGRES_URL_NON_POOLING",
        "SUPBASE_POSTGRES_URL",
    );

    if (databaseUrl && !process.env.DATABASE_URL) {
        process.env.DATABASE_URL = databaseUrl;
    }

    if (directUrl && !process.env.DIRECT_URL) {
        process.env.DIRECT_URL = directUrl;
    }
}

applyDatabaseEnvAliases();

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const replacements = [
    {
        oldKeys: ["intern-motivation"],
        oldTextIncludes: ["Fullstack-Praktikum"],
        next: {
            questionKey: "motivation",
            text: "Warum passt diese Rolle aus deiner Sicht gut zu dir, und in welchem technischen Umfeld lieferst du erfahrungsgemäß den größten Wert?",
            priority: 10,
        },
    },
    {
        oldKeys: ["fullstack-intern-end-to-end-project"],
        oldTextIncludes: ["Frontend und Backend zusammenspielen"],
        next: {
            questionKey: "fullstack-feature-slicing",
            text: "Wenn du ein Fullstack-Feature für ein Produktteam umsetzen sollst, wie schneidest du Frontend, Backend und Datenmodell so, dass ihr schnell liefern könnt, ohne euch technische Schulden einzuhandeln?",
            priority: 15,
        },
    },
    {
        oldKeys: ["fullstack-intern-debugging"],
        oldTextIncludes: ["Formular funktioniert im Frontend"],
        next: {
            questionKey: "fullstack-end-to-end-debugging",
            text: "Ein Feature funktioniert lokal, aber nicht sauber im produktiven Zusammenspiel von UI, API und Infrastruktur. Wie gehst du end-to-end bei der Analyse vor?",
            priority: 35,
        },
    },
    {
        oldKeys: ["fullstack-intern-prioritization"],
        oldTextIncludes: ["für ein Praktikum ein kleines Feature"],
        next: {
            questionKey: "fullstack-prioritization",
            text: "Wenn Scope, Zeit und technische Qualität kollidieren, wie priorisierst du bei einem Fullstack-Feature und wie kommunizierst du die Trade-offs?",
            priority: 50,
        },
    },
    {
        oldKeys: ["fullstack-intern-feedback"],
        oldTextIncludes: ["von einem Mentor kritisches Feedback"],
        next: {
            questionKey: "feedback",
            text: "Erzähl mir von einer Situation, in der du bei einer technischen Entscheidung Widerspruch bekommen hast. Wie bist du damit umgegangen und was war am Ende das Ergebnis?",
            priority: 40,
        },
    },
    {
        oldKeys: ["fullstack-intern-user-focus"],
        oldTextIncludes: ["studentischen oder kleinen Produkt-Feature"],
        next: {
            questionKey: "fullstack-release-ownership",
            text: "Was gehört für dich dazu, ein Feature wirklich end-to-end zu verantworten, von der Anforderung bis zum Verhalten nach dem Release?",
            priority: 60,
        },
    },
];

function buildWhere(replacement) {
    return {
        interview: {
            role: {
                contains: "fullstack",
                mode: "insensitive",
            },
        },
        OR: [
            ...replacement.oldKeys.map((questionKey) => ({ questionKey })),
            ...replacement.oldTextIncludes.map((text) => ({
                text: {
                    contains: text,
                },
            })),
        ],
    };
}

try {
    let totalMatched = 0;
    let totalUpdated = 0;

    for (const replacement of replacements) {
        const where = buildWhere(replacement);
        const matchedCount = await prisma.interviewPlannedQuestion.count({ where });
        totalMatched += matchedCount;

        if (!apply || matchedCount === 0) {
            console.info(`[dry-run] ${replacement.next.questionKey}: ${matchedCount} rows`);
            continue;
        }

        const result = await prisma.interviewPlannedQuestion.updateMany({
            where,
            data: replacement.next,
        });

        totalUpdated += result.count;
        console.info(`[updated] ${replacement.next.questionKey}: ${result.count} rows`);
    }

    if (apply) {
        console.info(`Fullstack planned-question migration complete. Updated ${totalUpdated} rows.`);
    } else {
        console.info(`Dry-run complete. ${totalMatched} rows would be updated. Re-run with --apply to write changes.`);
    }
} finally {
    await prisma.$disconnect();
}
