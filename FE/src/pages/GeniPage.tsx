import { useState, useRef, useEffect } from 'react';
import { Flex, Typography, Input, Button, Tag, Avatar } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useUser } from '@clerk/react';

const { Title, Text } = Typography;

interface ChatMessage {
  id: number;
  role: 'user' | 'geni';
  content: string;
  timestamp: Date;
}

const SAMPLE_PROMPTS = [
  'What skills do I need for a Google SWE role?',
  'Analyze my resume gaps',
  'Create a 30-day study plan for system design',
  'Compare my profile with Meta requirements',
];

const GENI_INTRO: ChatMessage = {
  id: 0,
  role: 'geni',
  content: "Hi! I'm Geni, your AI career assistant. I can analyze your profile, suggest study plans, identify skill gaps, and help you prepare for top tech companies. What would you like to work on today?",
  timestamp: new Date(),
};

export function GeniPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([GENI_INTRO]);
  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulated AI response (replace with actual API call when backend ready)
    setTimeout(() => {
      setIsTyping(false);
      const geniReply: ChatMessage = {
        id: Date.now() + 1,
        role: 'geni',
        content: `Great question! I'm analyzing your profile now. This feature will be fully connected to the AI backend shortly — stay tuned for real-time career insights powered by your CV, GitHub activity, and score data.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, geniReply]);
    }, 1800);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('') || 'U';

  return (
    <div style={{ animation: 'fadeIn 0.5s ease both', height: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Flex align="center" justify="space-between" style={{ marginBottom: 20, flexShrink: 0 }}>
        <Flex vertical gap={4}>
          <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>AI Assistant</Text>
          <Flex align="center" gap={10}>
            <Title level={3} style={{ margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Geni
            </Title>
            <Tag
              icon={<ExperimentOutlined />}
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                color: 'var(--color-primary-400)',
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              BETA
            </Tag>
          </Flex>
        </Flex>

        {/* Online status indicator */}
        <Flex align="center" gap={8}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 8px rgba(16,185,129,0.7)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }} />
          <Text style={{ fontSize: 12, color: '#10B981' }}>Geni is online</Text>
        </Flex>
      </Flex>

      {/* ── Chat container ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(14,18,32,0.80)',
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* Messages scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>
          <Flex vertical gap={20}>
            {messages.map((msg) => (
              <Flex
                key={msg.id}
                gap={12}
                align="flex-start"
                justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              >
                {msg.role === 'geni' && (
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                )}

                <Flex vertical gap={4} style={{ maxWidth: '70%' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: msg.role === 'geni' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                    background: msg.role === 'geni'
                      ? 'rgba(139,92,246,0.10)'
                      : 'rgba(139,92,246,0.20)',
                    border: `1px solid ${msg.role === 'geni' ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.35)'}`,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                  <Text style={{ fontSize: 10, color: 'var(--text-tertiary)', paddingInline: 4 }}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </Flex>

                {msg.role === 'user' && (
                  <Avatar
                    size={36}
                    src={user?.imageUrl}
                    icon={<UserOutlined />}
                    style={{
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
                      fontSize: 13,
                      fontWeight: 700,
                      border: '2px solid rgba(139,92,246,0.30)',
                    }}
                  >
                    {initials}
                  </Avatar>
                )}
              </Flex>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <Flex gap={12} align="flex-start">
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '4px 16px 16px 16px',
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  display: 'flex',
                  gap: 5,
                  alignItems: 'center',
                }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--color-primary-400)',
                        animation: `float 1.2s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </Flex>
            )}
            <div ref={messagesEndRef} />
          </Flex>
        </div>

        {/* Sample prompts (shown only at start) */}
        {messages.length <= 1 && (
          <Flex gap={8} wrap="wrap" style={{ padding: '0 24px 12px' }}>
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.20)',
                  color: 'var(--color-primary-400)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.08)';
                }}
              >
                {p}
              </button>
            ))}
          </Flex>
        )}

        {/* Input row */}
        <div style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <Flex gap={10} align="center">
            <Input
              id="geni-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={() => sendMessage(input)}
              placeholder="Ask Geni anything about your career…"
              style={{
                flex: 1,
                height: 48,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 14,
                color: 'var(--text-primary)',
                fontSize: 14,
              }}
              disabled={isTyping}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              style={{
                height: 48,
                width: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            />
          </Flex>
        </div>
      </div>
    </div>
  );
}
