import type { CvFeedbackResult, InterviewCvConfig } from "@/lib/cv/types";
import {
  MAX_CV_BYTES,
} from "@/lib/cv/server/constants";
import {
  analyzeCvFeedback,
  CvFeedbackError,
} from "@/lib/cv/server/analyze-cv-feedback";

export const runtime = "nodejs";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return Response.json(
        { error: "PDF file must be application/pdf" },
        { status: 400 }
      );
    }

    if (file.size > MAX_CV_BYTES) {
      return Response.json(
        { error: "PDF must be smaller than 20MB" },
        { status: 400 }
      );
    }

    const config: InterviewCvConfig = {
      role: readString(formData, "role") || "Backend Developer",
      experience: readString(formData, "experience"),
      companySize: readString(formData, "companySize"),
      interviewType: readString(formData, "interviewType"),
    };
    const result: CvFeedbackResult = await analyzeCvFeedback({ file, config });

    return Response.json(result);
  } catch (error) {
    if (error instanceof CvFeedbackError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/interview/cv-feedback]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
