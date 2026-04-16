import "server-only";

import {
    getInterviewTemplateById as getCatalogTemplateById,
    getInterviewTemplateCatalog,
    type InterviewTemplateCatalog,
    type InterviewTemplateDefinition,
    type InterviewTemplateSummary,
} from "@/lib/interview-templates/catalog";

export type { InterviewTemplateCatalog, InterviewTemplateSummary };

export async function listInterviewTemplateCatalog(): Promise<InterviewTemplateCatalog> {
    return getInterviewTemplateCatalog();
}

export async function getInterviewTemplateById(
    templateId: string
): Promise<InterviewTemplateDefinition | null> {
    return getCatalogTemplateById(templateId);
}
