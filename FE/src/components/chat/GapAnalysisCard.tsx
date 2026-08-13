import { useMemo, useState, useRef } from 'react';
import { Flex, Typography, Collapse, Button, Alert, Tooltip, Radio, Progress } from 'antd';
import {
    CopyOutlined,
    CheckOutlined,
    WarningOutlined,
    SendOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GapAnalysisResult, TechChoiceSelections, TechChoiceCategory } from '../../types/chat';
import { normalizeTechChoices } from '../../utils/techChoices';
import './GapAnalysisCard.css';

const { Text, Title, Paragraph } = Typography;

interface GapAnalysisCardProps {
    result: GapAnalysisResult;
    onSubmitTechChoices?: (selections: TechChoiceSelections) => Promise<void>;
}

function levelBadgeClass(level: string): string {
    const l = (level || '').toLowerCase();
    if (l.includes('high') || l.includes('strong')) return 'gap-card__badge--high';
    if (l.includes('low') || l.includes('weak') || l.includes('poor')) return 'gap-card__badge--low';
    return 'gap-card__badge--moderate';
}

function importanceBadgeClass(importance: string): string {
    const i = (importance || '').toLowerCase();
    if (i.includes('required') || i.includes('must')) return 'gap-card__badge--required';
    return 'gap-card__badge--preferred';
}

function confidenceBadgeClass(confidence: string): string {
    const c = (confidence || '').toLowerCase();
    if (c === 'high') return 'gap-card__badge--high';
    if (c === 'low') return 'gap-card__badge--low';
    return 'gap-card__badge--moderate';
}

function depthBadgeClass(depth: string): string {
    const d = (depth || '').toLowerCase();
    if (d === 'deep') return 'gap-card__badge--high';
    if (d === 'thin') return 'gap-card__badge--low';
    return 'gap-card__badge--moderate';
}

const ROLE_INSIGHT_LABELS: Record<string, string> = {
    what_this_place_is_like: 'The team',
    what_they_value: 'What they value',
    interview_shape: 'Interview process',
    role_reality: 'Day to day',
};

