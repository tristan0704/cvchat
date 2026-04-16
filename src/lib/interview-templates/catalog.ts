import { getInterviewQuestionPool, type InterviewQuestion } from "@/lib/interview";

export type InterviewTemplateSummary = {
    id: string;
    title: string;
    role: string;
    roleKey: string;
    experience: string;
    companySize: string;
    summary: string;
};

export type InterviewTemplateCatalog = {
    roles: string[];
    experiences: string[];
    companySizes: string[];
    templates: InterviewTemplateSummary[];
};

export type InterviewTemplateDefinition = InterviewTemplateSummary & {
    questions: InterviewQuestion[];
};

const ROLE_DEFINITIONS = [
    {
        role: "Frontend Developer",
        roleKey: "frontend",
        summary:
            "Fokus auf produktnahe Frontend-Entwicklung, stabile UI-Flows und saubere technische Entscheidungen.",
    },
    {
        role: "Backend Developer",
        roleKey: "backend",
        summary:
            "Fokus auf APIs, Datenkonsistenz, Produktionsthemen und belastbare Backend-Entscheidungen.",
    },
    {
        role: "Fullstack Developer",
        roleKey: "fullstack",
        summary:
            "Fokus auf End-to-End-Ownership, saubere Feature-Schnitte und abgestimmte Frontend-/Backend-Entscheidungen.",
    },
] as const;

const EXPERIENCES = ["Junior", "Mid", "Senior"] as const;
const COMPANY_SIZES = ["Startup", "Mittelstand", "Konzern"] as const;
function compareText(left: string, right: string) {
    return left.localeCompare(right, "de", { sensitivity: "base" });
}

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function buildTemplateId(args: {
    roleKey: string;
    experience: string;
    companySize: string;
}) {
    return [
        args.roleKey,
        slugify(args.experience),
        slugify(args.companySize),
    ].join("-");
}

function buildTemplateSummary(args: {
    role: string;
    roleKey: string;
    roleSummary: string;
    experience: string;
    companySize: string;
}): InterviewTemplateSummary {
    return {
        id: buildTemplateId({
            roleKey: args.roleKey,
            experience: args.experience,
            companySize: args.companySize,
        }),
        title: `${args.role} Interview`,
        role: args.role,
        roleKey: args.roleKey,
        experience: args.experience,
        companySize: args.companySize,
        summary: `${args.roleSummary} Konfiguration fuer ${args.experience} im ${args.companySize}.`,
    };
}

const TEMPLATE_SUMMARIES: InterviewTemplateSummary[] = ROLE_DEFINITIONS.flatMap(
    (roleDefinition) =>
        EXPERIENCES.flatMap((experience) =>
            COMPANY_SIZES.map((companySize) =>
                buildTemplateSummary({
                    role: roleDefinition.role,
                    roleKey: roleDefinition.roleKey,
                    roleSummary: roleDefinition.summary,
                    experience,
                    companySize,
                })
            )
        )
);

const TEMPLATE_MAP = new Map(
    TEMPLATE_SUMMARIES.map((template) => [
        template.id,
        {
            ...template,
            questions: getInterviewQuestionPool(template.role),
        } satisfies InterviewTemplateDefinition,
    ])
);

export function getInterviewTemplateCatalog(): InterviewTemplateCatalog {
    return {
        roles: [...new Set(TEMPLATE_SUMMARIES.map((item) => item.role))].sort(
            compareText
        ),
        experiences: [
            ...new Set(TEMPLATE_SUMMARIES.map((item) => item.experience)),
        ].sort(compareText),
        companySizes: [
            ...new Set(TEMPLATE_SUMMARIES.map((item) => item.companySize)),
        ].sort(compareText),
        templates: TEMPLATE_SUMMARIES,
    };
}

export function getInterviewTemplateById(templateId: string) {
    const normalizedTemplateId = templateId.trim();

    if (!normalizedTemplateId) {
        return null;
    }

    return TEMPLATE_MAP.get(normalizedTemplateId) ?? null;
}
