import "server-only";

import type { InterviewCvConfig } from "@/lib/cv/types";
import type { RoleProfile } from "@/lib/cv/server/types";

function getRoleBucket(role: string) {
  const normalized = role.toLowerCase();

  if (normalized.includes("frontend")) return "frontend";
  if (normalized.includes("fullstack")) return "fullstack";
  if (normalized.includes("data") || normalized.includes("ai")) return "data";

  return "backend";
}

export function buildRoleProfile(config: InterviewCvConfig): RoleProfile {
  const bucket = getRoleBucket(config.role);

  const baseProfiles: Record<string, RoleProfile> = {
    backend: {
      role: config.role,
      mustHave: [
        "API design",
        "Databases",
        "Backend services",
        "Debugging",
        "Testing",
      ],
      niceToHave: ["Cloud", "Caching", "Queues", "Observability"],
      bonus: ["CI/CD", "Security", "Distributed systems"],
    },
    frontend: {
      role: config.role,
      mustHave: [
        "React",
        "State management",
        "HTML/CSS",
        "API integration",
        "Frontend debugging",
      ],
      niceToHave: ["Performance", "Accessibility", "Testing", "Design systems"],
      bonus: ["Animation", "SSR", "Analytics"],
    },
    fullstack: {
      role: config.role,
      mustHave: [
        "Frontend development",
        "Backend development",
        "API design",
        "Databases",
        "End-to-end ownership",
      ],
      niceToHave: ["Testing", "Cloud", "Deployment", "Debugging"],
      bonus: ["Architecture", "Monitoring", "Product thinking"],
    },
    data: {
      role: config.role,
      mustHave: [
        "Data analysis",
        "Python or SQL",
        "Data pipelines",
        "Evaluation",
        "Communication of findings",
      ],
      niceToHave: ["Machine learning", "Visualization", "Experimentation"],
      bonus: ["MLOps", "LLMs", "Statistics depth"],
    },
  };

  const profile = baseProfiles[bucket];

  if (config.experience.toLowerCase() === "senior") {
    profile.mustHave.push("Ownership", "System design");
    profile.niceToHave.push("Mentoring");
  }

  if (config.experience.toLowerCase() === "junior") {
    profile.mustHave.push("Learning ability");
  }

  if (config.companySize.toLowerCase() === "startup") {
    profile.niceToHave.push("Pragmatism", "Generalist mindset");
  }

  if (config.companySize.toLowerCase() === "konzern") {
    profile.niceToHave.push("Stakeholder alignment", "Structured delivery");
  }

  return profile;
}
