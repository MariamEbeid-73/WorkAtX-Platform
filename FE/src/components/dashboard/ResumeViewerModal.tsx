import { Modal, Typography, Flex, Button } from 'antd';
import { FilePdfOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ResumeViewerModalProps {
  open: boolean;
  onClose: () => void;
  resumeUrl?: string; // Replace with actual PDF URL
}

export function ResumeViewerModal({ open, onClose, resumeUrl }: ResumeViewerModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={800}
      title={
        <Flex align="center" justify="space-between" style={{ paddingRight: 24 }}>
          <Flex align="center" gap={12}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #EF4444, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FilePdfOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <Flex vertical gap={1}>
              <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>Your Resume</Title>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Analyzed by Work@X AI
              </Text>
            </Flex>
          </Flex>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            href={resumeUrl}
            target="_blank"
            download
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)',
              borderRadius: 8,
            }}
          >
            Download
          </Button>
        </Flex>
      }
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
      styles={{
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 24px 16px',
        },
        body: { padding: 0 },
      }}
    >
      <div style={{ width: '100%', height: '70vh', background: '#1A1C23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {resumeUrl ? (
          <iframe 
            src={`${resumeUrl}#toolbar=0`} 
            width="100%" 
            height="100%" 
            style={{ border: 'none' }} 
            title="Resume PDF Viewer"
          />
        ) : (
          <Flex vertical align="center" gap={12}>
            <FilePdfOutlined style={{ fontSize: 48, color: 'var(--text-tertiary)' }} />
            <Text style={{ color: 'var(--text-secondary)' }}>No resume found. Upload one to see it here.</Text>
          </Flex>
        )}
      </div>
    </Modal>
  );
}
