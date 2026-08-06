import { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Checkbox, InputNumber, Flex, Typography, Button,
  Divider, Tag, Upload, message, Skeleton,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  UserOutlined, GithubOutlined, LinkedinOutlined, MailOutlined,
  PhoneOutlined, UploadOutlined, SaveOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import { initiateOAuth, getConnections } from '../../services/oauthService';
import { getProfile, updateProfile } from '../../services/profileService';
import { createUploadIntent, uploadToMinIO, confirmUpload, listResumes } from '../../services/resumeService';
import { useAuth } from '@clerk/react';
import type { ConnectedProvider } from '../../types/oauth';
import { LinkedInUrlField } from '../LinkedInUrlField';

const { Text } = Typography;
const { TextArea } = Input;

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const DEGREE_OPTIONS = [
  'Bachelor of Technology (B.Tech) in Computer Science and Engineering',
  'B.Tech / B.E. in Information Technology',
  'B.Sc. in Computer Science',
  'M.Tech / M.E. in CSE',
  'MCA',
  'BCA',
  'Other',
];

const JOB_TYPE_OPTIONS = [
  { label: 'Internship', value: 'internship' },
  { label: 'Full-Time', value: 'full-time' },
];

const WORK_PREF_OPTIONS = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Onsite', value: 'onsite' },
];

