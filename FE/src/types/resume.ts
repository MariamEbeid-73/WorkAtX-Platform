export interface ResumeFile {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
}

export interface UploadIntentResponse {
    resumeId: string;
    uploadUrl: string;
}

export interface DownloadUrlResponse {
    downloadUrl: string;
    expiresAt: string;
}

/** Response of POST /resumes/{id}/confirm — mirrors BE ConfirmUploadResponse. */
export interface ConfirmUploadResponse {
    resume: ResumeFile;
    /** Non-null when a parse job was created; null when the CV was already parsed. */
    analysisJobId: string | null;
}
