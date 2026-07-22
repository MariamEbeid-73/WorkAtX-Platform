import { useState } from 'react';
import {
  Modal, Form, Input, Select, Checkbox, InputNumber, Flex, Typography, Button,
  Divider, Tag, Upload, message,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  UserOutlined, GithubOutlined, LinkedinOutlined, MailOutlined,
  PhoneOutlined, UploadOutlined, SaveOutlined,
} from '@ant-design/icons';
import { initiateOAuth } from '../../services/oauthService';
import { useAuth } from '@clerk/react';

const { Text } = Typography;
const { TextArea } = Input;

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const JOB_TYPE_OPTIONS = [
  { label: '💼 Internship', value: 'internship' },
  { label: '🏢 Full-Time', value: 'full-time' },
];

const WORK_PREF_OPTIONS = [
  { label: '🌐 Remote', value: 'remote' },
  { label: '🤝 Hybrid', value: 'hybrid' },
  { label: '🏙️ Onsite', value: 'onsite' },
];

const DEGREE_OPTIONS = [
  'Bachelor of Technology (B.Tech) in Computer Science and Engineering',
  'B.Tech / B.E. in Information Technology',
  'B.Sc. in Computer Science',
  'M.Tech / M.E. in CSE',
  'MCA',
  'BCA',
  'Other',
];

export function CompleteProfileModal({ open, onClose }: CompleteProfileModalProps) {
  const { getToken } = useAuth();
  const [form] = Form.useForm();
  const [resumeFile, setResumeFile] = useState<UploadFile | null>(null);
  const [msgApi, ctx] = message.useMessage();

  const handleSave = async (values: Record<string, unknown>) => {
    console.log('Profile update payload:', { ...values, resume: resumeFile });
    // TODO: call PATCH /api/profile with form data
    msgApi.success('Profile updated successfully!');
    onClose();
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            degree: 'Bachelor of Technology (B.Tech) in Computer Science and Engineering',
            graduationYear: 2027,
            minStipend: 50000,
            jobTypes: ['internship', 'full-time'],
            workPrefs: ['remote', 'hybrid', 'onsite'],
            contactEmail: 'your.email@example.com',
            contactPhone: '+91 98765 43210',
            bio: '',
          }}
        >
          {/* ── Education ──────────────────────────────────────────────── */}
          {sectionLabel('Education')}
          <Form.Item label="Currently Pursuing" name="degree">
            <Select options={DEGREE_OPTIONS.map((d) => ({ label: d, value: d }))} style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item label="Expected Graduation Year" name="graduationYear">
            <InputNumber min={2024 as number} max={2035 as number} style={{ width: '100%', borderRadius: 10 }} />
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
              min={0 as number}
              step={5000}
              formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v!.replace(/₹\s?|(,*)/g, ''))}
              style={{ width: '100%', borderRadius: 10 }}
            />
          </Form.Item>

          <Divider style={{ borderColor: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

          {/* ── Contact ────────────────────────────────────────────────── */}
          {sectionLabel('Contact Information')}
          <Form.Item label="Contact Email" name="contactEmail" rules={[{ type: 'email' }]}>
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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <Flex align="center" gap={10}>
                <GithubOutlined style={{ fontSize: 18, color: 'var(--text-primary)' }} />
                <Flex vertical gap={1}>
                  <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>GitHub</Text>
                  <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Connect to verify developer identity</Text>
                </Flex>
              </Flex>
              <Button
                icon={<GithubOutlined />}
                onClick={async () => {
                  const token = await getToken();
                  if (token) await initiateOAuth('github', token);
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
            </Flex>

            {/* LinkedIn */}
            <Flex
              align="center"
              justify="space-between"
              gap={12}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <Flex align="center" gap={10}>
                <LinkedinOutlined style={{ fontSize: 18, color: '#0077B5' }} />
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
                  <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Import work history and skills</Text>
                </Flex>
              </Flex>
              <Button
                icon={<LinkedinOutlined />}
                onClick={async () => {
                  const token = await getToken();
                  if (token) await initiateOAuth('linkedin', token);
                }}
                style={{
                  background: 'rgba(0,119,181,0.08)',
                  border: '1px solid rgba(0,119,181,0.20)',
                  color: '#00A0DC',
                  borderRadius: 10, fontWeight: 600, height: 36,
                }}
              >
                Connect
              </Button>
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
          <Upload
            name="resume" accept=".pdf,.doc,.docx" maxCount={1}
            beforeUpload={(f) => { setResumeFile(f as UploadFile); return false; }}
            onRemove={() => setResumeFile(null)}
          >
            <Button icon={<UploadOutlined />} style={{
              borderRadius: 10, height: 40,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-secondary)',
            }}>
              {resumeFile ? 'Change Resume' : 'Upload New Resume'}
            </Button>
          </Upload>

          {/* ── Submit ─────────────────────────────────────────────────── */}
          <Flex justify="flex-end" gap={12} style={{ marginTop: 28 }}>
            <Button onClick={onClose} style={{ borderRadius: 10, height: 44 }}>Cancel</Button>
            <Button
              type="primary" htmlType="submit"
              icon={<SaveOutlined />}
              style={{
                borderRadius: 10, height: 44, fontWeight: 600, paddingInline: 28,
                background: 'linear-gradient(135deg, #7C3AED, #0891B2)', border: 'none',
              }}
            >
              Save Profile
            </Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}
