import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Flex, Typography, Tag, message } from "antd";
import {
  GithubOutlined,
  LinkedinOutlined,
  TrophyOutlined,
  CodeOutlined,
  BranchesOutlined,
  RiseOutlined,
  MinusOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useAuth } from "@clerk/react";
import type {
  AnalysisResult,
  ScoreMetric,
  ScoreDomain,
} from "../types/analysis";
import { waitForJobCompletion, getJobResult } from "../services/jobService";
import { startAnalysis, getLatestAnalysis } from "../services/analysisService";

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// Loading State — Cinematic analysis screen
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisLoadingState({
  jobId,
  onDone,
  onError,
}: {
  jobId: string;
  onDone: (data: AnalysisResult) => void;
  onError: () => void;
}) {
  const [stages, setStages] = useState<
    { label: string; isDone: boolean; isActive: boolean }[]
  >([]);
  const [progress, setProgress] = useState(0);
  const { getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        // Same wait path as chat: SignalR push first, polling as fallback.
        const finalStatus = await waitForJobCompletion(getToken, token, jobId, {
          onProgress: (update) => {
            if (cancelled) return;
            if (update.progress != null) setProgress(update.progress);

            if (update.stage) {
              const stage = update.stage;
              setStages((prev) => {
                const next = prev.map((s) => ({
                  ...s,
                  isActive: false,
                  isDone: true,
                }));
                const existing = next.find((s) => s.label === stage);
                if (!existing) {
                  next.push({ label: stage, isActive: true, isDone: false });
                } else {
                  existing.isActive = true;
                  existing.isDone = false;
                }
                return next;
              });
            }
          },
        });

        if (finalStatus.status === "failed") {
          if (cancelled) return;
          onError();
          return;
        }

        const res = await getJobResult(token, jobId);
        if (cancelled) return;
        onDone(res.result as AnalysisResult);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        onError();
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Ambient glow blobs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)",
          top: "30%",
          right: "15%",
          pointerEvents: "none",
          animation: "float 6s ease-in-out infinite",
        }}
      />

      <Flex
        vertical
        align="center"
        gap={48}
        style={{ width: "100%", maxWidth: 560, zIndex: 1, padding: "0 24px" }}
      >
        {/* Orb + spinner */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#8B5CF6",
              borderRightColor: "rgba(139,92,246,0.3)",
              animation: "spin 1.4s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#06B6D4",
              borderLeftColor: "rgba(6,182,212,0.3)",
              animation: "spin 2s linear infinite reverse",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 16,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.18))",
              border: "1px solid rgba(139,92,246,0.40)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse-glow 2.5s ease-in-out infinite",
            }}
          >
            <BranchesOutlined style={{ fontSize: 28, color: "#A78BFA" }} />
          </div>
        </div>

        {/* Heading */}
        <Flex vertical align="center" gap={10} style={{ textAlign: "center" }}>
          <Tag
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.30)",
              color: "#A78BFA",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.10em",
              padding: "3px 12px",
            }}
          >
            AI ANALYSIS IN PROGRESS
          </Tag>
          <Title
            level={2}
            style={{
              margin: 0,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            Building Your Profile
          </Title>
          <Text
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 400,
            }}
          >
            Our AI is deeply analysing your resume, GitHub activity, and
            LinkedIn profile to build your complete developer identity.
          </Text>
        </Flex>

        {/* Step list */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {stages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 14,
              }}
            >
              Connecting to AI service...
            </div>
          )}
          {stages.map((step) => {
            const isDone = step.isDone;
            const isActive = step.isActive;
            return (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: isActive
                    ? "rgba(139,92,246,0.08)"
                    : isDone
                      ? "rgba(16,185,129,0.05)"
                      : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? "rgba(139,92,246,0.25)" : isDone ? "rgba(16,185,129,0.20)" : "rgba(255,255,255,0.05)"}`,
                  transition: "all 0.4s ease",
                  opacity: !isActive && !isDone ? 0.35 : 1,
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: isDone
                      ? "rgba(16,185,129,0.18)"
                      : isActive
                        ? "rgba(139,92,246,0.18)"
                        : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isDone ? "rgba(16,185,129,0.50)" : isActive ? "rgba(139,92,246,0.50)" : "rgba(255,255,255,0.10)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isDone ? (
                    <span style={{ fontSize: 11, color: "#10B981" }}>✓</span>
                  ) : isActive ? (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#8B5CF6",
                        animation: "pulse-glow 1s ease-in-out infinite",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.15)",
                      }}
                    />
                  )}
                </div>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isDone
                      ? "#10B981"
                      : isActive
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    flex: 1,
                  }}
                >
                  {step.label}
                </Text>
                {isActive && (
                  <div style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2].map((dot) => (
                      <div
                        key={dot}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "#8B5CF6",
                          animation: `pulse-glow 1.2s ease-in-out ${dot * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <Flex vertical gap={10} style={{ width: "100%", marginTop: 12 }}>
          <div
            style={{
              width: "100%",
              height: 4,
              borderRadius: 99,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 99,
                background: "linear-gradient(90deg, #8B5CF6, #06B6D4)",
                width: `${progress}%`,
                transition: "width 1s ease",
                boxShadow: "0 0 12px rgba(139,92,246,0.60)",
              }}
            />
          </div>
          <Flex justify="space-between" align="center">
            <Text style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {Math.round(progress)}% complete
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components for Result State
// ─────────────────────────────────────────────────────────────────────────────

/** Circular score gauge */
function ScoreGauge({
  value = 0,
  size = 80,
  color = "#8B5CF6",
}: {
  value?: number;
  size?: number;
  color?: string;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
            transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: size * 0.22,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {value}
        </Text>
      </div>
    </div>
  );
}

/** Trend badge */
function TrendBadge({ trend = 0 }: { trend?: number }) {
  if (trend === 0)
    return (
      <Tag
        icon={<MinusOutlined />}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "var(--text-tertiary)",
          borderRadius: 6,
          fontSize: 11,
        }}
      >
        Stable
      </Tag>
    );
  return (
    <Tag
      icon={<RiseOutlined />}
      style={{
        background:
          trend > 0 ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
        border: `1px solid ${trend > 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
        color: trend > 0 ? "#10B981" : "#EF4444",
        borderRadius: 6,
        fontSize: 11,
      }}
    >
      {trend > 0 ? `+${trend}` : trend}
    </Tag>
  );
}

/** Domain score card (3 metrics in a row) */
function DomainScoreCard({
  label,
  emoji,
  domain,
  color,
}: {
  label: string;
  emoji: string;
  domain: ScoreDomain;
  color: string;
}) {
  const metrics: { key: keyof ScoreDomain; icon: React.ReactNode }[] = [
    { key: "overallShowoff", icon: <TrophyOutlined /> },
    { key: "resume", icon: <CodeOutlined /> },
    { key: "github", icon: <GithubOutlined /> },
  ];

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 24,
        background: "rgba(14,18,32,0.80)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${color}18`,
              border: `1px solid ${color}35`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {emoji}
          </div>
          <Text
            style={{
              fontWeight: 700,
              color: "var(--text-primary)",
              fontSize: 15,
            }}
          >
            {label}
          </Text>
        </Flex>
      </Flex>

      <Flex gap={16} wrap="wrap">
        {metrics.map(({ key }) => {
          const metric: ScoreMetric = domain[key] ?? {};
          return (
            <Flex
              key={key}
              vertical
              align="center"
              gap={10}
              style={{ flex: "1 1 100px", minWidth: 100 }}
            >
              <ScoreGauge value={metric.value ?? 0} size={76} color={color} />
              <Flex vertical align="center" gap={4}>
                <Text
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  {metric.label ?? key}
                </Text>
                <TrendBadge trend={metric.trend} />
              </Flex>
            </Flex>
          );
        })}
      </Flex>
    </div>
  );
}

/** Pill chip */
function Chip({
  label,
  color = "rgba(139,92,246,0.12)",
  border = "rgba(139,92,246,0.25)",
  text = "#A78BFA",
}: {
  label: string;
  color?: string;
  border?: string;
  text?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 99,
        background: color,
        border: `1px solid ${border}`,
        color: text,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.6,
      }}
    >
      {label}
    </span>
  );
}

/** Section wrapper card */
function SectionCard({
  title,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="animate-fade-in"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 20,
        padding: 28,
        background: "rgba(14,18,32,0.80)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Flex align="center" gap={10} style={{ marginBottom: 20 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A78BFA",
            fontSize: 15,
          }}
        >
          {icon}
        </div>
        <Text
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </Text>
      </Flex>
      {children}
    </div>
  );
}

