import { useState } from 'react';
import { Button, Flex, Input, Typography, Tag, message } from 'antd';
import { LinkedinOutlined, CheckCircleFilled, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuth } from '@clerk/react';
import { updateProfile } from '../services/profileService';

const { Text } = Typography;

/** Accepts a full URL, "linkedin.com/in/handle", or a bare handle. */
function normalizeLinkedInInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed; // server normalizes/validates; we just pass the raw text through
}

interface LinkedInUrlFieldProps {
  /** Current saved LinkedIn URL, or null/undefined if none is set yet. */
  value?: string | null;
  /** Called with the newly-saved URL (or null after a clear) once the PATCH succeeds. */
  onSaved: (url: string | null) => void;
  isLoading?: boolean;
  /** Smaller inline variant for cards that already have their own chrome. */
  compact?: boolean;
}

/**
 * Replaces the old "Connect LinkedIn" OAuth button. The AI worker only ever
 * needs a LinkedIn profile URL to scrape (Worker/tasks/analysis1_job.py →
 * ai_client.format_linkedin_url) — it never uses an OAuth access token — so
 * asking the user to type/paste their profile link is both simpler and more
 * reliable than round-tripping through LinkedIn's consent screen.
 */
export function LinkedInUrlField({ value, onSaved, isLoading, compact = false }: LinkedInUrlFieldProps) {
  const { getToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgApi, ctx] = message.useMessage();

  const isLinked = !!value && !editing;

  const startEditing = () => {
    setInput(value ?? '');
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setError(null);
    const normalized = normalizeLinkedInInput(input);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await updateProfile(token, {
        socialLinks: { linkedin: normalized ?? '' },
      });
      const saved = res.data.socialLinks.linkedin ?? null;
      onSaved(saved);
      setEditing(false);
      msgApi.success(saved ? 'LinkedIn saved.' : 'LinkedIn removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      try {
        const parsed = JSON.parse(msg);
        setError(parsed?.message ?? 'Could not save your LinkedIn link.');
      } catch {
        setError('Could not save your LinkedIn link. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLinked) {
    return (
      <>
        {ctx}
        <Flex align="center" gap={10}>
          <Tag
            icon={<CheckCircleFilled />}
            style={{
              background: 'rgba(0,119,181,0.12)',
              border: '1px solid rgba(0,119,181,0.30)',
              color: '#00A0DC', borderRadius: 8, fontSize: 12,
            }}
          >
            <a href={value!} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
              {value!.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </Tag>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={startEditing} style={{ color: 'var(--text-secondary)' }}>
            Edit
          </Button>
        </Flex>
      </>
    );
  }

  return (
    <>
      {ctx}
      <Flex vertical gap={6} style={{ width: compact ? 260 : '100%' }}>
        <Flex gap={8}>
          <Input
            prefix={<LinkedinOutlined style={{ color: 'var(--text-tertiary)' }} />}
            placeholder="linkedin.com/in/your-handle"
            value={input}
            disabled={isLoading || saving}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSave}
            status={error ? 'error' : undefined}
            style={{ borderRadius: 10 }}
          />
          <Button type="primary" loading={saving} onClick={handleSave} style={{ borderRadius: 10 }}>
            Save
          </Button>
          {value && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => { setEditing(false); setInput(value ?? ''); setError(null); }}
              style={{ color: 'var(--text-tertiary)' }}
            />
          )}
        </Flex>
        {error && <Text style={{ color: '#EF4444', fontSize: 12 }}>{error}</Text>}
      </Flex>
    </>
  );
}
