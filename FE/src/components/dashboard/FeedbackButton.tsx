import { useState } from 'react';
import { Button, Modal, Form, Select, Input, Rate, Tooltip, Flex, Typography, message } from 'antd';
import { MessageOutlined, CloseOutlined } from '@ant-design/icons';
import { useSubmitFeedback } from '../../hooks/useProfile';
import type { FeedbackPayload } from '../../types/profile';

const { TextArea } = Input;
const { Text } = Typography;

export function FeedbackButton() {
  const [open, setOpen]   = useState(false);
  const [form]            = Form.useForm<FeedbackPayload>();
  const { mutate, isPending } = useSubmitFeedback();
  const [msgApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values: FeedbackPayload) => {
    const result = await mutate(values);
    if (result) {
      msgApi.success('Thanks for your feedback! 🙏');
      form.resetFields();
      setOpen(false);
    } else {
      msgApi.error('Could not submit feedback. Try again later.');
    }
  };

  return (
    <>
      {contextHolder}

      {/* Floating Action Button */}
      <Tooltip title="Give Feedback" placement="left">
        <button
          id="feedback-fab"
          aria-label="Give Feedback"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)',
            border: 'none',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(139,92,246,0.45), 0 8px 24px rgba(0,0,0,0.4)',
            transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px) scale(1.03)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 36px rgba(139,92,246,0.60), 0 12px 32px rgba(0,0,0,0.5)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 24px rgba(139,92,246,0.45), 0 8px 24px rgba(0,0,0,0.4)';
          }}
        >
          <MessageOutlined style={{ fontSize: 16 }} />
          Give Feedback
        </button>
      </Tooltip>

      {/* Feedback Modal */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        title={
          <Flex align="center" gap={12}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <Flex vertical gap={2}>
              <Text strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>
                Share Your Feedback
              </Text>
              <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                Help us make Work@X better for everyone
              </Text>
            </Flex>
          </Flex>
        }
        closeIcon={<CloseOutlined style={{ color: 'var(--text-tertiary)' }} />}
        width={480}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
        }}
        styles={{
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '20px 24px 16px',
            marginBottom: 0,
          },
          body: { padding: '20px 24px 24px' },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'general', rating: 4 }}
        >
          <Form.Item label="Feedback Type" name="type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '🐛 Bug Report', value: 'bug' },
                { label: '✨ Feature Request', value: 'feature' },
                { label: '💬 General Feedback', value: 'general' },
              ]}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item label="Your Experience Rating" name="rating">
            <Rate style={{ color: '#F59E0B' }} />
          </Form.Item>

          <Form.Item
            label="Tell us more"
            name="message"
            rules={[{ required: true, min: 10, message: 'Please write at least 10 characters' }]}
          >
            <TextArea
              rows={4}
              placeholder="What's on your mind? Be as detailed as you like..."
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                resize: 'none',
              }}
            />
          </Form.Item>

          <Flex gap={10} justify="flex-end">
            <Button onClick={() => setOpen(false)} style={{ borderRadius: 10 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isPending}
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Submit Feedback
            </Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}
