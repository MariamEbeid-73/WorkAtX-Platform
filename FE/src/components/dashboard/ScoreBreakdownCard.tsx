import { useState } from 'react';
import { Card, Segmented, Progress, Flex, Typography, Skeleton, Tooltip, Tag } from 'antd';
import { RiseOutlined, FallOutlined, TrophyOutlined } from '@ant-design/icons';
import type { ScoreBreakdown, ScoreTab, TabScores } from '../../types/profile';

const { Text, Title } = Typography;

// ─── Gauge config ────────────────────────────────────────────────────────────
const GAUGE_CONFIG = [
  {
    key: 'overallShowoff' as const,
    label: 'Overall Showoff',
    strokeColor: { '0%': '#8B5CF6', '100%': '#06B6D4' },
    trailColor: 'rgba(139,92,246,0.10)',
    icon: '🏆',
  },
  {
    key: 'resume' as const,
    label: 'Resume Score',
    strokeColor: { '0%': '#F59E0B', '100%': '#EF4444' },
    trailColor: 'rgba(245,158,11,0.10)',
    icon: '📄',
  },
  {
    key: 'github' as const,
    label: 'GitHub Score',
    strokeColor: { '0%': '#10B981', '100%': '#06B6D4' },
    trailColor: 'rgba(16,185,129,0.10)',
    icon: '⚡',
  },
];

// ─── ScoreGauge ──────────────────────────────────────────────────────────────
interface ScoreGaugeProps {
  label: string;
  value: number;
  trend?: number;
  strokeColor: Record<string, string>;
  trailColor: string;
  icon: string;
}

function ScoreGauge({ label, value, trend, strokeColor, trailColor, icon }: ScoreGaugeProps) {
  const trendUp   = typeof trend === 'number' && trend > 0;
  const trendDown = typeof trend === 'number' && trend < 0;

  return (
    <Tooltip title={`${label}: ${value}/100`} placement="bottom">
      <Flex
        vertical
        align="center"
        gap={14}
        style={{
          flex: 1,
          minWidth: 160,
          padding: '20px 16px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'default',
          transition: 'all 0.25s ease',
        }}
        className="score-gauge-card"
      >
        {/* Circular progress */}
        <Progress
          type="circle"
          percent={value}
          size={110}
          strokeColor={strokeColor}
          trailColor={trailColor}
          strokeWidth={8}
          format={(pct) => (
            <Flex vertical align="center" gap={2}>
              <span style={{ fontSize: 11 }}>{icon}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {pct}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                / 100
              </span>
            </Flex>
          )}
        />

        {/* Label + trend */}
        <Flex vertical align="center" gap={4}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
            {label}
          </Text>
          {typeof trend === 'number' && trend !== 0 && (
            <Tag
              icon={trendUp ? <RiseOutlined /> : trendDown ? <FallOutlined /> : undefined}
              style={{
                background: trendUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${trendUp ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: trendUp ? '#10B981' : '#EF4444',
                borderRadius: 8,
                fontSize: 11,
                margin: 0,
              }}
            >
              {trendUp ? '+' : ''}{trend}
            </Tag>
          )}
        </Flex>
      </Flex>
    </Tooltip>
  );
}

// ─── ScoreBreakdownCard ──────────────────────────────────────────────────────
interface ScoreBreakdownCardProps {
  scores: ScoreBreakdown | null;
  isLoading: boolean;
}

const TAB_OPTIONS = [
  { label: 'Overall', value: 'overall' as ScoreTab },
  { label: 'Dev Score', value: 'dev' as ScoreTab },
  { label: 'AI/ML Score', value: 'aiml' as ScoreTab },
];

export function ScoreBreakdownCard({ scores, isLoading }: ScoreBreakdownCardProps) {
  const [activeTab, setActiveTab] = useState<ScoreTab>('overall');

  // Fallback data for when the API isn't connected yet
  const fallbackTabScores: TabScores = {
    overallShowoff: { label: 'Overall Showoff', value: 78, trend: 5 },
    resume:         { label: 'Resume Score',   value: 85, trend: 3 },
    github:         { label: 'GitHub Score',   value: 62, trend: -2 },
  };

  const tabScores: TabScores = scores?.[activeTab] ?? fallbackTabScores;

  return (
    <Card
      bordered
      style={{
        background: 'rgba(14,18,32,0.80)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap" style={{ marginBottom: 24 }}>
        <Flex vertical gap={4}>
          <Tag
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: 'var(--color-primary-400)',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.10em',
              width: 'fit-content',
              marginBottom: 6,
            }}
          >
            <TrophyOutlined style={{ marginRight: 4 }} />
            PERFORMANCE HUB
          </Tag>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
            Score Breakdown
          </Title>
          <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            AI-analyzed performance across dimensions
          </Text>
        </Flex>

        {/* Segmented tab switcher */}
        <Segmented
          options={TAB_OPTIONS.map((t) => ({ label: t.label, value: t.value }))}
          value={activeTab}
          onChange={(val) => setActiveTab(val as ScoreTab)}
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
      </Flex>

      {/* Gauges */}
      {isLoading ? (
        <Flex gap={16} wrap="wrap">
          {[0, 1, 2].map((i) => (
            <Flex
              key={i}
              vertical
              align="center"
              gap={12}
              style={{ flex: 1, minWidth: 160, padding: 20 }}
            >
              <Skeleton.Avatar active size={110} shape="circle" />
              <Skeleton.Input active size="small" style={{ width: 100 }} />
            </Flex>
          ))}
        </Flex>
      ) : (
        <Flex gap={16} wrap="wrap" justify="center">
          {GAUGE_CONFIG.map((cfg) => {
            const metric = tabScores[cfg.key];
            return (
              <ScoreGauge
                key={cfg.key}
                label={cfg.label}
                value={metric?.value ?? 0}
                trend={metric?.trend}
                strokeColor={cfg.strokeColor}
                trailColor={cfg.trailColor}
                icon={cfg.icon}
              />
            );
          })}
        </Flex>
      )}

      {/* Footer note */}
      <Text style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 20, textAlign: 'center' }}>
        Scores are updated after each profile re-analysis · Last analyzed just now
      </Text>
    </Card>
  );
}
