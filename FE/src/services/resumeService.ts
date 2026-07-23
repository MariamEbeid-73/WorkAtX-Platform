import { api } from './api';
import type { ResumeFile, UploadIntentResponse, DownloadUrlResponse } from '../types/resume';

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
export function uploadToMinIO(
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

        let finalUrl = uploadUrl;
        if (finalUrl.includes('//minio:9000')) {
            finalUrl = finalUrl.replace('//minio:9000', '//localhost:9000');
        }
        finalUrl = finalUrl.replace('https://localhost:9000', 'http://localhost:9000');
        xhr.open('PUT', finalUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
}

/** Step 3: tell the backend the upload is done. */
export const confirmUpload = (token: string, resumeId: string): Promise<ResumeFile> =>
    api<ResumeFile>(`/resumes/${resumeId}/confirm`, token, { method: 'POST' });

/** Returns all confirmed resumes for the current user. */
export const listResumes = (token: string): Promise<ResumeFile[]> =>
    api<ResumeFile[]>('/resumes', token);

/** Returns a short-lived download URL. */
export const getDownloadUrl = async (token: string, resumeId: string): Promise<DownloadUrlResponse> => {
    const res = await api<DownloadUrlResponse>(`/resumes/${resumeId}/download-url`, token);
    if (res.downloadUrl.includes('//minio:9000')) {
        res.downloadUrl = res.downloadUrl.replace('//minio:9000', '//localhost:9000');
    }
    res.downloadUrl = res.downloadUrl.replace('https://localhost:9000', 'http://localhost:9000');
    return res;
};

/** Permanently deletes a resume. */
export const deleteResume = (token: string, resumeId: string): Promise<void> =>
    api<void>(`/resumes/${resumeId}`, token, { method: 'DELETE' });