export function GapAnalysisCard({ result, onSubmitTechChoices }: GapAnalysisCardProps) {
    const [copied, setCopied] = useState(false);
    const [selectedChoices, setSelectedChoices] = useState<TechChoiceSelections>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const ga = result.gap_analysis;

    const techChoices = useMemo(
        () => normalizeTechChoices(result.tech_choices as unknown),
        [result.tech_choices],
    );

    const sortedMissing = useMemo(
        () =>
            [...(ga?.missing ?? [])].sort((a, b) => {
                const aRatio = a.of > 0 ? a.required_by / a.of : 0;
                const bRatio = b.of > 0 ? b.required_by / b.of : 0;
                return bRatio - aRatio;
            }),
        [ga?.missing],
    );

    const handleCopyReport = async () => {
        const textToCopy = result.user_report || ga?.summary || '';
        if (!textToCopy) return;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard disabled */
        }
    };

    const handleChoiceChange = (category: string, value: string) => {
        setSelectedChoices((prev) => ({ ...prev, [category]: value }));
    };

    const handleSubmitChoices = async () => {
        if (!onSubmitTechChoices || submitted) return;
        setSubmitting(true);
        try {
            await onSubmitTechChoices(selectedChoices);
            // Lock the card — resumeStudyPlanWithSelections already handles
            // its own errors internally (surfaces via the global sendError
            // banner) and never rethrows today, so reaching here means the
            // call was accepted. Prevents re-clicking from queuing a second
            // resume job for the same underlying jobId (BE has no
            // idempotency guard on resumeFromJobId).
            setSubmitted(true);
        } catch {
            // Defensive: if onSubmitTechChoices' contract ever changes to
            // rethrow, don't leave the button stuck on a spinner forever.
        } finally {
            setSubmitting(false);
        }
    };

    if (!ga) {
        return (
            <Alert
                type="error"
                showIcon
                message="This gap analysis result is missing its data."
                description={result.error}
            />
        );
    }

    const perJobMatchScores = ga.per_job_match_scores ?? [];
    const matchedSkills = ga.matched ?? [];
    const strengths = ga.strengths ?? [];
    const weaknesses = ga.weaknesses ?? [];
    const blocking = ga.blocking ?? [];
    const leverage = ga.leverage ?? [];
    const unaskedLeverage = ga.unasked_leverage ?? [];
    const positioning = ga.positioning ?? [];
    const roleInsight = ga.role_insight ?? {};
    const roleInsightEntries = Object.entries(ROLE_INSIGHT_LABELS).filter(
        ([key]) => typeof roleInsight[key] === 'string' && (roleInsight[key] as string).trim().length > 0,
    );

    return (
        <div className="gap-card">
            {/* ── Condensed header: score + one-line summary ────────────── */}
            <Flex align="center" gap={14} className="gap-card__header">
                <Progress
                    type="circle"
                    size={44}
                    percent={ga.skill_coverage_across_all_jobs}
                    strokeWidth={9}
                    format={(pct) => <span style={{ fontSize: 11 }}>{pct}%</span>}
                />
                <Flex vertical gap={2} flex={1} style={{ minWidth: 0 }}>
                    <Flex align="center" gap={8}>
                        <Text style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
                            Gap analysis complete
                        </Text>
                        {ga.evidence_confidence && (
                            <Tooltip title="How confident the analysis is in its own verdicts, based on how much evidence backed them">
                                <span className={`gap-card__badge ${confidenceBadgeClass(ga.evidence_confidence)}`}>
                                    {ga.evidence_confidence} confidence
                                </span>
                            </Tooltip>
                        )}
                    </Flex>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {matchedSkills.length} matched · {ga.missing.length} gaps found
                        {perJobMatchScores.length > 0 ? ` · ${ga.jobs_analyzed} jobs analyzed` : ''}
                    </Text>
                </Flex>
            </Flex>

            {ga.is_degraded && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message="Simplified analysis"
                    description="This result was generated from limited context, so scores and skill lists may be less precise."
                    className="gap-card__banner"
                />
            )}

            {result.awaiting_user_input && techChoices.length > 0 && (
                <Alert
                    type="info"
                    showIcon
                    message="Pick your preferred stack below to continue, or just reply here"
                    className="gap-card__banner"
                />
            )}

            {result.awaiting_user_input && techChoices.length === 0 && (
                <Alert
                    type="info"
                    showIcon
                    message="Geni is waiting for your reply"
                    description="Reply below in the chat to continue — see the full report for the question."
                    className="gap-card__banner"
                />
            )}

            {ga.summary && <Paragraph className="gap-card__summary">{ga.summary}</Paragraph>}

            {/* ── Match by Role ───────────────────────────────────────── */}
            {perJobMatchScores.length > 0 && (
                <div className="gap-card__section">
                    <Title level={5} className="gap-card__section-title">
                        Match by role
                    </Title>
                    <Flex vertical gap={8}>
                        {perJobMatchScores.map((job: any, i: number) => (
                            <Flex
                                key={`${job.role_id || job.role}-${i}`}
                                align="center"
                                gap={12}
                                className="gap-card__job-row"
                            >
                                <Flex vertical flex={1} style={{ minWidth: 0 }}>
                                    {job.job_url ? (
                                        <a
                                            href={job.job_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: 13, fontWeight: 500 }}
                                        >
                                            <Text ellipsis style={{ fontSize: 13, fontWeight: 500 }}>
                                                {job.job_title || job.role}
                                            </Text>
                                        </a>
                                    ) : (
                                        <Text ellipsis style={{ fontSize: 13, fontWeight: 500 }}>
                                            {job.job_title || job.role}
                                        </Text>
                                    )}
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {job.company}
                                    </Text>
                                </Flex>
                                <span className={`gap-card__badge ${levelBadgeClass(job.match_level)}`}>
                                    {job.match_level}
                                </span>
                                <Text style={{ fontSize: 13, fontWeight: 600, width: 36, textAlign: 'right' }}>
                                    {job.match_score}%
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                </div>
            )}

            {/* ── Interactive Tech Choices ──────────────────────────────── */}
            {techChoices.length > 0 && (
                <div className="gap-card__pref-card">
                    <Flex vertical gap={4}>
                        <Text style={{ fontSize: 14, fontWeight: 600 }}>
                            Select preferred technology stack
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Choose one technology per category to customize your study plan:
                        </Text>
                    </Flex>

                    <Flex vertical gap={12}>
                        {techChoices.map((cat: TechChoiceCategory, i: number) => (
                            <Flex vertical gap={6} key={`${cat.category}-${i}`}>
                                <Text style={{ fontSize: 13, fontWeight: 500 }}>{cat.category}</Text>
                                <Radio.Group
                                    value={selectedChoices[cat.category]}
                                    onChange={(e) => handleChoiceChange(cat.category, e.target.value)}
                                    disabled={submitted}
                                >
                                    <Flex wrap gap={8}>
                                        {cat.options.map((opt: any, j: number) => {
                                            const val = typeof opt === 'string' ? opt : opt.label;
                                            return (
                                                <Radio.Button key={opt.id || j} value={val}>
                                                    {val}
                                                </Radio.Button>
                                            );
                                        })}
                                    </Flex>
                                </Radio.Group>
                            </Flex>
                        ))}
                    </Flex>

                    {onSubmitTechChoices && (
                        submitted ? (
                            <Flex align="center" gap={8} style={{ marginTop: 4 }}>
                                <CheckOutlined style={{ color: 'var(--color-primary-400, #7C3AED)' }} />
                                <Text style={{ fontSize: 13 }}>
                                    Selections sent — building your study plan.
                                </Text>
                            </Flex>
                        ) : (
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                loading={submitting}
                                disabled={techChoices.some((cat) => !selectedChoices[cat.category])}
                                onClick={handleSubmitChoices}
                                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                            >
                                Save & Build Study Plan
                            </Button>
                        )
                    )}
                </div>
            )}

            {/* ── Blocking barriers ─────────────────────────────────────── */}
            {blocking.length > 0 && (
                <div className="gap-card__section">
                    <Alert
                        type="error"
                        showIcon
                        message={`${blocking.length} hard requirement${blocking.length === 1 ? '' : 's'} you don't currently meet`}
                        className="gap-card__banner"
                    />
                    <div className="gap-card__missing-table">
                        {blocking.map((b, i) => (
                            <div key={`${b.label}-${i}`} className="gap-card__missing-row gap-card__missing-row--blocking">
                                <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                                    <Flex align="center" gap={8}>
                                        <span className="gap-card__badge gap-card__badge--blocking">{b.label}</span>
                                        {b.of > 0 && (
                                            <Tooltip title={Array.isArray(b.jobs) ? b.jobs.join(', ') : ''}>
                                                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                    {b.required_by}/{b.of} jobs
                                                </Text>
                                            </Tooltip>
                                        )}
                                    </Flex>
                                    {b.evidence && (
                                        <Text type="secondary" style={{ fontSize: 12.5 }}>
                                            {b.evidence}
                                        </Text>
                                    )}
                                    {b.workaround && (
                                        <Text style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                            Possible workaround: {b.workaround}
                                        </Text>
                                    )}
                                </Flex>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Skill Gaps Quick Overview ─────────────────────────────── */}
            {sortedMissing.length > 0 && (
                <div className="gap-card__section">
                    <Title level={5} className="gap-card__section-title">
                        Skill gaps ({sortedMissing.length})
                    </Title>
                    <div className="gap-card__missing-table">
                        {sortedMissing.map((m, i) => (
                            <div key={`${m.skill}-${i}`} className="gap-card__missing-row">
                                <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
                                    <span
                                        className="gap-card__missing-dot"
                                        style={{ background: m.badge_color || 'var(--text-tertiary)' }}
                                    />
                                    <Text ellipsis style={{ fontSize: 13 }}>
                                        {m.skill}
                                    </Text>
                                </Flex>
                                <span className={`gap-card__badge ${importanceBadgeClass(m.importance)}`}>
                                    {m.importance}
                                </span>
                                {m.kind === 'depth' && (
                                    <span className="gap-card__badge gap-card__badge--depth">needs more depth</span>
                                )}
                                <Tooltip title={Array.isArray(m.jobs) ? m.jobs.join(', ') : ''}>
                                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                        {m.required_by}/{m.of} jobs
                                    </Text>
                                </Tooltip>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Leverage ──────────────────────────────────────────────── */}
            {leverage.length > 0 && (
                <div className="gap-card__section">
                    <Title level={5} className="gap-card__section-title">
                        Your strongest angles
                    </Title>
                    <Flex vertical gap={8}>
                        {leverage.map((l, i) => (
                            <div key={`${l.label}-${i}`} className="gap-card__leverage-row">
                                <Flex align="center" gap={8} wrap>
                                    <Text style={{ fontSize: 13, fontWeight: 500 }}>{l.label}</Text>
                                    {typeof l.demand_rank === 'number' && (
                                        <span className="gap-card__badge gap-card__badge--moderate">
                                            their #{l.demand_rank} ask
                                        </span>
                                    )}
                                    <span className={`gap-card__badge ${depthBadgeClass(l.depth)}`}>{l.depth}</span>
                                </Flex>
                                {l.evidence?.length > 0 && (
                                    <ul className="gap-card__list">
                                        {l.evidence.map((e, j) => (
                                            <li key={j}>{e}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </Flex>
                </div>
            )}

            {/* ── Unasked leverage ──────────────────────────────────────── */}
            {unaskedLeverage.length > 0 && (
                <div className="gap-card__section">
                    <Title level={5} className="gap-card__section-title">
                        Extra strengths worth mentioning
                    </Title>
                    <Flex vertical gap={8}>
                        {unaskedLeverage.map((u, i) => (
                            <div key={`${u.label}-${i}`} className="gap-card__leverage-row">
                                <Text style={{ fontSize: 13, fontWeight: 500 }}>{u.label}</Text>
                                <Text type="secondary" style={{ fontSize: 12.5 }}>
                                    {u.why_it_matters}
                                </Text>
                                {u.evidence?.length > 0 && (
                                    <ul className="gap-card__list">
                                        {u.evidence.map((e, j) => (
                                            <li key={j}>{e}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </Flex>
                </div>
            )}

            {/* ── Positioning ───────────────────────────────────────────── */}
            {positioning.length > 0 && (
                <div className="gap-card__section">
                    <Title level={5} className="gap-card__section-title">
                        How to position yourself
                    </Title>
                    <ul className="gap-card__list">
                        {positioning.map((p, i) => (
                            <li key={i}>{p}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Role insight ──────────────────────────────────────────── */}
            {roleInsightEntries.length > 0 && (
                <div className="gap-card__section">
                    <Title level={5} className="gap-card__section-title">
                        What this place is like
                    </Title>
                    <Flex vertical gap={8}>
                        {roleInsightEntries.map(([key, label]) => (
                            <div key={key} className="gap-card__insight-row">
                                <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                                    {label}
                                </Text>
                                <Paragraph style={{ margin: 0, fontSize: 13 }}>
                                    {roleInsight[key] as string}
                                </Paragraph>
                            </div>
                        ))}
                    </Flex>
                </div>
            )}

            {/* ── Full report — collapsed by default; this lives in scrollback now ── */}
            <Collapse
                ghost
                className="gap-card__collapse"
                defaultActiveKey={result.awaiting_user_input ? ['report'] : []}
                items={[
                    {
                        key: 'report',
                        label: 'Full written report',
                        children: (
                            <>
                                <Flex justify="flex-end" style={{ marginBottom: 12 }}>
                                    <Button
                                        size="small"
                                        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                                        onClick={handleCopyReport}
                                    >
                                        {copied ? 'Copied' : 'Copy'}
                                    </Button>
                                </Flex>

                                <div className="gap-card__report-pdf" ref={reportRef}>
                                    {result.user_report ? (
                                        <div className="gap-card__markdown">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {result.user_report}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="gap-card__structured-report">
                                            <Title level={4}>Candidate Gap Analysis Report</Title>

                                            <Title level={5}>1. Target Job Compatibility</Title>
                                            <ul className="gap-card__list">
                                                {perJobMatchScores.map((job: any, idx: number) => (
                                                    <li key={idx}>
                                                        <strong>{job.role} ({job.company}):</strong> {job.match_score}% Match ({job.match_level})
                                                    </li>
                                                ))}
                                            </ul>

                                            <Title level={5} style={{ marginTop: 16 }}>2. Required Skills to Study</Title>
                                            <table className="gap-card__report-table">
                                                <thead>
                                                    <tr>
                                                        <th>Skill</th>
                                                        <th>Category</th>
                                                        <th>Demand</th>
                                                        <th>Target Jobs</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sortedMissing.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td><strong>{item.skill}</strong></td>
                                                            <td>{item.importance}</td>
                                                            <td>Required by {item.required_by} of {item.of} jobs</td>
                                                            <td><code>{Array.isArray(item.jobs) ? item.jobs.join(', ') : item.jobs}</code></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {(matchedSkills.length > 0 || strengths.length > 0) && (
                                                <>
                                                    <Title level={5} style={{ marginTop: 16 }}>3. What You Already Match</Title>
                                                    {matchedSkills.length > 0 && (
                                                        <Paragraph>
                                                            <strong>Matched Skills:</strong> {matchedSkills.join(', ')}
                                                        </Paragraph>
                                                    )}
                                                    {strengths.length > 0 && (
                                                        <Paragraph>
                                                            <strong>Bonus Strengths:</strong> {strengths.join(', ')}
                                                        </Paragraph>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ),
                    },
                    ...(weaknesses.length > 0
                        ? [
                            {
                                key: 'weaknesses',
                                label: `Priority gaps (${weaknesses.length})`,
                                children: (
                                    <ul className="gap-card__list">
                                        {weaknesses.map((w: any, i: number) => (
                                            <li key={i}>{w}</li>
                                        ))}
                                    </ul>
                                ),
                            },
                        ]
                        : []),
                ]}
            />
        </div>
    );
}