export function CompleteProfileModal({ open, onClose }: CompleteProfileModalProps) {
  const { getToken } = useAuth();
  const [form] = Form.useForm();
  const [resumeFile, setResumeFile] = useState<UploadFile | null>(null);
  const [alreadyHasResume, setAlreadyHasResume] = useState(false);
  const [existingResumeName, setExistingResumeName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [connections, setConnections] = useState<ConnectedProvider[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msgApi, ctx] = message.useMessage();

  const githubConn = connections.find(c => c.provider === 'github') ?? null;

  useEffect(() => {
    if (!open) return;

    const init = async () => {
      const token = await getToken();
      if (!token) return;

      setProfileLoading(true);

      try {
        const [profileRes, conns, resumes] = await Promise.all([
          getProfile(token),
          getConnections(token),
          listResumes(token),
        ]);
        const p = profileRes.data;
        setConnections(conns);
        setLinkedinUrl(p.socialLinks.linkedin ?? null);
        if (resumes.length > 0) {
          setAlreadyHasResume(true);
          setExistingResumeName(resumes[0].fileName);
        }

        form.setFieldsValue({
          degree: p.degree ?? undefined,
          graduationYear: p.graduationYear ?? undefined,
          jobTypes: p.jobTypes ?? [],
          workPrefs: p.workPrefs ?? [],
          minStipend: p.minStipend ?? undefined,
          contactEmail: p.contactEmail ?? '',
          contactPhone: p.contactPhone ?? '',
          bio: p.bio ?? '',
        });
      } catch {
        // silently degrade — form will be empty
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, [open, getToken, form]);

  useEffect(() => {
    if (!open) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'oauth-connected') return;

      (async () => {
        const token = await getToken();
        if (!token) return;
        try {
          const data = await getConnections(token);
          setConnections(data);
        } catch {
          // silently degrade
        }
      })();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, getToken]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      if (resumeFile) {
        setUploading(true);
        const file = resumeFile as unknown as File;
        const { resumeId, uploadUrl } = await createUploadIntent(token, file);
        await uploadToMinIO(uploadUrl, file, () => {});
        await confirmUpload(token, resumeId);
        setUploading(false);
      }

      await updateProfile(token, {
        degree: values.degree,
        graduationYear: values.graduationYear,
        minStipend: values.minStipend,
        jobTypes: values.jobTypes,
        workPrefs: values.workPrefs,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        bio: values.bio || undefined,
      });

      msgApi.success('Profile updated!');
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      msgApi.error(err?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const sectionLabel = (text: string) => (
    <Text style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
      display: 'block', marginBottom: 12,
    }}>
      {text}
    </Text>
  );

  return (
    <>
      {ctx}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={600}
        title={
          <Flex align="center" gap={12}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <Flex vertical gap={1}>
              <Text strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>Complete Your Profile</Text>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Fill in details to maximize your match score
              </Text>
            </Flex>
          </Flex>
        }
        style={{ background: 'var(--bg-elevated)', borderRadius: 20, overflow: 'hidden' }}
        styles={{
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '20px 24px 16px',
          },
          body: { padding: '24px', maxHeight: '70vh', overflowY: 'auto' },
        }}
      >
        {profileLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Form form={form} layout="vertical">
            {/* ── Education ──────────────────────────────────────────────── */}
            {sectionLabel('Education')}
            <Form.Item label="Currently Pursuing" name="degree">
              <Select options={DEGREE_OPTIONS.map((d) => ({ label: d, value: d }))} style={{ borderRadius: 10 }} />
            </Form.Item>
            <Form.Item label="Expected Graduation Year" name="graduationYear">
              <InputNumber min={2024} max={2035} style={{ width: '100%', borderRadius: 10 }} />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

            {/* ── Job Preferences ────────────────────────────────────────── */}
            {sectionLabel('Job Preferences')}
            <Form.Item label="Job Type" name="jobTypes">
              <Checkbox.Group options={JOB_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item label="Work Preference" name="workPrefs">
              <Checkbox.Group options={WORK_PREF_OPTIONS} />
            </Form.Item>
            <Form.Item label="Min Monthly Stipend (₹)" name="minStipend">
              <InputNumber
                min={0}
                step={5000}
                formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/₹\s?|(,*)/g, '') ?? 0) as 0}
                style={{ width: '100%', borderRadius: 10 }}
              />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

            {/* ── Contact ────────────────────────────────────────────────── */}
            {sectionLabel('Contact Information')}
            <Form.Item label="Contact Email" name="contactEmail" rules={[{ type: 'email', message: 'Invalid email' }]}>
              <Input prefix={<MailOutlined style={{ color: 'var(--text-tertiary)' }} />}
                placeholder="your.email@example.com" style={{ borderRadius: 10, height: 40 }} />
            </Form.Item>
            <Form.Item label="Contact Number" name="contactPhone">
              <Input prefix={<PhoneOutlined style={{ color: 'var(--text-tertiary)' }} />}
                placeholder="+91 98765 43210" style={{ borderRadius: 10, height: 40 }} />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

            {/* ── Social Links ───────────────────────────────────────────── */}
            {sectionLabel('Social Accounts')}
            <Flex vertical gap={10}>
              {/* GitHub */}
              <Flex
                align="center"
                justify="space-between"
                gap={12}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: githubConn ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${githubConn ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.10)'}`,
                }}
              >
                <Flex align="center" gap={10}>
                  <GithubOutlined style={{ fontSize: 18, color: githubConn ? '#10B981' : 'var(--text-primary)' }} />
                  <Flex vertical gap={1}>
                    <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>GitHub</Text>
                    <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {githubConn
                        ? githubConn.username ? `@${githubConn.username}` : 'Connected'
                        : 'Connect to verify developer identity'}
                    </Text>
                  </Flex>
                </Flex>
                {githubConn ? (
                  <Tag
                    icon={<CheckCircleFilled />}
                    style={{
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.30)',
                      color: '#10B981', borderRadius: 8, fontSize: 12,
                    }}
                  >
                    Connected
                  </Tag>
                ) : (
                  <Button
                    icon={<GithubOutlined />}
                    onClick={async () => {
                      const token = await getToken();
                      if (token) await initiateOAuth('github', token, true);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'var(--text-primary)',
                      borderRadius: 10, fontWeight: 600, height: 36,
                    }}
                  >
                    Connect
                  </Button>
                )}
              </Flex>

              {/* LinkedIn — plain URL field; the AI worker only needs the
                  profile link to scrape, never an OAuth token. */}
              <Flex
                align="center"
                justify="space-between"
                gap={12}
                wrap="wrap"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: linkedinUrl ? 'rgba(0,119,181,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${linkedinUrl ? 'rgba(0,119,181,0.25)' : 'rgba(255,255,255,0.10)'}`,
                }}
              >
                <Flex align="center" gap={10}>
                  <LinkedinOutlined style={{ fontSize: 18, color: linkedinUrl ? '#0077B5' : 'var(--text-secondary)' }} />
                  <Flex vertical gap={1}>
                    <Flex align="center" gap={6}>
                      <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>LinkedIn</Text>
                      <Tag style={{
                        borderRadius: 6, fontSize: 10, lineHeight: '16px', padding: '0 6px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'var(--text-tertiary)',
                      }}>Optional</Tag>
                    </Flex>
                    {!linkedinUrl && (
                      <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Paste your profile link
                      </Text>
                    )}
                  </Flex>
                </Flex>

                <LinkedInUrlField value={linkedinUrl} onSaved={setLinkedinUrl} compact />
              </Flex>
            </Flex>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

            {/* ── Bio ────────────────────────────────────────────────────── */}
            {sectionLabel('Bio')}
            <Form.Item name="bio">
              <TextArea rows={3} placeholder="Tell us a bit about yourself…"
                style={{ borderRadius: 10, background: 'rgba(255,255,255,0.03)', resize: 'none' }} />
            </Form.Item>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

            {/* ── Resume Update ──────────────────────────────────────────── */}
            {sectionLabel('Resume')}
            {alreadyHasResume && !resumeFile && (
              <Flex align="center" gap={10} style={{ marginBottom: 12 }}>
                <CheckCircleFilled style={{ color: '#10B981', fontSize: 14 }} />
                <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Current: {existingResumeName}
                </Text>
              </Flex>
            )}
            <Upload
              name="resume" accept=".pdf,.doc,.docx" maxCount={1}
              beforeUpload={(f) => { setResumeFile(f as UploadFile); return false; }}
              onRemove={() => setResumeFile(null)}
            >
              <Button icon={<UploadOutlined />} loading={uploading} style={{
                borderRadius: 10, height: 40,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text-secondary)',
              }}>
                {resumeFile
                  ? (resumeFile as unknown as File).name
                  : alreadyHasResume
                    ? 'Replace Resume'
                    : 'Upload New Resume'}
              </Button>
            </Upload>

            {/* ── Submit ─────────────────────────────────────────────────── */}
            <Flex justify="flex-end" gap={12} style={{ marginTop: 28 }}>
              <Button onClick={onClose} style={{ borderRadius: 10, height: 44 }}>Cancel</Button>
              <Button
                type="primary"
                loading={saving || uploading}
                icon={<SaveOutlined />}
                onClick={handleSave}
                style={{
                  borderRadius: 10, height: 44, fontWeight: 600, paddingInline: 28,
                  background: 'linear-gradient(135deg, #7C3AED, #0891B2)', border: 'none',
                }}
              >
                Save Profile
              </Button>
            </Flex>
          </Form>
        )}
      </Modal>
    </>
  );
}
