import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Flex,
  Typography,
  Progress,
  Tag,
  Button,
  Checkbox,
  Badge,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  TrophyOutlined,
  CheckCircleFilled,
  BookOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  CodeOutlined,
  LockOutlined,
  CompassOutlined,
  DownOutlined,
  AimOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { DUMMY_PLANS, type WeekPlan } from '../types/plan';
import './PlansPage.css';

const { Title, Text } = Typography;

const RESOURCE_ICON: Record<string, React.ReactNode> = {
  course: <BookOutlined />,
  video: <PlayCircleOutlined />,
  article: <FileTextOutlined />,
  docs: <CodeOutlined />,
};

const RESOURCE_COLOR: Record<string, string> = {
  course: 'purple',
  video: 'cyan',
  article: 'blue',
  docs: 'green',
};

const PLAN_THEMES = [
  { gradient: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', glow: 'rgba(139,92,246,0.4)' },
  { gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)', glow: 'rgba(16,185,129,0.4)' },
  { gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', glow: 'rgba(245,158,11,0.4)' },
];

type WeekState = 'completed' | 'active' | 'upcoming';

interface IslandPos {
  x: number;
  y: number;
}

interface IslandLayout {
  size: number;
  h: number;
  positions: IslandPos[];
  totalWidth: number;
}

function computeIslandLayout(n: number): IslandLayout {
  if (n <= 0) n = 1;
  const size = Math.round(Math.max(90, Math.min(190, 230 - n * 12)));
  const h = Math.round(size * 0.85);
  const positions: IslandPos[] = [];
  for (let i = 0; i < n; i++) {
    const stepX = size * 1.6;
    const padX = size * 0.9;
    const x = padX + i * stepX + size / 2;
    const y = n <= 2 ? 270 : i % 2 === 0 ? 340 : 150;
    positions.push({ x, y });
  }
  const totalWidth = size * 1.8 + n * size * 1.6;
  return { size, h, positions, totalWidth };
}

function genStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() > 0.7 ? 'lg' : 'sm',
    dur: 2 + Math.random() * 4,
    delay: Math.random() * 3,
    opacity: 0.2 + Math.random() * 0.6,
  }));
}

interface IslandNodeProps {
  week: WeekPlan;
  state: WeekState;
  isSelected: boolean;
  position: IslandPos;
  onClick: () => void;
  floatDelay: number;
  islandW: number;
  islandH: number;
  scale: number;
}

