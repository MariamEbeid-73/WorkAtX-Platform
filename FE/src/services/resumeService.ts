import { config } from '../config';
import type { ResumeFile, UploadIntentResponse, DownloadUrlResponse } from '../types/resume';

async function authFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${config.apiUrl}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...init.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
}

/** Step 1: get a pre-signed upload URL from the backend. */
export const createUploadIntent = (
    token: string,
    file: File,
): Promise<UploadIntentResponse> =>
    authFetch<UploadIntentResponse>('/resumes/upload-intent', token, {
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
    authFetch<ResumeFile>(`/resumes/${resumeId}/confirm`, token, { method: 'POST' });

/** Returns all confirmed resumes for the current user. */
export const listResumes = (token: string): Promise<ResumeFile[]> =>
    authFetch<ResumeFile[]>('/resumes', token);

/** Returns a short-lived download URL. */
export const getDownloadUrl = async (token: string, resumeId: string): Promise<DownloadUrlResponse> => {
    const res = await authFetch<DownloadUrlResponse>(`/resumes/${resumeId}/download-url`, token);
    if (res.downloadUrl.includes('//minio:9000')) {
        res.downloadUrl = res.downloadUrl.replace('//minio:9000', '//localhost:9000');
    }
    res.downloadUrl = res.downloadUrl.replace('https://localhost:9000', 'http://localhost:9000');
    return res;
};

/** Permanently deletes a resume. */
export const deleteResume = (token: string, resumeId: string): Promise<void> =>
    authFetch<void>(`/resumes/${resumeId}`, token, { method: 'DELETE' });
