import { useCallback, useEffect, useRef, useState } from 'react';
import { Flex, Typography, Input, Button, Tooltip, Alert, Avatar } from 'antd';
import {
  SendOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  FileSearchOutlined,
  ReadOutlined,
  TrophyOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useUser } from '@clerk/react';
import { useChat } from '../hooks/useChat';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatMessageBubble } from '../components/chat/ChatMessageBubble';
import type { TechChoiceSelections } from '../types/chat';
import './GeniPage.css';

const { Title, Text } = Typography;

const CAPABILITIES = [
  {
    icon: <FileSearchOutlined />,
    title: 'Analyze my resume gaps',
    desc: 'Find skill gaps against target roles',
    prompt: 'Analyze my resume gaps',
    color: '#8B5CF6',
  },
  {
    icon: <ReadOutlined />,
    title: 'Create a study plan',
    desc: 'Get a tailored 30-day learning roadmap',
    prompt: 'Create a 30-day study plan for system design',
    color: '#06B6D4',
  },
  {
    icon: <TrophyOutlined />,
    title: 'Check role fit',
    desc: 'Compare your profile with job requirements',
    prompt: 'Compare my profile with Meta requirements',
    color: '#10B981',
  },
  {
    icon: <BulbOutlined />,
    title: 'Career advice',
    desc: 'Get personalized guidance for your path',
    prompt: 'What skills do I need for a Google SWE role?',
    color: '#F59E0B',
  },
];

export function GeniPage() {
  const { user } = useUser();
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    sessionsLoading,
    sessionsError,
    activeSessionId,
    messages,
    messagesLoading,
    isSending,
    sendError,
    pendingStage,
    startNewChat,
    selectSession,
    renameSession,
    archiveSession,
    sendMessage,
    resumeStudyPlanWithSelections,
  } = useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join('') || 'U';

  const handleSend = (text?: string) => {
    const content = text ?? input;
    if (!content.trim()) return;
    sendMessage(content);
    setInput('');
  };

  /**
   * Bridges ChatMessageBubble's per-message callback to useChat's
   * session-scoped resumeStudyPlanWithSelections. Guards against the
   * (shouldn't-happen-in-practice) case of no active session, since a
   * gap_analysis message can only exist inside one.
   */
  const handleResumeWithSelections = useCallback(
    (jobId: string, selections: TechChoiceSelections) => {
      if (!resumeStudyPlanWithSelections) return Promise.resolve();
      return resumeStudyPlanWithSelections(jobId, selections);
    },
    [resumeStudyPlanWithSelections],
  );

  const isEmptyState = !activeSessionId && messages.length === 0;

  return (
    <div
      className="geni-page-root"
      style={{
        animation: 'fadeIn 0.5s ease both',
        height: 'calc(100vh - 88px)',
        display: 'flex',
        gap: 0,
      }}
    >
      {sidebarOpen && (
        <>
          <div
            className="geni-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            isLoading={sessionsLoading}
            error={sessionsError}
            onSelect={selectSession}
            onNewChat={startNewChat}
            onRename={renameSession}
            onArchive={archiveSession}
            onCollapse={() => setSidebarOpen(false)}
            className="chat-sidebar--drawer-open"
          />
        </>
      )}

      <div className="geni-chat-window">
        {/* ── Header ─────────────────────────────────────────────── */}
        <Flex align="center" justify="space-between" className="geni-header">
          <Flex align="center" gap={12}>
            {!sidebarOpen && (
              <Tooltip title="Chats">
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open chat history"
                />
              </Tooltip>
            )}
            <div className="geni-header__avatar-wrap">
              <Avatar
                icon={<RobotOutlined />}
                size={38}
                className="geni-header__avatar"
              />
              <span className="geni-header__dot" />
            </div>
            <Flex vertical gap={0}>
              <Title level={5} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16 }}>
                Geni
              </Title>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                AI career assistant
              </Text>
            </Flex>
          </Flex>
        </Flex>

        {/* ── Messages ───────────────────────────────────────────── */}
        {isEmptyState && !messagesLoading ? (
          <div className="geni-hero">
            <div className="geni-hero__glow" />

            <div className="geni-hero__orb animate-scale-in">
              <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
            </div>

            <div className="geni-hero__text animate-fade-in-up">
              <h1 className="geni-hero__greeting">
                Hi{user?.firstName ? `, ${user.firstName}` : ''}! I'm{' '}
                <span className="gradient-text">Geni</span>
              </h1>
              <Text className="geni-hero__subtitle">
                Your AI career assistant — ask about skill gaps, study plans, or role fit.
              </Text>
            </div>

            <div className="geni-cap-grid">
              {CAPABILITIES.map((cap, i) => (
                <button
                  key={cap.prompt}
                  className="geni-cap-card"
                  onClick={() => handleSend(cap.prompt)}
                  style={{
                    animationDelay: `${0.3 + i * 0.1}s`,
                  }}
                >
                  <div
                    className="geni-cap-card__icon"
                    style={{
                      background: `${cap.color}18`,
                      borderColor: `${cap.color}30`,
                      color: cap.color,
                    }}
                  >
                    {cap.icon}
                  </div>
                  <Flex vertical gap={2} style={{ textAlign: 'left' }}>
                    <Text style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {cap.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                      {cap.desc}
                    </Text>
                  </Flex>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="geni-chat-scroll">
            {messagesLoading && <Text type="secondary">Loading conversation…</Text>}

            {!messagesLoading &&
              messages.map((m) => (
                <ChatMessageBubble
                  key={m.id}
                  message={m}
                  userInitials={initials}
                  onResumeWithSelections={handleResumeWithSelections}
                />
              ))}

            <div ref={messagesEndRef} />
          </div>
        )}

        {sendError && (
          <Alert
            type="error"
            message={sendError}
            closable
            style={{ marginBottom: 8, flexShrink: 0 }}
          />
        )}

        {/* ── Composer ───────────────────────────────────────────── */}
        <div className={`geni-composer ${isSending ? 'geni-composer--disabled' : ''}`}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isSending && pendingStage ? `Geni is ${pendingStage.toLowerCase()}…` : 'Ask Geni anything about your career…'}
            autoSize={{ minRows: 1, maxRows: 5 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isSending}
            className="geni-composer__input"
          />
          <Flex align="center" justify="space-between" className="geni-composer__footer">
            <Text className="geni-composer__hint">
              ↵ send · ⇧↵ newline
            </Text>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSend()}
              loading={isSending}
              disabled={!input.trim()}
              className="geni-composer__send"
            >
              Send
            </Button>
          </Flex>
        </div>
      </div>
    </div>
  );
}
