import { Button, Empty, Flex, Input, Skeleton, Tooltip, Typography, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  MessageOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import type { ChatSessionDto } from '../../types/chat';
import './ChatSidebar.css';

const { Text } = Typography;

interface ChatSidebarProps {
  sessions: ChatSessionDto[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onRename: (sessionId: string, title: string) => void;
  onArchive: (sessionId: string) => void;
  onCollapse: () => void;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  isLoading,
  error,
  onSelect,
  onNewChat,
  onRename,
  onArchive,
  onCollapse,
}: ChatSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const startRename = (session: ChatSessionDto) => {
    setRenamingId(session.id);
    setDraftTitle(session.title ?? '');
  };

  const commitRename = (sessionId: string) => {
    const title = draftTitle.trim();
    if (title) onRename(sessionId, title);
    setRenamingId(null);
  };

  const menuItems: MenuProps['items'] = [
    { key: 'rename', icon: <EditOutlined />, label: 'Rename' },
    { key: 'archive', icon: <DeleteOutlined />, label: 'Delete', danger: true },
  ];

  const handleMenuClick = (session: ChatSessionDto, key: string) => {
    if (key === 'rename') startRename(session);
    if (key === 'archive') onArchive(session.id);
  };

  return (
    <div className="chat-sidebar">
      <Flex align="center" justify="space-between" className="chat-sidebar__header">
        <Text strong style={{ fontSize: 14 }}>
          Chats
        </Text>
        <Tooltip title="Collapse">
          <Button
            type="text"
            size="small"
            icon={<MenuFoldOutlined />}
            onClick={onCollapse}
            aria-label="Collapse chat history"
          />
        </Tooltip>
      </Flex>

      <Button
        block
        icon={<PlusOutlined />}
        onClick={onNewChat}
        className="chat-sidebar__new-btn"
      >
        New chat
      </Button>

      <div className="chat-sidebar__list">
        {isLoading && (
          <div style={{ padding: '8px 4px' }}>
            <Skeleton active title={false} paragraph={{ rows: 4 }} />
          </div>
        )}

        {!isLoading && error && (
          <Text type="danger" style={{ fontSize: 12, padding: '0 8px' }}>
            {error}
          </Text>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <Empty
            description="No chats yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 24 }}
          />
        )}

        {!isLoading &&
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`chat-sidebar__item ${isActive ? 'chat-sidebar__item--active' : ''}`}
                onClick={() => onSelect(session.id)}
                role="button"
                tabIndex={0}
              >
                <MessageOutlined className="chat-sidebar__item-icon" />

                {renamingId === session.id ? (
                  <Input
                    size="small"
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onPressEnter={() => commitRename(session.id)}
                    onBlur={() => commitRename(session.id)}
                  />
                ) : (
                  <div className="chat-sidebar__item-text">
                    <Text ellipsis className="chat-sidebar__item-title">
                      {session.title || 'New chat'}
                    </Text>
                    <Text type="secondary" className="chat-sidebar__item-time">
                      {formatTimestamp(session.lastMessageAt ?? session.createdAt)}
                    </Text>
                  </div>
                )}

                <Dropdown
                  menu={{
                    items: menuItems,
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      handleMenuClick(session, key);
                    },
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    className="chat-sidebar__item-menu-btn"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            );
          })}
      </div>
    </div>
  );
}
