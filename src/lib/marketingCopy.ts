export const marketingCopy = {
  home: {
    badge: "Project-to-career signal platform",
    headline:
      "Turn student projects into clear career signals for recruiters and interviews",
    subline:
      "CareerIndex analyzes your project context and converts it into recruiter-ready summaries, interview stories, and LinkedIn/CV bullets that sound professional and concrete.",
    ctaPrimaryCreate: "Start with my projects",
    ctaPrimaryOpen: "Open my CareerIndex Hub",
    ctaSecondary: "Upload CV context",
    howItWorksTitle: "How CareerIndex works",
    howItWorksSteps: [
      "1. Add project links and your role in each project.",
      "2. CareerIndex extracts stack, tasks, solved problems, and outcomes.",
      "3. You get polished career assets for recruiter screens and interviews.",
      "4. Share your strongest project narrative in applications and on LinkedIn.",
    ],
    freeHint:
      "Start free with one project. Add CV context for better role-specific wording.",
  },
  upload: {
    title: "Build your Project Career Index",
    intro:
      "Start with project evidence, then enrich with CV and supporting files. This keeps the output concrete and role-relevant.",
    projectSectionTitle: "Project signal intake",
    projectSectionText:
      "Capture repo, role target, your contributions, and measurable impact. This is the primary input for your career assets.",
    repoBetaNote:
      "Public GitHub auto-fetch can plug into the same schema later (prepared).",
    cta: "Create project-focused CareerIndex",
  },
  auth: {
    loginTitle: "Welcome back",
    registerTitle: "Create your account",
    loginText:
      "Sign in to continue building and sharing your project-first career profile.",
    registerText:
      "Sign up to save your project signals, generated assets, and sharing settings.",
  },
  dashboard: {
    title: "Project Asset Dashboard",
    subtitle:
      "Manage your project-based profile, update your summary, and control public sharing.",
    profileCardTitle: "Profile Core",
    sharingCardTitle: "Publishing & Sharing",
    personalCardTitle: "Public Profile Page",
    pitchCardTitle: "Public Pitch Page",
  },
  publicProfile: {
    badge: "Public Profile",
    aboutTitle: "About this profile",
    skillsTitle: "Core skills",
    projectsTitle: "Project highlights",
    experienceTitle: "Experience evidence",
  },
  publicPitch: {
    badge: "Project Pitch",
    decisionSignalsTitle: "Decision signals",
    resultsTitle: "Delivered outcomes",
    evidenceTitle: "Skill-to-evidence map",
  },
} as const
