export type ResourceType = 'course' | 'article' | 'video' | 'docs';

export interface Resource {
  title: string;
  platform: string;
  type: ResourceType;
  cost: 'free' | 'paid';
  reason: string;
  url: string | null;
  verified: boolean;
}

export interface Project {
  title: string;
  description: string;
}

export interface WeekPlan {
  week: number;
  focus_skills: string[];
  goals: string;
  tasks: string[];
  project: Project | null;
  resources: Resource[];
}

/** Normalized view model consumed by the island UI. */
export interface StudyPlan {
  id: string;
  jobId: string | null;
  sessionId: string;
  title: string;
  created_at: string;
  total_weeks: number;
  weeks: WeekPlan[];
  completedWeekIndexes: number[];
  completedTaskIndexes: Record<string, number[]>;
}

/** Authenticated API record; `plan` is the immutable AI-owned payload. */
export interface StudyPlanRecord {
  id: string;
  sessionId: string;
  jobId: string | null;
  plan: unknown;
  progress: {
    completedWeekIndexes: number[];
    completedTaskIndexes: Record<string, number[]>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanProgressUpdate {
  completedWeekIndexes: number[];
  completedTaskIndexes: Record<string, number[]>;
}
