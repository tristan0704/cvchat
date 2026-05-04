"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { InterviewCvConfig } from "@/lib/cv/types";
import type { InterviewQuestion } from "@/lib/questionpool";
import { useVoiceInterviewController } from "@/lib/voice-interview/session/use-voice-interview-controller";

type PlannedQuestion = {
    questionKey: string | null;
    text: string;
    priority: number | null;
};

type InterviewMode = "voice" | "face";

type InterviewSessionValue = {
    interviewId: string;
    interviewMode: InterviewMode;
    role: string;
    config: InterviewCvConfig;
    plannedQuestions: PlannedQuestion[];
    voiceInterview: ReturnType<typeof useVoiceInterviewController>;
};

const InterviewSessionContext = createContext<InterviewSessionValue | null>(null);

function mapPlannedQuestionsToQuestionPlan(
    plannedQuestions: PlannedQuestion[]
): InterviewQuestion[] {
    return plannedQuestions.map((question, index) => ({
        id: question.questionKey ?? `planned-${index + 1}`,
        text: question.text,
        priority: question.priority ?? (index + 1) * 10,
    }));
}

function InterviewSessionScope({
    interviewId,
    interviewMode,
    role,
    config,
    plannedQuestions,
    children,
}: {
    interviewId: string;
    interviewMode: InterviewMode;
    role: string;
    config: InterviewCvConfig;
    plannedQuestions: PlannedQuestion[];
    children: ReactNode;
}) {
    const voiceInterview = useVoiceInterviewController(
        role,
        plannedQuestions.length > 0
            ? mapPlannedQuestionsToQuestionPlan(plannedQuestions)
            : undefined,
        interviewId,
        interviewMode
    );

    return (
        <InterviewSessionContext.Provider
            value={{
                interviewId,
                interviewMode,
                role,
                config,
                plannedQuestions,
                voiceInterview,
            }}
        >
            {children}
        </InterviewSessionContext.Provider>
    );
}

export function InterviewSessionProvider({
    interviewId,
    interviewMode,
    config,
    plannedQuestions,
    children,
}: {
    interviewId: string;
    interviewMode: InterviewMode;
    config: InterviewCvConfig;
    plannedQuestions: PlannedQuestion[];
    children: ReactNode;
}) {
    const role = config.role.trim() || "Backend Developer";
    const sessionKey = [
        interviewId,
        interviewMode,
        role,
        config.experience,
        config.companySize,
        plannedQuestions.map((question) => question.questionKey ?? question.text).join("|"),
    ].join("|");

    return (
        <InterviewSessionScope
            key={sessionKey}
            interviewId={interviewId}
            interviewMode={interviewMode}
            role={role}
            config={config}
            plannedQuestions={plannedQuestions}
        >
            {children}
        </InterviewSessionScope>
    );
}

export function useOptionalInterviewSession() {
    return useContext(InterviewSessionContext);
}

export function useInterviewSession() {
    const session = useContext(InterviewSessionContext);

    if (!session) {
        throw new Error("Interview session context is missing.");
    }

    return session;
}