/** Format date like "Oct 2024" → "Oct 2024" or null → "Present" */
function fmtDate(d: string | null | undefined, fallback = "Present") {
  if (!d) return fallback;
  const [y, m] = d.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[parseInt(m) - 1] ?? ""} ${y}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result State — Full rich display
// ─────────────────────────────────────────────────────────────────────────────
function AnalysisResultState({ data }: { data: AnalysisResult }) {
  const pa = data.profileAnalysis ?? {};
  const profile = pa.profile ?? {};
  const scores = data.scoreBreakdown ?? {};

  const skillGroups: {
    label: string;
    key: keyof NonNullable<typeof profile.skills>;
    color: string;
    border: string;
    text: string;
  }[] = [
    {
      label: "Languages",
      key: "programmingLanguages",
      color: "rgba(139,92,246,0.12)",
      border: "rgba(139,92,246,0.30)",
      text: "#A78BFA",
    },
    {
      label: "Frameworks",
      key: "frameworks",
      color: "rgba(6,182,212,0.10)",
      border: "rgba(6,182,212,0.28)",
      text: "#22D3EE",
    },
    {
      label: "Cloud/Infra",
      key: "cloudAndInfra",
      color: "rgba(245,158,11,0.10)",
      border: "rgba(245,158,11,0.28)",
      text: "#FCD34D",
    },
    {
      label: "Databases",
      key: "databases",
      color: "rgba(59,130,246,0.10)",
      border: "rgba(59,130,246,0.28)",
      text: "#60A5FA",
    },
    {
      label: "Tools",
      key: "tools",
      color: "rgba(16,185,129,0.10)",
      border: "rgba(16,185,129,0.28)",
      text: "#34D399",
    },
    {
      label: "Other",
      key: "other",
      color: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.12)",
      text: "var(--text-secondary)",
    },
  ];

  const domainCards = [
    {
      label: "Overall",
      emoji: "⚡",
      key: "overall" as keyof typeof scores,
      color: "#8B5CF6",
    },
    {
      label: "Developer",
      emoji: "💻",
      key: "dev" as keyof typeof scores,
      color: "#06B6D4",
    },
    {
      label: "AI / ML",
      emoji: "🧠",
      key: "aiml" as keyof typeof scores,
      color: "#F59E0B",
    },
  ];

  const langColors: Record<string, string> = {
    TypeScript: "#3178C6",
    Python: "#3572A5",
    "C++": "#f34b7d",
    JavaScript: "#F7DF1E",
    Java: "#B07219",
    default: "#8B5CF6",
  };

  return (
    <Flex vertical gap={24}>
      {/* ── Hero Card ─────────────────────────────────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{
          borderRadius: 24,
          padding: "32px 32px",
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(6,182,212,0.06) 100%)",
          border: "1px solid rgba(139,92,246,0.20)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <Flex gap={24} wrap="wrap" align="flex-start">
          {/* Avatar */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              flexShrink: 0,
              background: "linear-gradient(135deg, #7C3AED, #0891B2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 0 24px rgba(139,92,246,0.40)",
            }}
          >
            {profile.fullName?.[0] ?? "A"}
          </div>

          <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
            <Flex align="center" gap={10} wrap="wrap">
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {profile.fullName}
              </Title>
              {profile.openToWork && (
                <Tag
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.30)",
                    color: "#10B981",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  #OPEN TO WORK
                </Tag>
              )}
              {profile.seniorityLevel && (
                <Tag
                  style={{
                    background: "rgba(139,92,246,0.12)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    color: "#A78BFA",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {profile.seniorityLevel}
                </Tag>
              )}
            </Flex>

            {profile.headline && (
              <Text
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {profile.headline}
              </Text>
            )}

            <Flex gap={16} wrap="wrap" style={{ marginTop: 4 }}>
              {profile.location && (
                <Flex align="center" gap={5}>
                  <EnvironmentOutlined
                    style={{ fontSize: 12, color: "var(--text-tertiary)" }}
                  />
                  <Text style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {profile.location}
                  </Text>
                </Flex>
              )}
              {profile.yearsOfExperience != null && (
                <Flex align="center" gap={5}>
                  <CalendarOutlined
                    style={{ fontSize: 12, color: "var(--text-tertiary)" }}
                  />
                  <Text style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {profile.yearsOfExperience}+ years experience
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Flex>

        {profile.about && (
          <div
            style={{
              marginTop: 20,
              padding: "16px 20px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
              }}
            >
              {profile.about}
            </Text>
          </div>
        )}

        {/* Soft skills */}
        {(profile.softSkills?.length ?? 0) > 0 && (
          <Flex gap={8} wrap="wrap" style={{ marginTop: 16 }}>
            {profile.softSkills!.map((s) => (
              <Chip
                key={s}
                label={s}
                color="rgba(255,255,255,0.04)"
                border="rgba(255,255,255,0.10)"
                text="var(--text-secondary)"
              />
            ))}
          </Flex>
        )}
      </div>

      {/* ── Score Hub ─────────────────────────────────────────────────────── */}
      {Object.keys(scores).length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "80ms" }}>
          <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
            <TrophyOutlined style={{ color: "#F59E0B", fontSize: 16 }} />
            <Text
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              Score Breakdown
            </Text>
          </Flex>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {domainCards.map(({ label, emoji, key, color }) =>
              scores[key] ? (
                <DomainScoreCard
                  key={key}
                  label={label}
                  emoji={emoji}
                  domain={scores[key]!}
                  color={color}
                />
              ) : null,
            )}
          </div>
        </div>
      )}

      {/* ── Skills Matrix ──────────────────────────────────────────────────── */}
      {profile.skills && (
        <SectionCard title="Skills Matrix" icon={<CodeOutlined />} delay={160}>
          <Flex vertical gap={14}>
            {skillGroups.map(({ label, key, color, border, text }) => {
              const items = profile.skills?.[key] as string[] | undefined;
              if (!items?.length) return null;
              return (
                <div key={key}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </Text>
                  <Flex gap={6} wrap="wrap">
                    {items.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        color={color}
                        border={border}
                        text={text}
                      />
                    ))}
                  </Flex>
                </div>
              );
            })}
          </Flex>
        </SectionCard>
      )}

      {/* ── Experience Timeline ────────────────────────────────────────────── */}
      {(pa.experience?.length ?? 0) > 0 && (
        <SectionCard title="Experience" icon={<CalendarOutlined />} delay={240}>
          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 0,
                bottom: 0,
                width: 1,
                background:
                  "linear-gradient(180deg, rgba(139,92,246,0.40), rgba(6,182,212,0.20), transparent)",
              }}
            />
            <Flex vertical gap={0}>
              {pa.experience!.map((exp, i) => (
                <div
                  key={i}
                  style={{
                    paddingLeft: 36,
                    paddingBottom: i < pa.experience!.length - 1 ? 28 : 0,
                    position: "relative",
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: 6,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background:
                        exp.endDate === null
                          ? "#8B5CF6"
                          : "rgba(255,255,255,0.12)",
                      border: `2px solid ${exp.endDate === null ? "rgba(139,92,246,0.50)" : "rgba(255,255,255,0.15)"}`,
                      boxShadow:
                        exp.endDate === null
                          ? "0 0 8px rgba(139,92,246,0.60)"
                          : "none",
                    }}
                  />

                  <Flex vertical gap={4}>
                    <Flex align="center" gap={8} wrap="wrap">
                      <Text
                        style={{
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontSize: 14,
                        }}
                      >
                        {exp.position}
                      </Text>
                      {exp.employmentType && (
                        <Tag
                          style={{
                            background:
                              exp.employmentType === "Full-time"
                                ? "rgba(16,185,129,0.10)"
                                : exp.employmentType === "Volunteer"
                                  ? "rgba(245,158,11,0.10)"
                                  : "rgba(139,92,246,0.10)",
                            border: `1px solid ${exp.employmentType === "Full-time" ? "rgba(16,185,129,0.25)" : exp.employmentType === "Volunteer" ? "rgba(245,158,11,0.25)" : "rgba(139,92,246,0.25)"}`,
                            color:
                              exp.employmentType === "Full-time"
                                ? "#10B981"
                                : exp.employmentType === "Volunteer"
                                  ? "#F59E0B"
                                  : "#A78BFA",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {exp.employmentType}
                        </Tag>
                      )}
                    </Flex>

                    <Text
                      style={{
                        fontSize: 13,
                        color: "var(--color-accent-400)",
                        fontWeight: 600,
                      }}
                    >
                      {exp.company}
                    </Text>

                    <Flex gap={12} wrap="wrap">
                      {(exp.startDate || exp.durationMonths) && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {exp.durationMonths
                            ? `${exp.durationMonths} months`
                            : `${fmtDate(exp.startDate)} – ${fmtDate(exp.endDate)}`}
                        </Text>
                      )}
                      {exp.location && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          · {exp.location}
                        </Text>
                      )}
                      {exp.workplaceType && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          · {exp.workplaceType}
                        </Text>
                      )}
                    </Flex>

                    {exp.description && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          lineHeight: 1.7,
                          marginTop: 2,
                        }}
                      >
                        {exp.description}
                      </Text>
                    )}
                  </Flex>
                </div>
              ))}
            </Flex>
          </div>
        </SectionCard>
      )}

      {/* ── Projects Grid ─────────────────────────────────────────────────── */}
      {(pa.projects?.length ?? 0) > 0 && (
        <SectionCard title="Projects" icon={<BranchesOutlined />} delay={320}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {pa.projects!.map((proj, i) => (
              <div
                key={i}
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.2s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(139,92,246,0.06)";
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(139,92,246,0.20)";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.02)";
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(0)";
                }}
              >
                <Flex vertical gap={8}>
                  <Flex justify="space-between" align="flex-start" gap={8}>
                    <Text
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      {proj.name}
                    </Text>
                    <Flex gap={4} wrap="wrap" style={{ flexShrink: 0 }}>
                      {proj.source === "github" && (
                        <Tag
                          icon={<GithubOutlined />}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "var(--text-secondary)",
                            borderRadius: 6,
                            fontSize: 10,
                          }}
                        >
                          GitHub
                        </Tag>
                      )}
                      {proj.source === "resume" && (
                        <Tag
                          style={{
                            background: "rgba(139,92,246,0.10)",
                            border: "1px solid rgba(139,92,246,0.22)",
                            color: "#A78BFA",
                            borderRadius: 6,
                            fontSize: 10,
                          }}
                        >
                          Resume
                        </Tag>
                      )}
                    </Flex>
                  </Flex>
                  {proj.description && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {proj.description}
                    </Text>
                  )}
                  {proj.language && (
                    <Flex align="center" gap={5}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background:
                            langColors[proj.language] ?? langColors.default,
                        }}
                      />
                      <Text
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                      >
                        {proj.language}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Education ─────────────────────────────────────────────────────── */}
      {(profile.education?.length ?? 0) > 0 && (
        <SectionCard title="Education" icon={<TrophyOutlined />} delay={400}>
          <Flex vertical gap={12}>
            {profile.education!.map((edu, i) => (
              <Flex
                key={i}
                align="center"
                gap={16}
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: "rgba(139,92,246,0.10)",
                    border: "1px solid rgba(139,92,246,0.20)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  🎓
                </div>
                <Flex vertical gap={3} style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontSize: 13,
                    }}
                  >
                    {edu.institution}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" · ")}
                  </Text>
                  {(edu.startYear || edu.endYear) && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {edu.startYear}{" "}
                      {edu.endYear ? `– ${edu.endYear}` : "– Present"}
                    </Text>
                  )}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </SectionCard>
      )}

      {/* ── Social Metadata ────────────────────────────────────────────────── */}
      {pa.socialMetadata && (
        <SectionCard
          title="Social Metadata"
          icon={<LinkOutlined />}
          delay={480}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {/* GitHub */}
            {pa.socialMetadata.github &&
              (() => {
                const gh = pa.socialMetadata!.github!;
                return (
                  <div
                    style={{
                      padding: "18px 20px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Flex align="center" gap={10} style={{ marginBottom: 14 }}>
                      <GithubOutlined
                        style={{ fontSize: 18, color: "var(--text-primary)" }}
                      />
                      <Text
                        style={{
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontSize: 14,
                        }}
                      >
                        GitHub
                      </Text>
                      {gh.username && (
                        <a
                          href={gh.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginLeft: "auto" }}
                        >
                          <Tag
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "var(--text-secondary)",
                              borderRadius: 6,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            @{gh.username}
                          </Tag>
                        </a>
                      )}
                    </Flex>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      {[
                        { label: "Repos", value: gh.publicRepos },
                        { label: "Followers", value: gh.followers },
                        { label: "Following", value: gh.following },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            textAlign: "center",
                            padding: "10px 8px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: "var(--text-primary)",
                              display: "block",
                            }}
                          >
                            {value ?? "–"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {label}
                          </Text>
                        </div>
                      ))}
                    </div>
                    {(gh.topLanguages?.length ?? 0) > 0 && (
                      <Flex gap={6} wrap="wrap">
                        {gh.topLanguages!.map((lang) => (
                          <Flex key={lang} align="center" gap={5}>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background:
                                  langColors[lang] ?? langColors.default,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {lang}
                            </Text>
                          </Flex>
                        ))}
                      </Flex>
                    )}
                  </div>
                );
              })()}

            {/* LinkedIn */}
            {pa.socialMetadata.linkedin &&
              (() => {
                const li = pa.socialMetadata!.linkedin!;
                return (
                  <div
                    style={{
                      padding: "18px 20px",
                      borderRadius: 16,
                      background: "rgba(0,119,181,0.05)",
                      border: "1px solid rgba(0,119,181,0.15)",
                    }}
                  >
                    <Flex align="center" gap={10} style={{ marginBottom: 14 }}>
                      <LinkedinOutlined
                        style={{ fontSize: 18, color: "#00A0DC" }}
                      />
                      <Text
                        style={{
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontSize: 14,
                        }}
                      >
                        LinkedIn
                      </Text>
                      {li.publicIdentifier && (
                        <a
                          href={li.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginLeft: "auto" }}
                        >
                          <Tag
                            style={{
                              background: "rgba(0,119,181,0.10)",
                              border: "1px solid rgba(0,119,181,0.25)",
                              color: "#00A0DC",
                              borderRadius: 6,
                              fontSize: 11,
                            }}
                          >
                            @{li.publicIdentifier}
                          </Tag>
                        </a>
                      )}
                    </Flex>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      {[
                        { label: "Connections", value: li.connectionsCount },
                        { label: "Followers", value: li.followerCount },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            textAlign: "center",
                            padding: "10px 8px",
                            borderRadius: 10,
                            background: "rgba(0,119,181,0.05)",
                            border: "1px solid rgba(0,119,181,0.12)",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: "var(--text-primary)",
                              display: "block",
                            }}
                          >
                            {value?.toLocaleString() ?? "–"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {label}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
          </div>
        </SectionCard>
      )}

      {/* ── Certifications & Competitive Programming ───────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {(pa.certifications?.length ?? 0) > 0 && (
          <SectionCard
            title="Certifications"
            icon={<TrophyOutlined />}
            delay={560}
          >
            <Flex vertical gap={10}>
              {pa.certifications!.map((cert, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.18)",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontSize: 13,
                      display: "block",
                    }}
                  >
                    🏆 {cert.title}
                  </Text>
                  {cert.issuedBy && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        display: "block",
                        marginTop: 3,
                      }}
                    >
                      {cert.issuedBy}
                    </Text>
                  )}
                  {cert.issuedAt && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {cert.issuedAt}
                    </Text>
                  )}
                </div>
              ))}
            </Flex>
          </SectionCard>
        )}

        {pa.competitiveProgramming && (
          <SectionCard
            title="Competitive Programming"
            icon={<CodeOutlined />}
            delay={620}
          >
            <Flex vertical gap={12}>
              {(pa.competitiveProgramming.achievements?.length ?? 0) > 0 && (
                <Flex vertical gap={6}>
                  {pa.competitiveProgramming.achievements!.map((ach, i) => (
                    <Flex key={i} align="center" gap={8}>
                      <span style={{ fontSize: 14 }}>🥇</span>
                      <Text
                        style={{ fontSize: 13, color: "var(--text-secondary)" }}
                      >
                        {ach}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              )}
              {(pa.competitiveProgramming.platforms?.length ?? 0) > 0 && (
                <Flex vertical gap={8} style={{ marginTop: 4 }}>
                  {pa.competitiveProgramming.platforms!.map((p, i) => (
                    <Flex
                      key={i}
                      align="center"
                      gap={10}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {p.platform}
                      </Text>
                      {p.handle && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          @{p.handle}
                        </Text>
                      )}
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginLeft: "auto" }}
                        >
                          <LinkOutlined
                            style={{
                              fontSize: 12,
                              color: "var(--text-tertiary)",
                            }}
                          />
                        </a>
                      )}
                    </Flex>
                  ))}
                </Flex>
              )}
            </Flex>
          </SectionCard>
        )}
      </div>
    </Flex>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function KnowledgeGraphPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageState, setPageState] = useState<"idle" | "loading" | "result">(
    "idle",
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<AnalysisResult | null>(null);
  const { getToken } = useAuth();

  const triggerAnalysis = async () => {
    setPageState("loading");
    setResultData(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");
      const { jobId } = await startAnalysis(token);
      setJobId(jobId);
    } catch (e) {
      console.error(e);
      message.error("Failed to start analysis. Check if you uploaded a CV.");
      setPageState("idle");
    }
  };

  useEffect(() => {
    // Explicit re-run request (e.g. right after onboarding) — queue a fresh job.
    if (searchParams.get("analyze") === "true") {
      triggerAnalysis();
      setSearchParams({}, { replace: true });
      return;
    }

    // Plain mount/refresh — restore the last completed analysis from the DB
    // instead of creating a new job. Stays "idle" when there is none yet.
    let cancelled = false;
    const loadLatest = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await getLatestAnalysis(token);
        if (cancelled || !res.data) return;
        setResultData(res.data);
        setPageState("result");
      } catch (e) {
        console.error(e);
      }
    };
    loadLatest();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadingDone = (data: AnalysisResult) => {
    setResultData(data);
    setPageState("result");
  };

  const handleError = () => {
    message.error("Analysis failed.");
    setPageState("idle");
  };

  return (
    <div style={{ animation: "fadeIn 0.5s ease both" }}>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <Flex
        align="baseline"
        justify="space-between"
        wrap="wrap"
        gap={8}
        style={{ marginBottom: 28 }}
      >
        <Flex vertical gap={4}>
          <Text
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Navigation
          </Text>
          <Title
            level={3}
            style={{
              margin: 0,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Knowledge Graph
          </Title>
        </Flex>

        <Flex gap={10} align="center">
          {pageState === "result" && (
            <Tag
              style={{
                background: "rgba(16,185,129,0.10)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10B981",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 12px",
              }}
            >
              ✓ Analysis Complete
            </Tag>
          )}

          {/* Dev helper: toggle between states */}
          {pageState === "idle" && (
            <button
              onClick={triggerAnalysis}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.20), rgba(6,182,212,0.12))",
                border: "1px solid rgba(139,92,246,0.30)",
                color: "#A78BFA",
                transition: "all 0.2s ease",
              }}
            >
              ⚡ Run Analysis
            </button>
          )}
          {pageState === "loading" && (
            <div
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-tertiary)",
              }}
            >
              Processing...
            </div>
          )}
          {pageState === "result" && (
            <button
              onClick={triggerAnalysis}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-tertiary)",
                transition: "all 0.2s ease",
              }}
            >
              ↺ Re-analyse
            </button>
          )}
        </Flex>
      </Flex>

      {/* ── States ────────────────────────────────────────────────────────── */}
      {pageState === "idle" && (
        <Flex
          vertical
          align="center"
          justify="center"
          gap={20}
          style={{
            minHeight: 400,
            borderRadius: 24,
            background: "rgba(14,18,32,0.60)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 48 }}>🧠</div>
          <Flex
            vertical
            align="center"
            gap={8}
            style={{ textAlign: "center", maxWidth: 380, padding: "0 24px" }}
          >
            <Title
              level={4}
              style={{ margin: 0, color: "var(--text-primary)" }}
            >
              No analysis yet
            </Title>
            <Text style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Click{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                Run Analysis
              </strong>{" "}
              to start a deep AI analysis of your profile.
            </Text>
          </Flex>
        </Flex>
      )}

      {pageState === "loading" && jobId && (
        <AnalysisLoadingState
          jobId={jobId}
          onDone={handleLoadingDone}
          onError={handleError}
        />
      )}

      {pageState === "result" && resultData && (
        <AnalysisResultState data={resultData} />
      )}
    </div>
  );
}
