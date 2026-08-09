import { api } from './api';
import type { ApiResponse } from '../types/profile';
import type {
  Project,
  Resource,
  ResourceType,
  StudyPlan,
  StudyPlanProgressUpdate,
  StudyPlanRecord,
  WeekPlan,
} from '../types/plan';

const objectValue = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function unwrapPlan(value: unknown): Record<string, unknown> {
  let current = objectValue(value) ?? {};
  for (const key of ['response', 'studyPlan', 'study_plan', 'plan']) {
    const nested = objectValue(current[key]);
    if (nested) {
      current = nested;
      break;
    }
  }
  return current;
}

function normalizeProject(value: unknown): Project | null {
  const project = objectValue(value);
  if (!project) return null;
  const title = stringValue(project.title);
  const description = stringValue(project.description);
  return title || description ? { title: title || 'Weekly project', description } : null;
}

function normalizeResource(value: unknown): Resource | null {
  const resource = objectValue(value);
  if (!resource) return null;

  const rawType = stringValue(resource.type).toLowerCase();
  const type: ResourceType = ['course', 'article', 'video', 'docs'].includes(rawType)
    ? rawType as ResourceType
    : 'article';
  const rawCost = stringValue(resource.cost).toLowerCase();

  return {
    title: stringValue(resource.title, 'Learning resource'),
    platform: stringValue(resource.platform, 'Recommended'),
    type,
    cost: rawCost === 'paid' ? 'paid' : 'free',
    reason: stringValue(resource.reason),
    url: typeof resource.url === 'string' ? resource.url : null,
    verified: resource.verified === true,
  };
}

function normalizeWeek(value: unknown, index: number): WeekPlan {
  const week = objectValue(value) ?? {};
  const rawFocus = week.focus_skills ?? week.focusSkills ?? week.focus;
  const focusSkills = typeof rawFocus === 'string' ? [rawFocus] : stringArray(rawFocus);
  const resources = Array.isArray(week.resources)
    ? week.resources.map(normalizeResource).filter((item): item is Resource => item !== null)
    : [];

  return {
    week: typeof week.week === 'number' ? week.week : index + 1,
    focus_skills: focusSkills.length ? focusSkills : ['Core skills'],
    goals: stringValue(week.goals ?? week.goal, `Complete the learning goals for week ${index + 1}.`),
    tasks: stringArray(week.tasks),
    project: normalizeProject(week.project),
    resources,
  };
}

export function normalizeStudyPlan(record: StudyPlanRecord): StudyPlan | null {
  const payload = unwrapPlan(record.plan);
  const rawWeeks = Array.isArray(payload.weeks) ? payload.weeks : [];
  if (!rawWeeks.length) return null;

  const weeks = rawWeeks.map(normalizeWeek);
  const summary = stringValue(payload.title ?? payload.summary);

  return {
    id: record.id,
    jobId: record.jobId,
    sessionId: record.sessionId,
    title: summary || `Study Plan · ${new Date(record.createdAt).toLocaleDateString()}`,
    created_at: record.createdAt,
    total_weeks: weeks.length,
    weeks,
    completedWeekIndexes: record.progress?.completedWeekIndexes ?? [],
    completedTaskIndexes: record.progress?.completedTaskIndexes ?? {},
  };
}

export const getStudyPlans = (token: string) =>
  api<ApiResponse<StudyPlanRecord[]>>('/api/plans', token);

export const updateStudyPlanProgress = (
  token: string,
  planId: string,
  progress: StudyPlanProgressUpdate,
) => api<ApiResponse<StudyPlanRecord>>(`/api/plans/${planId}/progress`, token, {
  method: 'PUT',
  body: JSON.stringify(progress),
});
