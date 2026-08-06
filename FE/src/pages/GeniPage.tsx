import { useEffect, useRef, useState } from 'react';
import { Flex, Typography, Input, Button, Tooltip, Alert } from 'antd';
import { SendOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useUser } from '@clerk/react';
import { useChat } from '../hooks/useChat';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatMessageBubble } from '../components/chat/ChatMessageBubble';
import './GeniPage.css';

const { Title, Text } = Typography;

const SAMPLE_PROMPTS = [
  'What skills do I need for a Google SWE role?',
  'Analyze my resume gaps',
  'Create a 30-day study plan for system design',
  'Compare my profile with Meta requirements',
];

export function GeniPage() {
  const { user } = useUser();
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    startNewChat,
    selectSession,
    renameSession,
    archiveSession,
    sendMessage,
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

  const isEmptyState = !activeSessionId && messages.length === 0;

  return (
    <div
      style={{
        animation: 'fadeIn 0.5s ease both',
        height: 'calc(100vh - 88px)',
        display: 'flex',
        gap: 0,
      }}
    >
      {sidebarOpen && (
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
        />
      )}

      <div className="geni-chat-window">
        {/* ── Header ─────────────────────────────────────────────── */}
        <Flex align="center" justify="space-between" style={{ marginBottom: 16, flexShrink: 0 }}>
          <Flex align="center" gap={10}>
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
            <Flex vertical gap={2}>
              <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                AI Assistant
              </Text>
              <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
                Geni
              </Title>
            </Flex>
          </Flex>
        </Flex>

        {/* ── Messages ───────────────────────────────────────────── */}
        <div className="geni-chat-scroll">
          {messagesLoading && <Text type="secondary">Loading conversation…</Text>}

          {isEmptyState && !messagesLoading && (
            <div className="geni-chat-empty">
              <Title level={3} style={{ color: 'var(--text-primary)' }}>
                Hi{user?.firstName ? `, ${user.firstName}` : ''}! I'm Geni.
              </Title>
              <Text type="secondary">
                Your AI career assistant — ask about skill gaps, study plans, or role fit.
              </Text>
              <Flex wrap gap={8} style={{ marginTop: 20 }}>
                {SAMPLE_PROMPTS.map((p) => (
                  <Button key={p} onClick={() => handleSend(p)} className="geni-sample-btn">
                    {p}
                  </Button>
                ))}
              </Flex>
            </div>
          )}

          {!messagesLoading &&
            messages.map((m) => (
              <ChatMessageBubble key={m.id} message={m} userInitials={initials} />
            ))}

          <div ref={messagesEndRef} />
        </div>

        {sendError && (
          <Alert
            type="error"
            message={sendError}
            closable
            style={{ marginBottom: 8, flexShrink: 0 }}
          />
        )}

        {/* ── Composer ───────────────────────────────────────────── */}
        <Flex gap={8} style={{ flexShrink: 0 }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Geni anything about your career..."
            autoSize={{ minRows: 1, maxRows: 5 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isSending}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleSend()}
            loading={isSending}
            disabled={!input.trim()}
          />
        </Flex>
      </div>
    </div>
  );
}
