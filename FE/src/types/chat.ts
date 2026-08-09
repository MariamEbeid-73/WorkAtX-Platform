export type ChatMessageRole = "user" | "assistant";
export type AiResponseType = "normal_text" | "gap_analysis" | "study_plan";
export type JobStatusValue = "queued" | "processing" | "completed" | "failed";

export interface ChatSessionDto {
    id: string;
    title: string | null;
    status: "active" | "archived";
    lastMessageAt: string | null;
    createdAt: string;
}

/** Option can be a string (from Python template) or structured object */
export interface TechChoiceOption {
    id: string;
    label: string;
    description?: string;
}

export interface TechChoiceCategory {
    category: string;
    options: Array<string | TechChoiceOption>;
}

export type TechChoiceSelections = Record<string, string>;

export interface GapAnalysisResult {
    gap_analysis: {
        per_job_match_scores: Array<{
            role_id?: string;
            company: string;
            role: string;
            match_score: number;
            match_level: string;
        }>;
        skill_coverage_across_all_jobs: number;
        matched: string[];
        missing: Array<{
            skill: string;
            importance: string;
            required_by: number;
            of: number;
            jobs: string[];
            badge_color?: string;
        }>;
        strengths: string[];
        weaknesses: string[];
        summary: string;
        company_info?: string;
        urgency_note?: string;
        jobs_analyzed: number;
        jobs_with_errors?: string[];
        is_degraded?: boolean;
    };
    user_report: string;
    tech_choices: TechChoiceCategory[];
    awaiting_user_input: boolean;
    error?: string;
}

export interface ChatMessageDto {
    id: string;
    role: ChatMessageRole;
    content: string;
    responseType: AiResponseType | null;
    jobId: string | null;
    result: GapAnalysisResult | unknown | null;
    createdAt: string;
}

export interface SendMessageResult {
    jobId: string;
    sessionId: string;
}

export interface JobStatusDto {
    jobId: string;
    jobType: string;
    status: JobStatusValue;
    error: string | null;
    stage: string | null;
    progress: number | null;
    updatedAt: string;
}

export interface JobResultDto {
    jobId: string;
    jobType: string;
    status: JobStatusValue;
    result: unknown;
    error: string | null;
}

export interface UiChatMessage extends Omit<ChatMessageDto, "id"> {
    id: string;
    pending?: boolean;
    pendingStage?: string | null;
    pendingProgress?: number | null;
    failed?: boolean;
    resultStatus?: "ok" | "unavailable" | "error";
}

export interface SubmitTechChoicesResult {
    jobId: string;
    sessionId: string;
}
