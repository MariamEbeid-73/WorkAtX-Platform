import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { Card, Button, Flex, Typography, Upload, Progress, message, Spin, Popconfirm } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  createUploadIntent,
  uploadToStorage,
  confirmUpload,
  listResumes,
  getDownloadUrl,
  deleteResume,
} from '../services/resumeService';
import { waitForJobCompletion } from '../services/jobService';
import type { ResumeFile } from '../types/resume';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE_MB = 10;

export function ResumesPage() {
  const { getToken } = useAuth();
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parseStage, setParseStage] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msgApi, ctx] = message.useMessage();

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
      msgApi.error('Only PDF and DOCX files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      msgApi.error(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setParseStage(null);
      setParseProgress(0);
      const token = await getToken();
      const { resumeId, uploadUrl } = await createUploadIntent(token!, file);
      await uploadToStorage(uploadUrl, file, (pct) => setUploadProgress(pct));
      const { analysisJobId } = await confirmUpload(token!, resumeId);
      setUploading(false);
      setUploadProgress(0);
      msgApi.success('Resume uploaded!');

      // Same wait path as chat: SignalR push first, polling as fallback.
      if (analysisJobId) {
        setParsing(true);
        try {
          const finalStatus = await waitForJobCompletion(getToken, token!, analysisJobId, {
            onProgress: (u) => {
              if (u.stage) setParseStage(u.stage);
              if (u.progress != null) setParseProgress(u.progress);
            },
          });
          if (finalStatus.status === 'failed') {
            msgApi.warning('Upload succeeded, but the AI analysis failed.');
          }
        } finally {
          setParsing(false);
        }
      }

      await loadResumes();
    } catch (e: any) {
      setUploading(false);
      setParsing(false);
      msgApi.error(e.message ?? 'Upload failed.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      const token = await getToken();
      await deleteResume(token!, id);
      setResumes(prev => prev.filter(r => r.id !== id));
      msgApi.success('Resume deleted.');
    } catch {
      msgApi.error('Failed to delete resume.');
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
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {ctx}
      <Flex vertical gap={8} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Resumes
        </Title>
        <Text style={{ color: 'var(--text-secondary)' }}>
          Upload your CV for AI analysis. PDF or DOCX, max {MAX_SIZE_MB} MB.
        </Text>
      </Flex>

      <Dragger
        name="resume"
        accept=".pdf,.docx"
        maxCount={1}
        disabled={uploading}
        beforeUpload={(file) => { handleFile(file); return false; }}
        showUploadList={false}
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '2px dashed rgba(139,92,246,0.30)',
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <Flex vertical align="center" gap={12} style={{ padding: '24px 16px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(139,92,246,0.10)',
            border: '1px solid rgba(139,92,246,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UploadOutlined style={{ fontSize: 24, color: 'var(--color-primary-400)' }} />
          </div>
          <Flex vertical align="center" gap={4}>
            <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Drop your resume here or click to browse
            </Text>
            <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              PDF or DOCX · Max {MAX_SIZE_MB} MB
            </Text>
          </Flex>
        </Flex>
      </Dragger>

      {uploading && (
        <Progress
          percent={uploadProgress}
          strokeColor={{ '0%': '#8B5CF6', '100%': '#06B6D4' }}
          trailColor="rgba(255,255,255,0.06)"
          style={{ marginBottom: 24 }}
        />
      )}

      {parsing && (
        <Flex vertical gap={4} style={{ marginBottom: 24 }}>
          <Progress
            percent={parseProgress}
            strokeColor={{ '0%': '#8B5CF6', '100%': '#06B6D4' }}
            trailColor="rgba(255,255,255,0.06)"
          />
          <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {parseStage ?? 'Analyzing your CV…'}
          </Text>
        </Flex>
      )}

      {loading ? (
        <Flex justify="center" style={{ padding: 48 }}>
          <Spin size="large" />
        </Flex>
      ) : resumes.length === 0 ? (
        <Flex justify="center" style={{ padding: 32 }}>
          <Text style={{ color: 'var(--text-tertiary)' }}>No resumes uploaded yet.</Text>
        </Flex>
      ) : (
        <Flex vertical gap={10}>
          {resumes.map((r) => (
            <Card
              key={r.id}
              bordered
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
              }}
              bodyStyle={{ padding: '14px 18px' }}
            >
              <Flex align="center" justify="space-between" gap={12}>
                <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                  {r.contentType === 'application/pdf'
                    ? <FilePdfOutlined style={{ fontSize: 24, color: '#EF4444' }} />
                    : <FileTextOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
                  }
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Text
                      style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                      ellipsis
                    >
                      {r.fileName}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {formatSize(r.sizeBytes)} · {new Date(r.uploadedAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Flex>
                <Flex gap={8} style={{ flexShrink: 0 }}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(r.id, r.fileName)}
                    style={{ borderRadius: 8 }}
                  >
                    Download
                  </Button>
                  <Popconfirm
                    title="Delete this resume?"
                    description="This cannot be undone."
                    onConfirm={() => handleDelete(r.id)}
                    okText="Delete"
                    cancelText="Cancel"
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleting === r.id}
                      style={{ borderRadius: 8 }}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </div>
  );
}
