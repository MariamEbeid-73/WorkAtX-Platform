import { api } from './api';
import type { ResumeFile, UploadIntentResponse, DownloadUrlResponse, ConfirmUploadResponse } from '../types/resume';

export const createUploadIntent = (
    token: string,
    file: File,
): Promise<UploadIntentResponse> =>
    api<UploadIntentResponse>('/resumes/upload-intent', token, {
        method: 'POST',
        body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
        }),
    });

/**
 * Step 2: upload the file directly to MinIO using the pre-signed URL.
 * Uses XMLHttpRequest so we get upload progress events.
 * fetch() does not support upload progress.
 */
export function uploadToStorage(
    uploadUrl: string,
    file: File,
    onProgress: (percent: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`MinIO upload failed: HTTP ${xhr.status}`));
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
}

/** Step 3: tell the backend the upload is done. */
export const confirmUpload = (token: string, resumeId: string): Promise<ConfirmUploadResponse> =>
    api<ConfirmUploadResponse>(`/resumes/${resumeId}/confirm`, token, { method: 'POST' });

/** Returns all confirmed resumes for the current user. */
export const listResumes = (token: string): Promise<ResumeFile[]> =>
    api<ResumeFile[]>('/resumes', token);

/** Returns a short-lived download URL. */
export const getDownloadUrl = (token: string, resumeId: string): Promise<DownloadUrlResponse> =>
    api<DownloadUrlResponse>(`/resumes/${resumeId}/download-url`, token);

/** Permanently deletes a resume. */
export const deleteResume = (token: string, resumeId: string): Promise<void> =>
    api<void>(`/resumes/${resumeId}`, token, { method: 'DELETE' });
