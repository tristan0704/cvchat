"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import type { InterviewCvConfig } from "@/components/cv/types";
import { useVoiceInterviewController } from "@/lib/voice-interview/session/use-voice-interview-controller";

type InterviewSessionValue = {
  role: string;
  config: InterviewCvConfig;
  voiceInterview: ReturnType<typeof useVoiceInterviewController>;
};

const InterviewSessionContext = createContext<InterviewSessionValue | null>(null);

function InterviewSessionScope({
  role,
  config,
  children,
}: {
  role: string;
  config: InterviewCvConfig;
  children: ReactNode;
}) {
  const voiceInterview = useVoiceInterviewController(role);

  return (
    <InterviewSessionContext.Provider value={{ role, config, voiceInterview }}>
      {children}
    </InterviewSessionContext.Provider>
  );
}

export function InterviewSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "Backend Developer";
  const config: InterviewCvConfig = {
    role,
    experience: searchParams.get("experience") ?? "",
    companySize: searchParams.get("companySize") ?? "",
    interviewType: searchParams.get("type") ?? "",
  };
  const sessionKey = [
    config.role,
    config.experience,
    config.companySize,
    config.interviewType,
  ].join("|");

  return (
    <InterviewSessionScope key={sessionKey} role={role} config={config}>
      {children}
    </InterviewSessionScope>
  );
}

export function useOptionalInterviewSession() {
  return useContext(InterviewSessionContext);
}
