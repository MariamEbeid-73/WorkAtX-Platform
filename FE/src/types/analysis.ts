// ── Analysis Result Types ────────────────────────────────────────────────────
// Mirrors contracts/analysis1-result-schema.json
// All fields are optional — the contract says "things may or may not exist".

export interface AnalysisEducation {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
}

export interface AnalysisSkills {
  programmingLanguages?: string[];
  frameworks?: string[];
  cloudAndInfra?: string[];
  databases?: string[];
  tools?: string[];
  other?: string[];
}

export interface AnalysisProfile {
  fullName?: string;
  headline?: string;
  location?: string;
  seniorityLevel?: string;
  yearsOfExperience?: number;
  about?: string;
  education?: AnalysisEducation[];
  skills?: AnalysisSkills;
  softSkills?: string[];
  openToWork?: boolean;
  languages?: string[];
}

export interface AnalysisExperience {
  company?: string;
  position?: string;
  employmentType?: string;
  location?: string | null;
  workplaceType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationMonths?: number;
  description?: string | null;
}

export interface AnalysisProject {
  name?: string;
  description?: string | null;
  language?: string;
  source?: 'resume' | 'github' | string;
}

export interface AnalysisCertification {
  title?: string;
  issuedBy?: string;
  issuedAt?: string;
  expiredAt?: string;
}

export interface CompetitivePlatform {
  platform?: string;
  handle?: string;
  url?: string;
}

export interface CompetitiveProgramming {
  platforms?: CompetitivePlatform[];
  achievements?: string[];
}

export interface GitHubSocialMeta {
  username?: string;
  url?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
  accountCreatedAt?: string;
  topLanguages?: string[];
}

export interface LinkedInSocialMeta {
  url?: string;
  publicIdentifier?: string;
  connectionsCount?: number;
  followerCount?: number;
}

export interface SocialMetadata {
  github?: GitHubSocialMeta;
  linkedin?: LinkedInSocialMeta;
}

export interface ProfileAnalysis {
  profile?: AnalysisProfile;
  experience?: AnalysisExperience[];
  projects?: AnalysisProject[];
  certifications?: AnalysisCertification[];
  competitiveProgramming?: CompetitiveProgramming;
  socialMetadata?: SocialMetadata;
}

export interface ScoreMetric {
  label?: string;
  value?: number;
  trend?: number;
  lastUpdated?: string;
}

export interface ScoreDomain {
  overallShowoff?: ScoreMetric;
  resume?: ScoreMetric;
  github?: ScoreMetric;
}

export interface ScoreBreakdown {
  overall?: ScoreDomain;
  dev?: ScoreDomain;
  aiml?: ScoreDomain;
}

export interface AnalysisResult {
  profileAnalysis?: ProfileAnalysis;
  scoreBreakdown?: ScoreBreakdown;
}
