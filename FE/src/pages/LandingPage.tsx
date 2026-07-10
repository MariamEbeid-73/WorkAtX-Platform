import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Row, Col, Card, Space, Badge } from 'antd';
import { CheckCircleFilled, RocketOutlined, ThunderboltOutlined, CrownOutlined } from '@ant-design/icons';
import { config } from '../config';
import './LandingPage.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

interface Plan {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  price: string;
  period: string;
  priceNote: string;
  features: string[];
  ctaLabel: string;
  ctaType: 'primary' | 'default' | 'dashed';
  featured: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free-trial',
    name: 'Starter',
    icon: <RocketOutlined style={{ fontSize: 28, color: '#A78BFA' }} />,
    description: 'Everything you need to jumpstart your career search.',
    price: '$0',
    period: 'for 30 days',
    priceNote: 'No credit card required',
    features: [
      'Access to basic career roadmap',
      'Standard resume templates',
      'Community job board access',
      'Standard AI resume scanner',
    ],
    ctaLabel: 'Start Free Trial',
    ctaType: 'default',
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#22D3EE' }} />,
    description: 'For ambitious professionals targeting top companies.',
    price: '$29',
    period: '/month',
    priceNote: 'Billed monthly · Cancel anytime',
    features: [
      'Everything in Starter',
      'Advanced AI models for interview prep',
      'Tailored company-specific roadmaps',
      'Priority application reviews',
      '1-on-1 mock interviews (1/month)',
    ],
    ctaLabel: 'Upgrade to Pro',
    ctaType: 'primary',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Elite',
    icon: <CrownOutlined style={{ fontSize: 28, color: '#F59E0B' }} />,
    description: 'Ultimate career transformation with the best AI models.',
    price: '$99',
    period: '/month',
    priceNote: 'Billed monthly · Cancel anytime',
    features: [
      'Everything in Pro',
      'Premium state-of-the-art AI reasoning models',
      'Unlimited mock interviews',
      'Direct referrals to partner networks',
      'Dedicated career coach',
    ],
    ctaLabel: 'Get Elite',
    ctaType: 'default',
    featured: false,
  },
];

export function LandingPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = async (plan: Plan) => {
    if (!isSignedIn) {
      navigate('/sign-up');
      return;
    }

    if (plan.id === 'free-trial') {
      try {
        const res = await fetch(`${config.apiUrl}/api/subscription/start-trial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) navigate('/dashboard');
        else console.error('Failed to start trial:', res.statusText);
      } catch (err) {
        console.error('Trial start error:', err);
      }
    }
  };

  return (
    <Layout className="landing">
      <div className="landing__hero-glow" />
      <div className="landing__hero-glow-secondary" />

      <Header className="landing__nav">
        <div className="landing__logo" onClick={() => navigate('/')}>Work@X</div>
        <Space size="middle">
          {isSignedIn ? (
            <Button type="primary" onClick={() => navigate('/dashboard')}>Dashboard</Button>
          ) : (
            <>
              <Button type="text" onClick={() => navigate('/sign-in')} style={{ color: 'var(--text-secondary)' }}>Sign In</Button>
              <Button type="primary" onClick={() => navigate('/sign-up')}>Get Started</Button>
            </>
          )}
        </Space>
      </Header>

      <Content>
        <section className="landing__hero">
          <Badge
            color="#8B5CF6"
            text={<span style={{ color: '#A78BFA', fontWeight: 500, marginLeft: 8 }}>Now with Advanced AI Models</span>}
            className="landing__badge"
            style={{ marginBottom: 24, padding: '6px 16px', background: 'rgba(139,92,246,0.1)', borderRadius: 20, border: '1px solid rgba(139,92,246,0.25)' }}
          />
          <Title level={1} className="landing__title">
            Update Your Career. Land a Job at <span className="landing__title-gradient">Top Companies.</span>
          </Title>
          <Paragraph className="landing__subtitle" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>
            Work@X gives you the tools, roadmaps, and the most advanced AI models
            to help you get hired at Company X, Y, Z and beyond.
          </Paragraph>
          <Space size="large" style={{ marginTop: 24 }}>
            <Button type="primary" size="large" onClick={() => navigate(isSignedIn ? '/dashboard' : '/sign-up')}>
              Start Your Journey
            </Button>
            <Button size="large" type="default" style={{ background: 'transparent', color: 'white' }}>
              View Career Paths
            </Button>
          </Space>
        </section>

        <section className="pricing">
          <div className="pricing__header" style={{ textAlign: 'center', marginBottom: 60 }}>
            <Text style={{ color: 'var(--color-primary-400)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
              Pricing & Plans
            </Text>
            <Title level={2} style={{ marginTop: 12 }}>Unlock Your Potential</Title>
            <Paragraph style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
              Start free and upgrade when you're ready for our advanced AI models.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]} justify="center">
            {PLANS.map((plan) => (
              <Col xs={24} md={8} key={plan.id} style={{ display: 'flex' }}>
                <Card
                  hoverable
                  className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`}
                  style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
                  bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 24px' }}
                >
                  {plan.featured && <div className="pricing-card__popular-badge">Most Popular</div>}
                  <div style={{ marginBottom: 20 }}>{plan.icon}</div>
                  <Title level={4} style={{ margin: 0 }}>{plan.name}</Title>
                  <Paragraph style={{ color: 'var(--text-tertiary)', minHeight: 44, marginTop: 8 }}>
                    {plan.description}
                  </Paragraph>

                  <div style={{ margin: '24px 0' }}>
                    <span style={{ fontSize: 42, fontWeight: 800 }}>{plan.price}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{plan.period}</span>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{plan.priceNote}</div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>What's included</Text>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
                          <CheckCircleFilled style={{ color: 'var(--color-success)', marginTop: 4, marginRight: 10 }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button type={plan.ctaType} size="large" block style={{ marginTop: 24 }} onClick={() => handleSelectPlan(plan)}>
                    {plan.ctaLabel}
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      </Content>

      <Footer style={{ textAlign: 'center', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
        Work@X ©{new Date().getFullYear()} Created to upgrade your career.
      </Footer>
    </Layout>
  );
}
