import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import { Layout, Menu, Button, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  ApartmentOutlined,
  RobotOutlined,
  LogoutOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';
import './AppLayout.css';
import { CrownOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;

const SIDEBAR_WIDTH     = 240;
const SIDEBAR_COLLAPSED = 72;

// ── Navigation items ─────────────────────────────────────────────────────────
const navItems: MenuProps['items'] = [
    {
        key: '/dashboard',
        icon: <UserOutlined />,
        label: <span className="nav-label">Profile</span>,
    },
    {
        key: '/knowledge-graph',
        icon: <ApartmentOutlined />,
        label: <span className="nav-label">Knowledge Graph</span>,
    },
    {
        key: '/geni',
        icon: <RobotOutlined />,
        label: <span className="nav-label">Geni AI</span>,
    },
    {
        key: '/pricing',
        icon: <CrownOutlined />,
        label: <span className="nav-label">Billing & Plans</span>,
    },
];
// ── AppLayout ────────────────────────────────────────────────────────────────
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useUser();
  const { signOut } = useClerk();

  const siderWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  // Derive user initials for avatar
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('') || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || 'U';

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User';
  const email       = user?.primaryEmailAddress?.emailAddress || '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // User account dropdown
  const accountMenu: MenuProps = {
      items: [
          {
              key: 'billing',
              icon: <CrownOutlined />,
              label: 'Billing & Plans',
              onClick: () => navigate('/pricing')
          },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Account Settings',
      },
      {
        key: 'notifications',
        icon: <BellOutlined />,
        label: 'Notifications',
      },
      { type: 'divider' },
      {
        key: 'signout',
        icon: <LogoutOutlined />,
        label: 'Sign Out',
        danger: true,
        onClick: handleSignOut,
      },
    ],
  };

  return (
    <Layout className="app-shell">
      {/* ── Fixed Sidebar ───────────────────────────────────────────────── */}
      <Sider
        className="app-sider"
        width={SIDEBAR_WIDTH}
        collapsedWidth={SIDEBAR_COLLAPSED}
        collapsed={collapsed}
        trigger={null}
      >
        {/* Logo */}
        <a
          className="sider-logo"
          onClick={() => navigate('/dashboard')}
          role="button"
          style={{ cursor: 'pointer' }}
        >
          <div className="sider-logo-icon">W</div>
          <span className={`sider-logo-text${collapsed ? ' collapsed' : ''}`}>
            Work@X
          </span>
        </a>

        {/* Navigation */}
        <div className="sider-nav-wrap">
          {!collapsed && (
            <div className="nav-section-label">Main</div>
          )}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={navItems}
            onClick={({ key }) => navigate(key)}
            inlineCollapsed={collapsed}
          />
        </div>

        {/* Footer: user chip + sign-out */}
        <div className="sider-footer">
          <Dropdown menu={accountMenu} placement="topLeft" trigger={['click']}>
            <div className="user-chip">
              <div className="user-chip-avatar">{initials}</div>
              <div className={`user-chip-info${collapsed ? ' collapsed' : ''}`}>
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
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </Sider>

      {/* ── Collapse toggle button ──────────────────────────────────────── */}
      <button
        className="sider-collapse-btn"
        style={{ left: siderWidth - 11 }}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <RightOutlined /> : <LeftOutlined />}
      </button>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <Content
        className="app-content-area"
        style={{ marginLeft: siderWidth }}
      >
        <div className="app-content-inner">
          <Outlet />
        </div>
          </Content>
 
    </Layout>
  );
}
