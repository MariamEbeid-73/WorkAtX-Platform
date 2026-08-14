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

export interface GapAnalysisGap {
    label: string;
    kind: 'blocking' | 'developable' | 'depth';
    required_by: number;
    of: number;
    jobs: string[];
    evidence: string;
    workaround?: string | null;
}

export interface GapAnalysisLeverage {
    label: string;
    demand_rank?: number | null;
    required_by: number;
    of: number;
    depth: 'deep' | 'solid' | 'thin';
    evidence: string[];
}

export interface GapAnalysisUnaskedLeverage {
    label: string;
    why_it_matters: string;
    evidence: string[];
}

export interface GapAnalysisRoleInsight {
    what_this_place_is_like?: string;
    what_they_value?: string;
    interview_shape?: string;
    role_reality?: string;
    [key: string]: unknown;
}

export interface GapAnalysisFutureFit {
    title: string;
    why_this_company: string;
    fit_with_candidate: string;
}

export interface GapAnalysisClosestOpenRole {
    title: string;
    job_url?: string | null;
    why_worth_a_look?: string;
}

export interface GapAnalysisResult {
    gap_analysis: {
        per_job_match_scores: Array<{
            role_id?: string;
            company: string;
            role: string;
            match_score: number;
            match_level: string;
            job_id?: string;
            job_title?: string;
            job_url?: string;
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
            kind?: 'developable' | 'depth';
        }>;
        strengths: string[];
        weaknesses: string[];
        summary: string;
        company_info?: string;
        urgency_note?: string;
        jobs_analyzed: number;
        jobs_with_errors?: string[];
        is_degraded?: boolean;
        blocking?: GapAnalysisGap[];
        depth_gaps?: GapAnalysisGap[];
        leverage?: GapAnalysisLeverage[];
        unasked_leverage?: GapAnalysisUnaskedLeverage[];
        positioning?: string[];
        role_insight?: GapAnalysisRoleInsight;
        evidence_confidence?: 'high' | 'medium' | 'low';
        // "direct" — the analyzed postings are genuinely the requested role.
        // "unrelated" — real postings were scraped, but none are the same
        //   job family as requested; mismatch_note/open_role_titles apply.
        // "unknown" — nothing was scraped at all. Absent means "direct" —
        //   older AI service payloads never set this field.
        role_match?: 'direct' | 'unrelated' | 'unknown';
        mismatch_note?: string;
        open_role_titles?: string[];
        // Same job family as requested but below the AI service's shortlist
        // cutoff, so they weren't analyzed — direct path only.
        also_open_titles?: string[];
        future_fit?: GapAnalysisFutureFit[];
        closest_open_role?: GapAnalysisClosestOpenRole | null;
        target_role?: string;
        target_company?: string;
        company_angle?: string;
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
