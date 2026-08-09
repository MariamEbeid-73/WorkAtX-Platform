import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Flex, Tag, Typography, Button, Tooltip } from 'antd';
import {
    RobotOutlined,
    UserOutlined,
    CopyOutlined,
    CheckOutlined,
    LinkOutlined,
    ExclamationCircleOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { UiChatMessage, GapAnalysisResult, TechChoiceSelections } from '../../types/chat';
import { GapAnalysisCard } from './GapAnalysisCard';
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
    /**
     * Resumes a paused study-plan job with the user's tech_choices selections.
     * Wire this to useChat().resumeStudyPlanWithSelections, partially applied
     * with the active sessionId — omit while that endpoint is unconfirmed
     * (see chatService.submitTechChoiceSelections) to render read-only.
     */
    onResumeWithSelections?: (
        jobId: string,
        selections: TechChoiceSelections,
    ) => Promise<void>;
}

export function ChatMessageBubble({
    message,
    userInitials,
    onResumeWithSelections,
}: ChatMessageBubbleProps) {
    const isUser = message.role === 'user';
    const isStudyPlan = message.responseType === 'study_plan';
    const isGapAnalysis = message.responseType === 'gap_analysis';
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();

    // message.result is typed loosely (GapAnalysisResult | unknown | null) since
    // it's shared across responseTypes — narrow it here for gap_analysis only.
    const gapResult: GapAnalysisResult | null =
        isGapAnalysis && message.result && typeof message.result === 'object'
            ? (message.result as GapAnalysisResult)
            : null;

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

            <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'} ${isGapAnalysis ? 'chat-bubble--wide' : ''}`}>
                {message.responseType && RESPONSE_TYPE_LABEL[message.responseType] && (
                    <Tag color="purple" style={{ marginBottom: 6 }}>
                        {RESPONSE_TYPE_LABEL[message.responseType]}
                    </Tag>
                )}

                {message.pending ? (
                    <span className="chat-bubble__pending-stage" role="status" aria-live="polite">
                        <LoadingOutlined className="chat-bubble__pending-icon" />
                        <span>{message.pendingStage?.trim() || 'Waiting for AI…'}</span>
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
                                onClick={() => navigate(message.jobId
                                    ? `/plans?jobId=${encodeURIComponent(message.jobId)}`
                                    : '/plans')}
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
                ) : isGapAnalysis ? (
                    gapResult ? (
                        <GapAnalysisCard
                            result={gapResult}
                            onSubmitTechChoices={
                                message.jobId && onResumeWithSelections
                                    ? (selections: TechChoiceSelections) => onResumeWithSelections(message.jobId as string, selections)
                                    : undefined
                            }
                        />
                    ) : (
                        <Flex align="center" gap={10}>
                            <ExclamationCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
                            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                {message.resultStatus === 'error'
                                    ? "Your gap analysis is ready, but the details couldn't be loaded right now."
                                    : 'No report was saved for this message.'}
                            </Text>
                        </Flex>
                    )
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