function IslandNode({ week, state, isSelected, position, onClick, floatDelay, islandW, islandH, scale }: IslandNodeProps) {
  const showDecor = scale > 0.55;
  return (
    <motion.div
      className={`island-group island--${state}${isSelected ? ' island--selected' : ''}`}
      style={{
        left: position.x - islandW / 2,
        top: position.y - islandH / 2,
        width: islandW,
        height: islandH,
      }}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: 1,
        scale: isSelected ? 1.12 : 1,
        y: [0, state === 'active' ? -(scale * 10) : -(scale * 4), 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay: 0.3 + floatDelay * 0.15 },
        scale: { type: 'spring', stiffness: 180, damping: 18 },
        y: {
          duration: state === 'active' ? 2.5 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: floatDelay,
        },
      }}
      whileHover={{ scale: isSelected ? 1.14 : 1.08 }}
    >
      <div className="island-shadow" style={{ width: `${islandW * 0.85}px`, height: `${14 * scale}px`, bottom: `-${14 * scale}px` }} />
      <div className="island-base" style={{
        width: islandW,
        height: islandH,
        '--island-scale': scale,
      } as React.CSSProperties}>
        <div className="fog-overlay" />
        {state === 'completed' && <div className="island-check-badge"><CheckCircleFilled /></div>}
        {state === 'upcoming' && <div className="island-lock-badge"><LockOutlined /></div>}
        <div className="island-flag-pole" />
        <div className="island-flag" />
        {showDecor && (
          <>
            <div className="island-tree island-tree--1" />
            <div className="island-tree island-tree--2" />
            <div className="island-tree island-tree--3" />
            <div className="island-crystal island-crystal--1" />
            <div className="island-crystal island-crystal--2" />
          </>
        )}
        <div className="island-content">
          <span className="island-week-label">Week</span>
          <span className="island-week-num">{week.week}</span>
          {scale > 0.5 && <span className="island-focus-tag">{week.focus_skills[0]}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function WeekDetail({
  week, state, completedTasks, onToggleTask, onMarkComplete,
}: {
  week: WeekPlan; state: WeekState;
  completedTasks: Set<number>;
  onToggleTask: (idx: number) => void;
  onMarkComplete: () => void;
}) {
  const allTasksDone = week.tasks.every((_, i) => completedTasks.has(i));
  return (
    <motion.div
      className="week-detail"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Flex align="center" gap={12} className="week-detail__header">
        <div style={{
          width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20, fontWeight: 800,
          background: state === 'completed' ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.08) 100%)'
            : state === 'active' ? 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.08) 100%)'
              : 'rgba(255,255,255,0.05)',
          border: state === 'completed' ? '2px solid rgba(16,185,129,0.4)'
            : state === 'active' ? '2px solid rgba(139,92,246,0.4)' : '1px solid var(--border-subtle)',
          color: state === 'completed' ? '#10B981' : state === 'active' ? '#A78BFA' : 'var(--text-tertiary)',
        }}>
          {state === 'completed' ? <CheckCircleFilled /> : week.week}
        </div>
        <Flex vertical gap={2}>
          <Title level={3} style={{ margin: 0 }}>Week {week.week}</Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{week.goals}</Text>
        </Flex>
        <Badge count={state === 'completed' ? 'Done' : state === 'active' ? 'In Progress' : 'Upcoming'}
          color={state === 'completed' ? '#10B981' : state === 'active' ? '#8B5CF6' : 'var(--text-tertiary)'}
          style={{ marginLeft: 'auto' }} />
      </Flex>

      <div className="week-detail__section">
        <h4>Focus Skills</h4>
        <div className="week-detail__skills">
          {week.focus_skills.map((s) => (
            <Tag key={s} color={state === 'completed' ? 'green' : state === 'active' ? 'purple' : 'default'}
              style={{ fontSize: 13, padding: '2px 12px', borderRadius: 20 }}>{s}</Tag>
          ))}
        </div>
      </div>

      <div className="week-detail__section">
        <h4>Tasks</h4>
        <ul className="week-detail__tasks">
          {week.tasks.map((task, idx) => {
            const done = completedTasks.has(idx);
            return (
              <li key={idx} className={`week-detail__task-item${done ? ' week-detail__task-item--done' : ''}`}
                onClick={() => onToggleTask(idx)}>
                <Checkbox checked={done} />
                <Text style={{ color: done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{task}</Text>
              </li>
            );
          })}
        </ul>
      </div>

      {week.project && (
        <div className="week-detail__section">
          <h4>Project</h4>
          <div className="week-detail__project">
            <Flex align="center" gap={8} style={{ marginBottom: 6 }}>
              <TrophyOutlined style={{ color: 'var(--color-accent-500)', fontSize: 16 }} />
              <Title level={5} style={{ margin: 0, color: 'var(--color-accent-400)' }}>{week.project.title}</Title>
            </Flex>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{week.project.description}</Text>
          </div>
        </div>
      )}

      <div className="week-detail__section">
        <h4>Learning Resources</h4>
        <div className="week-detail__resources">
          {week.resources.map((res, idx) => (
            <div key={idx} className="week-detail__resource-card">
              <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                <span style={{ color: `var(--color-${RESOURCE_COLOR[res.type]}-500)`, fontSize: 14 }}>
                  {RESOURCE_ICON[res.type]}
                </span>
                <span className="week-detail__resource-title">{res.title}</span>
              </Flex>
              <div className="week-detail__resource-meta">
                <Tag color={RESOURCE_COLOR[res.type]} style={{ fontSize: 11, lineHeight: '18px' }}>{res.type}</Tag>
                <Tag color={res.cost === 'free' ? 'green' : 'orange'} style={{ fontSize: 11, lineHeight: '18px' }}>
                  {res.cost}
                </Tag>
                <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{res.platform}</Text>
              </div>
              <div className="week-detail__resource-reason">{res.reason}</div>
            </div>
          ))}
        </div>
      </div>

      {state !== 'completed' && (
        <div className="week-detail__actions">
          <Button type="primary" icon={<CheckCircleFilled />} size="large" disabled={!allTasksDone}
            onClick={onMarkComplete}
            style={{ background: allTasksDone ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : undefined, border: 'none' }}>
            {allTasksDone ? 'Mark Week Complete' : 'Complete all tasks to finish this week'}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function PlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const initialPlanIdx = Math.max(0, DUMMY_PLANS.findIndex((p) => p.id === planId));

  const [activePlanIdx, setActivePlanIdx] = useState(initialPlanIdx);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);
  const [completedWeeks, setCompletedWeeks] = useState<Map<string, Set<number>>>(
    () => new Map(DUMMY_PLANS.map((p) => [p.id, p.id === 'plan-1' ? new Set([0, 1, 2, 3, 4]) : p.id === 'plan-2' ? new Set() : new Set([0])])),
  );
  const [completedTasks, setCompletedTasks] = useState<Map<string, Map<number, Set<number>>>>(
    () => new Map(DUMMY_PLANS.map((p) => [p.id, new Map()])),
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentPlan = DUMMY_PLANS[activePlanIdx];
  const planCompletedWeeks = completedWeeks.get(currentPlan.id) ?? new Set();
  const planCompletedTasks = completedTasks.get(currentPlan.id) ?? new Map<number, Set<number>>();
  const completedCount = planCompletedWeeks.size;
  const progressPercent = Math.round((completedCount / currentPlan.total_weeks) * 100);

  const theme = PLAN_THEMES[activePlanIdx % PLAN_THEMES.length];

  const layout = useMemo(() => computeIslandLayout(currentPlan.total_weeks), [currentPlan.total_weeks]);
  const scale = layout.size / 160;

  const getWeekState = (weekIdx: number): WeekState => {
    if (planCompletedWeeks.has(weekIdx)) return 'completed';
    if (weekIdx === completedCount) return 'active';
    return 'upcoming';
  };

  const stars = useMemo(() => genStars(80), []);
  const islandPositions = layout.positions;

  const svgPathD = useMemo(() => {
    const pts = islandPositions;
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const midX = (prev.x + curr.x) / 2;
      const cpY = Math.min(prev.y, curr.y) - Math.round(80 * scale);
      d += ` C ${midX},${cpY} ${midX},${cpY} ${curr.x},${curr.y}`;
    }
    return d;
  }, [islandPositions, scale]);

  const handleSelectPlan = (idx: number) => {
    setActivePlanIdx(idx);
    setSelectedWeekIdx(null);
    setDropdownOpen(false);
    const p = DUMMY_PLANS[idx];
    setSearchParams({ planId: p.id }, { replace: true });
  };

  const handleIslandClick = (idx: number) => {
    setSelectedWeekIdx(idx === selectedWeekIdx ? null : idx);
  };

  const handleMarkWeekComplete = () => {
    if (selectedWeekIdx === null) return;
    if (!planCompletedWeeks.has(selectedWeekIdx)) {
      const next = new Set(planCompletedWeeks);
      next.add(selectedWeekIdx);
      const n = new Map(completedWeeks);
      n.set(currentPlan.id, next);
      setCompletedWeeks(n);
      setSelectedWeekIdx(null);
    }
  };

  const handleToggleTask = (taskIdx: number) => {
    if (selectedWeekIdx === null) return;
    const weekTasks = planCompletedTasks.get(selectedWeekIdx) ?? new Set<number>();
    const nextWeekTasks = new Set(weekTasks);
    if (nextWeekTasks.has(taskIdx)) nextWeekTasks.delete(taskIdx);
    else nextWeekTasks.add(taskIdx);
    const newWeekMap = new Map(planCompletedTasks);
    newWeekMap.set(selectedWeekIdx, nextWeekTasks);
    const newPlanMap = new Map(completedTasks);
    newPlanMap.set(currentPlan.id, newWeekMap);
    setCompletedTasks(newPlanMap);
  };

  const planMenu: MenuProps = {
    items: DUMMY_PLANS.map((p, i) => ({
      key: String(i),
      label: (
        <Flex align="center" justify="space-between" gap={12} style={{ padding: '4px 0' }}>
          <Flex vertical gap={1}>
            <Text style={{ fontWeight: 600, fontSize: 14, color: i === activePlanIdx ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {p.title}
            </Text>
            <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {p.total_weeks} weeks · {p.weeks.reduce((acc, w) => acc + w.focus_skills.length, 0)} skills
            </Text>
          </Flex>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i === activePlanIdx ? PLAN_THEMES[i % PLAN_THEMES.length].gradient : 'transparent',
            boxShadow: i === activePlanIdx ? `0 0 8px ${PLAN_THEMES[i % PLAN_THEMES.length].glow}` : undefined,
          }} />
        </Flex>
      ),
      onClick: () => handleSelectPlan(i),
    })),
    style: { padding: '6px' },
  };

  const activeWeek = selectedWeekIdx !== null ? currentPlan.weeks[selectedWeekIdx] : null;
  const activeTasksSet = selectedWeekIdx !== null ? (planCompletedTasks.get(selectedWeekIdx) ?? new Set<number>()) : new Set<number>();

  return (
    <div className="plans-world animate-fade-in">
      {/* ── Header ──────────────────────────────── */}
      <Flex align="center" justify="space-between" className="world-header" wrap gap={16}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <CompassOutlined style={{ marginRight: 10, color: 'var(--color-accent-400)' }} />
            <span className="gradient-text">World of Learning</span>
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
            Explore islands. Master skills. Chart your journey.
          </Text>
        </div>

        <Dropdown
          menu={planMenu}
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
          trigger={['click']}
          placement="bottomRight"
          overlayStyle={{ minWidth: 260 }}
        >
          <button className="plan-selector-btn">
            <Flex align="center" gap={10}>
              <div className="plan-selector-dot" style={{ background: theme.gradient }} />
              <Flex vertical align="flex-start" gap={0}>
                <span className="plan-selector-title">{currentPlan.title}</span>
                <span className="plan-selector-meta">
                  {currentPlan.total_weeks} weeks · {completedCount}/{currentPlan.total_weeks} done
                </span>
              </Flex>
              <DownOutlined className={`plan-selector-chevron${dropdownOpen ? ' plan-selector-chevron--open' : ''}`} />
            </Flex>
          </button>
        </Dropdown>
      </Flex>

      {/* ── Progress ─────────────────────────────── */}
      <div className="world-progress">
        <div className="world-progress-top">
          <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
            Journey Progress
          </Text>
          <Text style={{ fontWeight: 700, color: 'var(--text-accent)', fontSize: 14 }}>
            {completedCount} / {currentPlan.total_weeks} islands explored
          </Text>
        </div>
        <Progress percent={progressPercent}
          strokeColor={{ '0%': '#8B5CF6', '100%': '#06B6D4' }}
          trailColor="rgba(255,255,255,0.06)" strokeWidth={10} showInfo={false} style={{ margin: 0 }} />
      </div>

      {/* ── World Map ────────────────────────────── */}
      <motion.div className="map-viewport" initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="map-scroll">
          <div className="map-inner" key={currentPlan.id} style={{ minWidth: layout.totalWidth }}>
            <div className="starfield">
              {stars.map((s) => (
                <div key={s.id} className={`star${s.size === 'lg' ? ' star--lg' : ''}`}
                  style={{ left: s.left, top: s.top, '--twinkle-dur': `${s.dur}s`, '--twinkle-delay': `${s.delay}s`, '--twinkle-op': s.opacity } as React.CSSProperties} />
              ))}
            </div>
            <div className="map-grid" />
            <div className="map-border-decor" />
            <div className="map-compass">
              <div className="map-compass-inner">
                <span className="map-compass-n">N</span>
                <span className="map-compass-s">S</span>
                <div className="map-compass-line-v" />
                <div className="map-compass-line-h" />
              </div>
            </div>

            <svg className="map-paths-svg"
              viewBox={`0 0 ${layout.totalWidth} 520`}
              preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  {islandPositions.map((_, i) => {
                    const st = getWeekState(i);
                    const off = Math.round((i / (islandPositions.length - 1)) * 100);
                    if (st === 'completed') return <stop key={i} offset={`${off}%`} stopColor="#10B981" stopOpacity={0.55} />;
                    if (st === 'active') return <stop key={i} offset={`${off}%`} stopColor="#8B5CF6" stopOpacity={0.55} />;
                    return <stop key={i} offset={`${off}%`} stopColor="rgba(255,255,255,0.08)" stopOpacity={0.25} />;
                  })}
                </linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {svgPathD && (
                <motion.path d={svgPathD} fill="none" stroke="url(#pathGrad)" strokeWidth={2.5}
                  strokeDasharray="10 6" strokeLinecap="round" filter="url(#glow)"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: 'easeInOut', delay: 0.5 }} />
              )}
              {svgPathD && (
                <path d={svgPathD} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8}
                  strokeDasharray="2 14" strokeLinecap="round" />
              )}
            </svg>

            <div className="map-fog"
              style={{ display: completedCount >= currentPlan.total_weeks - 1 ? 'none' : undefined }} />

            {currentPlan.weeks.map((week, idx) => (
              <IslandNode key={week.week} week={week}
                state={getWeekState(idx)} isSelected={idx === selectedWeekIdx}
                position={islandPositions[idx]} onClick={() => handleIslandClick(idx)}
                floatDelay={idx * 0.5} islandW={layout.size} islandH={layout.h} scale={scale} />
            ))}
          </div>
        </div>

        {selectedWeekIdx === null && (
          <motion.div className="map-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}>
            <AimOutlined style={{ fontSize: 18, color: 'var(--text-accent)' }} />
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Click an island to explore its contents</Text>
          </motion.div>
        )}
      </motion.div>

      {/* ── Week Detail ──────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedWeekIdx !== null && activeWeek ? (
          <WeekDetail key={`${activePlanIdx}-${selectedWeekIdx}`}
            week={activeWeek} state={getWeekState(selectedWeekIdx)}
            completedTasks={activeTasksSet} onToggleTask={handleToggleTask}
            onMarkComplete={handleMarkWeekComplete} />
        ) : (
          <motion.div className="no-island-selected" key="empty"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <div className="no-island-selected__icon">
              <RocketOutlined />
            </div>
            <Title level={4} style={{ color: 'var(--text-secondary)', margin: '12px 0 4px' }}>
              Your adventure awaits
            </Title>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
              Tap any island on the map above to reveal its quests, skills, and treasures.
            </Text>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
