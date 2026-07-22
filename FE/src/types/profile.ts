// ─── Generic API wrapper ───────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// ─── User / Developer Profile ──────────────────────────────────────────────
export interface SocialLinks {
  github?: string;
  linkedin?: string;
  portfolio?: string;
  twitter?: string;
}

export interface CollegeVerification {
  isVerified: boolean;
  collegeName?: string;
  verifiedAt?: string;
}

export interface UserProfile {
  id: string;
  clerkUserId: string;
  handle: string;              // e.g. "@alex.dev"
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  yearsOfExperience?: number;
  techStack: string[];
  socialLinks: SocialLinks;
  collegeVerification: CollegeVerification;
  isOpenToWork: boolean;
  profileCompletionPct: number;  // 0-100
  createdAt: string;
  updatedAt: string;
  plan: string | null;
}

// ─── GitHub Developer Identity ─────────────────────────────────────────────
export interface GitHubIdentity {
  isLinked: boolean;
  githubUsername?: string;
  githubProfileUrl?: string;
  publicRepos?: number;
  followers?: number;
  contributions?: number;
  topLanguages?: string[];
  verifiedAt?: string;
}

// ─── Score Breakdown ────────────────────────────────────────────────────────
export type ScoreTab = 'overall' | 'dev' | 'aiml';

export interface ScoreMetric {
  label: string;
  value: number;          // 0-100
  trend?: number;         // +/- delta
  lastUpdated?: string;
}

export interface TabScores {
  overallShowoff: ScoreMetric;
  resume: ScoreMetric;
  github: ScoreMetric;
}

export interface ScoreBreakdown {
  overall: TabScores;
  dev: TabScores;
  aiml: TabScores;
}

// ─── Patch / Mutation Payloads ─────────────────────────────────────────────
export interface UpdateProfilePayload {
  handle?: string;
  bio?: string;
  location?: string;
  yearsOfExperience?: number;
  techStack?: string[];
  socialLinks?: Partial<SocialLinks>;
}

export interface ToggleOpenToWorkPayload {
  isOpenToWork: boolean;
}

// ─── Analysis ──────────────────────────────────────────────────────────────
export interface AnalyzeProfileResponse {
  jobId: string;
  estimatedSeconds: number;
  message: string;
}

// ─── Feedback ──────────────────────────────────────────────────────────────
export interface FeedbackPayload {
  type: 'bug' | 'feature' | 'general';
  message: string;
  rating?: number;
}
