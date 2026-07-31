import { useNavigate } from 'react-router-dom';
import { Flex, Typography, Skeleton, Tag } from 'antd';
import { TrophyOutlined, ArrowRightOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import type { ScoreBreakdown } from '../../types/profile';

const { Text, Title } = Typography;

interface ScoreBreakdownCardProps {
  scores: ScoreBreakdown | null;
  isLoading: boolean;
}

/** Mini circular SVG gauge */
function MiniGauge({ value, color, trail }: { value: number; color: string; trail: string }) {
  const size = 80;
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trail} strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </Text>
      </div>
    </div>
  );
}

const DOMAIN_CONFIG = [
  { key: 'overall' as const, label: 'Overall',   color: '#8B5CF6', trail: 'rgba(139,92,246,0.12)', emoji: '⚡' },
  { key: 'dev'     as const, label: 'Developer', color: '#06B6D4', trail: 'rgba(6,182,212,0.12)',  emoji: '💻' },
  { key: 'aiml'   as const, label: 'AI / ML',   color: '#F59E0B', trail: 'rgba(245,158,11,0.12)', emoji: '🧠' },
];

export function ScoreBreakdownCard({ scores, isLoading }: ScoreBreakdownCardProps) {
  const navigate = useNavigate();

  // Fallback values when backend isn't connected
  const fallback = { overall: 78, dev: 82, aiml: 55 };
  const trends   = { overall: 5,  dev: 6,  aiml: 0  };

  return (
    <div
      style={{
        borderRadius: 20, overflow: 'hidden',
        background: 'rgba(14,18,32,0.80)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Flex align="center" gap={10}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrophyOutlined style={{ fontSize: 15, color: '#A78BFA' }} />
          </div>
          <Flex vertical gap={1}>
            <Title level={5} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14 }}>
              Performance Overview
            </Title>
            <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              AI-analyzed scores across dimensions
            </Text>
          </Flex>
        </Flex>

        {/* "View full breakdown" link */}
        <button
          onClick={() => navigate('/knowledge-graph')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.22)',
            color: '#A78BFA', fontSize: 12, fontWeight: 600,
            transition: 'all 0.2s ease', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.16)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.40)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.08)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.22)';
          }}
        >
          Full breakdown <ArrowRightOutlined style={{ fontSize: 11 }} />
        </button>
      </Flex>

      {/* ── Score teasers ────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 24px' }}>
        {isLoading ? (
          <Flex gap={16} wrap="wrap">
            {[0, 1, 2].map(i => (
              <Flex key={i} align="center" gap={12} style={{ flex: '1 1 140px' }}>
                <Skeleton.Avatar active size={80} shape="circle" />
                <Flex vertical gap={6}>
                  <Skeleton.Input active size="small" style={{ width: 80 }} />
                  <Skeleton.Input active size="small" style={{ width: 60 }} />
                </Flex>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Flex gap={16} wrap="wrap">
            {DOMAIN_CONFIG.map(({ key, label, color, trail, emoji }) => {
              const val   = scores?.[key]?.overallShowoff?.value ?? fallback[key];
              const trend = scores?.[key]?.overallShowoff?.trend ?? trends[key];
              const trendUp   = trend > 0;
              const trendDown = trend < 0;

              return (
                <Flex
                  key={key}
                  align="center"
                  gap={14}
                  style={{
                    flex: '1 1 140px', minWidth: 140,
                    padding: '14px 16px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => navigate('/knowledge-graph')}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = `${color}0D`;
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${color}30`;
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  <MiniGauge value={val} color={color} trail={trail} />

                  <Flex vertical gap={5}>
                    <Flex align="center" gap={5}>
                      <span style={{ fontSize: 14 }}>{emoji}</span>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</Text>
                    </Flex>

                    <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      Overall Showoff
                    </Text>

                    {trend !== 0 && (
                      <Tag
                        icon={trendUp ? <RiseOutlined /> : trendDown ? <FallOutlined /> : undefined}
                        style={{
                          margin: 0, fontSize: 10, width: 'fit-content', borderRadius: 6,
                          background: trendUp ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                          border: `1px solid ${trendUp ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          color: trendUp ? '#10B981' : '#EF4444',
                        }}
                      >
                        {trendUp ? '+' : ''}{trend}
                      </Tag>
                    )}
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        )}

        {/* Footer hint */}
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 16, textAlign: 'center' }}>
          Click any score to see the full breakdown in Knowledge Graph →
        </Text>
      </div>
    </div>
  );
}
