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
