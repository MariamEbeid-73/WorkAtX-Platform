import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Flex, Tag, Typography, Button, Tooltip } from 'antd';
import { RobotOutlined, UserOutlined, CopyOutlined, CheckOutlined, LinkOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { UiChatMessage } from '../../types/chat';
import './ChatMessageBubble.css';

const { Text } = Typography;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  gap_analysis: 'Gap Analysis',
  study_plan: 'Study Plan',
};

interface ChatMessageBubbleProps {
  message: UiChatMessage;
  userInitials: string;
}

export function ChatMessageBubble({ message, userInitials }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStudyPlan = message.responseType === 'study_plan';
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = useCallback(async () => {
    if (message.pending || message.failed) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [message.content, message.pending, message.failed]);

  return (
    <Flex
      gap={10}
      align="flex-start"
      className={`chat-bubble-row ${isUser ? 'chat-bubble-row--user' : ''}`}
    >
      {!isUser && (
        <Avatar
          icon={<RobotOutlined />}
          className="chat-bubble-avatar chat-bubble-avatar--assistant"
        />
      )}

      <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}>
        {message.responseType && RESPONSE_TYPE_LABEL[message.responseType] && (
          <Tag color="purple" style={{ marginBottom: 6 }}>
            {RESPONSE_TYPE_LABEL[message.responseType]}
          </Tag>
        )}

        {message.pending ? (
          <span className="chat-bubble__typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </span>
        ) : message.failed ? (
          <Text type="danger">Couldn't get a response. Please try again.</Text>
        ) : isUser ? (
          <Text style={{ whiteSpace: 'pre-wrap', color: 'inherit' }}>{message.content}</Text>
        ) : isStudyPlan ? (
          <div
            style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
            }}
          >
            <Flex vertical gap={8}>
              <Text style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 14 }}>
                Your study plan has been created!
              </Text>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                size="small"
                onClick={() => navigate('/plans')}
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)',
                  border: 'none',
                  alignSelf: 'flex-start',
                }}
              >
                View in Plans
              </Button>
            </Flex>
          </div>
        ) : (
          <div className="chat-bubble__markdown">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {!message.pending && (
          <Flex align="center" justify="space-between" className="chat-bubble__meta">
            <div className="chat-bubble__time">{formatTime(message.createdAt)}</div>
            {!isUser && !message.failed && (
              <Tooltip title={copied ? 'Copied' : 'Copy'}>
                <Button
                  type="text"
                  size="small"
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={handleCopy}
                  className="chat-bubble__copy-btn"
                />
              </Tooltip>
            )}
          </Flex>
        )}
      </div>

      {isUser && (
        <Avatar className="chat-bubble-avatar chat-bubble-avatar--user">
          {userInitials || <UserOutlined />}
        </Avatar>
      )}
    </Flex>
  );
}
