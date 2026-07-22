import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import {
    createUploadIntent,
    uploadToMinIO,
    confirmUpload,
    listResumes,
    getDownloadUrl,
    deleteResume,
} from '../services/resumeService';
import type { ResumeFile } from '../types/resume';

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE_MB = 10;

type UploadState = { status: 'idle' } | { status: 'uploading'; progress: number } | { status: 'error'; message: string };

export function ResumesPage() {
    const { getToken } = useAuth();
    const [resumes, setResumes] = useState<ResumeFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
    const [deleting, setDeleting] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadResumes = useCallback(async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const data = await listResumes(token!);
            setResumes(data);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => { loadResumes(); }, [loadResumes]);

    const handleFile = async (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            setUploadState({ status: 'error', message: 'Only PDF and DOCX files are allowed.' });
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setUploadState({ status: 'error', message: `File must be under ${MAX_SIZE_MB} MB.` });
            return;
        }

        try {
            setUploadState({ status: 'uploading', progress: 0 });
            const token = await getToken();

            // Step 1: get pre-signed URL
            const { resumeId, uploadUrl } = await createUploadIntent(token!, file);

            // Step 2: upload directly to MinIO
            await uploadToMinIO(uploadUrl, file, (pct) =>
                setUploadState({ status: 'uploading', progress: pct })
            );

            // Step 3: confirm with backend
            await confirmUpload(token!, resumeId);

            setUploadState({ status: 'idle' });
            await loadResumes(); // refresh the list
        } catch (e: any) {
            setUploadState({ status: 'error', message: e.message ?? 'Upload failed.' });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this resume? This cannot be undone.')) return;
        try {
            setDeleting(id);
            const token = await getToken();
            await deleteResume(token!, id);
            setResumes(prev => prev.filter(r => r.id !== id));
        } finally {
            setDeleting(null);
        }
    };

    const handleDownload = async (id: string, fileName: string) => {
        const token = await getToken();
        const { downloadUrl } = await getDownloadUrl(token!, id);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        a.click();
    };

    const formatSize = (bytes: number) =>
        bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Resumes</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                Upload your CV for AI analysis. PDF or DOCX, max 10 MB.
            </p>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
                    borderRadius: 12,
                    padding: '2.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? '#f5f3ff' : '#fafafa',
                    transition: 'all 0.2s',
                    marginBottom: '1.5rem',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#888' }}>PDF or DOCX · Max 10 MB</div>
            </div>

            {/* Upload Progress */}
            {uploadState.status === 'uploading' && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                        <span>Uploading…</span>
                        <span>{uploadState.progress}%</span>
                    </div>
                    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${uploadState.progress}%`, background: '#6366f1', borderRadius: 99, transition: 'width 0.2s' }} />
                    </div>
                </div>
            )}

            {/* Error State */}
            {uploadState.status === 'error' && (
                <div style={{ background: '#fee', border: '1px solid #f88', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#c00' }}>
                    {uploadState.message}
                    <button onClick={() => setUploadState({ status: 'idle' })} style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontWeight: 600 }}>✕</button>
                </div>
            )}

            {/* Resume List */}
            {loading ? (
                <p>Loading resumes…</p>
            ) : resumes.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No resumes uploaded yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {resumes.map((r) => (
                        <div
                            key={r.id}
                            style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: 10,
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                <span style={{ fontSize: '1.5rem' }}>{r.contentType === 'application/pdf' ? '📕' : '📘'}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fileName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {formatSize(r.sizeBytes)} · {new Date(r.uploadedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                <button
                                    onClick={() => handleDownload(r.id, r.fileName)}
                                    style={{ padding: '0.4rem 0.9rem', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', cursor: 'pointer' }}
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    disabled={deleting === r.id}
                                    style={{ padding: '0.4rem 0.9rem', border: '1px solid #f87171', borderRadius: 8, background: 'white', color: '#ef4444', cursor: 'pointer' }}
                                >
                                    {deleting === r.id ? '…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
