import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUser, useClerk, useAuth } from "@clerk/react";
import { Layout, Menu, Button, Tooltip, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  ApartmentOutlined,
  RobotOutlined,
  LogoutOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  BellOutlined,
  ReadOutlined,
  AudioOutlined,
  FileSearchOutlined,
  ScheduleOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { listResumes } from "../services/resumeService";
import { OnboardingModal } from "../components/OnboardingModal";
import "./AppLayout.css";

const { Sider, Content } = Layout;

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 72;

const navItems: MenuProps["items"] = [
  {
    key: "/dashboard",
    icon: <UserOutlined />,
    label: <span className="nav-label">Profile</span>,
    },
    {
        key: "/knowledge-graph",
        icon: <ApartmentOutlined />,
        label: <span className="nav-label">Knowledge Graph</span>,
    },
  {
    key: "/geni",
    icon: <RobotOutlined />,
    label: <span className="nav-label">GenAi</span>,
  },
    {
    key: "/plans",
    icon: <ScheduleOutlined />,
    label: <span className="nav-label">Study Plans</span>,
  },
  {
    key: "/ai-tutor",
    icon: <ReadOutlined />,
    label: <span className="nav-label">Ai Tutoring</span>,
  },
  {
    key: "/mock-interview",
    icon: <AudioOutlined />,
    label: <span className="nav-label">Mock Interview</span>,
  },
  {
    key: "/cv-optimizer",
    icon: <FileSearchOutlined />,
    label: <span className="nav-label">Cv Optimizer</span>,
  },

];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();

  // Mobile drawer state. Below the 960px breakpoint the Sider becomes an
  // off-canvas drawer; on desktop `isMobile` is false and these are inert.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 960px)").matches,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 960px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Close the drawer whenever the route changes (a nav item was tapped) so
  // the user sees the page they just navigated to.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setChecked(true);
        setNeedsOnboarding(true);
        return;
      }
      try {
        const resumes = await listResumes(token);
        setNeedsOnboarding(resumes.length === 0);
      } catch (err) {
        console.error("Failed to load resumes:", err);
        setNeedsOnboarding(true);
      } finally {
        setChecked(true);
      }
    })();
  }, [getToken]);

  const siderWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;
  // On mobile the content always spans full width — the inline marginLeft
  // is only applied on desktop. The CSS in AppLayout.css enforces
  // margin-left:0 below 960px, but we also avoid setting it inline here so
  // there's nothing to fight with `!important`.
  const contentMargin = isMobile ? 0 : siderWidth;

  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") ||
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
    "U";

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";
  const email = user?.primaryEmailAddress?.emailAddress || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const accountMenu: MenuProps = {
    items: [
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: "Settings",
        onClick: () => navigate("/settings"),
      },
      {
        key: "notifications",
        icon: <BellOutlined />,
        label: "Notifications",
      },
      { type: "divider" },
      {
        key: "signout",
        icon: <LogoutOutlined />,
        label: "Sign Out",
        danger: true,
        onClick: handleSignOut,
      },
    ],
  };

  return (
    <>
      <Layout className="app-shell">
        <Sider
          className={`app-sider${isMobile && drawerOpen ? " app-sider--drawer-open" : ""}`}
          width={SIDEBAR_WIDTH}
          collapsedWidth={SIDEBAR_COLLAPSED}
          collapsed={collapsed}
          trigger={null}
        >
          <a
            className="sider-logo"
            onClick={() => navigate("/dashboard")}
            role="button"
            style={{ cursor: "pointer" }}
          >
            <div className="sider-logo-icon">W</div>
            <span className={`sider-logo-text${collapsed ? " collapsed" : ""}`}>
              Work@X
            </span>
          </a>

          <div className="sider-nav-wrap">
            {!collapsed && <div className="nav-section-label">Main</div>}
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={navItems}
              onClick={({ key }) => navigate(key)}
              inlineCollapsed={collapsed}
            />
          </div>

          <div className="sider-footer">
            <Dropdown
              menu={accountMenu}
              placement="topLeft"
              trigger={["click"]}
            >
              <div className="user-chip">
                <div className="user-chip-avatar">{initials}</div>
                <div
                  className={`user-chip-info${collapsed ? " collapsed" : ""}`}
                >
                  <span className="user-chip-name">{displayName}</span>
                  <span className="user-chip-email">{email}</span>
                </div>
              </div>
            </Dropdown>

            {collapsed && (
              <div className="signout-btn-row">
                <Tooltip title="Sign Out" placement="right">
                  <Button
                    type="text"
                    icon={<LogoutOutlined />}
                    onClick={handleSignOut}
                    size="small"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </Tooltip>
              </div>
            )}
          </div>
        </Sider>

        {/* ── Mobile top bar (only visible ≤ 960px via CSS) ─────────────── */}
        <div className="mobile-topbar" aria-hidden={!isMobile}>
          <div className="mobile-topbar__left">
            <button
              className="mobile-topbar__hamburger"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              <MenuOutlined />
            </button>
            <a
              className="mobile-topbar__logo"
              onClick={() => navigate("/dashboard")}
              role="button"
              style={{ cursor: "pointer" }}
            >
              <div className="sider-logo-icon">W</div>
              <span className="mobile-topbar__logo-text">Work@X</span>
            </a>
          </div>
          <div className="mobile-topbar__right">
            <Tooltip title="Notifications">
              <Button
                type="text"
                size="small"
                icon={<BellOutlined />}
                style={{ color: "var(--text-secondary)" }}
                aria-label="Notifications"
              />
            </Tooltip>
            <div className="mobile-topbar__avatar" aria-label={displayName}>
              {initials}
            </div>
          </div>
        </div>

        {/* ── Mobile drawer backdrop (only visible ≤ 960px via CSS) ─────── */}
        <div
          className={`mobile-backdrop${drawerOpen ? " mobile-backdrop--visible" : ""}`}
          onClick={() => setDrawerOpen(false)}
          aria-hidden={!isMobile}
        />

        <button
          className="sider-collapse-btn"
          style={{ left: siderWidth - 11 }}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <RightOutlined /> : <LeftOutlined />}
        </button>

        <Content
          className="app-content-area"
          style={{ marginLeft: contentMargin }}
        >
          <div className="app-content-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>

      {checked && (
        <OnboardingModal
          open={needsOnboarding}
          closable={false}
          onComplete={() => setNeedsOnboarding(false)}
          onClose={() => setNeedsOnboarding(false)}
        />
      )}
    </>
  );
}
