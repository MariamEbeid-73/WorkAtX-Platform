import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Badge } from 'antd';
import { 
  CheckCircleFilled, RocketOutlined, ThunderboltOutlined, CrownOutlined,
  FileSearchOutlined, AimOutlined, CodeOutlined
} from '@ant-design/icons';
import { ComingSoonModal } from '../components/ComingSoonModal';
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
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [comingSoonPlan, setComingSoonPlan] = useState<string | null>(null);

  // If already signed in, go directly to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.id === 'pro' || plan.id === 'enterprise') {
      setComingSoonPlan(plan.name);
      return;
    }

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

  // If we are redirecting, return null to avoid flash of content
  if (!isLoaded || isSignedIn) {
    return null;
  }

  return (
    <Layout className="landing">
      <ComingSoonModal 
        open={!!comingSoonPlan} 
        onClose={() => setComingSoonPlan(null)} 
        planName={comingSoonPlan || ''} 
      />
      
      <div className="landing__hero-glow" />
      <div className="landing__hero-glow-secondary" />

      <Header className="landing__nav">
        <div className="landing__logo" onClick={() => navigate('/')}>Work@X</div>
        <div className="landing__nav-actions">
          <Button type="primary" onClick={() => navigate('/sign-up')}>
            Get Started
          </Button>
        </div>
      </Header>

      <Content>
        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section className="landing__hero">
          <Badge
            color="#8B5CF6"
            text={<span style={{ color: '#A78BFA', fontWeight: 500, marginLeft: 8 }}>AI-Powered Career Growth</span>}
            className="landing__badge"
          />
          <Title level={1} className="landing__title">
            Analyze. Prepare. <span className="landing__title-gradient">Get Hired.</span>
          </Title>
          <Paragraph className="landing__subtitle">
            Work@X analyzes your resume and GitHub, generates tailored study plans, and provides actionable career insights to help you land your dream job at top tech companies.
          </Paragraph>
        </section>

        {/* ── Features Section ────────────────────────────────────────── */}
        <section className="features">
          <div className="features__header">
            <Text style={{ color: 'var(--color-primary-400)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
              How It Works
            </Text>
            <Title level={2} style={{ marginTop: 12 }}>Your Path to Top Tech</Title>
          </div>
          
          <div className="features__grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ color: '#A78BFA' }}>
                <FileSearchOutlined />
              </div>
              <div className="feature-title">AI Profile Analysis</div>
              <div className="feature-desc">
                Upload your CV and connect your GitHub. Our advanced AI scans your experience, repositories, and skills to calculate your objective Developer Score.
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ color: '#22D3EE' }}>
                <AimOutlined />
              </div>
              <div className="feature-title">Tailored Roadmaps</div>
              <div className="feature-desc">
                Select your target companies like Google, Meta, or Amazon. We generate week-by-week study plans that specifically address your skill gaps.
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ color: '#F59E0B' }}>
                <CodeOutlined />
              </div>
              <div className="feature-title">Geni AI Assistant</div>
              <div className="feature-desc">
                Practice mock interviews, ask technical questions, and get instant, actionable feedback from your dedicated AI career coach.
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Section ─────────────────────────────────────────── */}
        <section className="pricing">
          <div className="pricing__header">
            <Text style={{ color: 'var(--color-primary-400)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
              Pricing & Plans
            </Text>
            <Title level={2} style={{ marginTop: 12 }}>Unlock Your Potential</Title>
            <Paragraph style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
              Start for free. Upgrade when you're ready for our advanced AI models.
            </Paragraph>
          </div>

          <div className="pricing__grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`}>
                {plan.featured && <div className="pricing-card__popular-badge">Most Popular</div>}
                
                <div className="pricing-card__icon">{plan.icon}</div>
                <div className="pricing-card__name">{plan.name}</div>
                <div className="pricing-card__description">{plan.description}</div>

                <div style={{ margin: '24px 0' }}>
                  <div className="pricing-card__price-row">
                    <span className="pricing-card__price">{plan.price}</span>
                    <span className="pricing-card__period">{plan.period}</span>
                  </div>
                  <div className="pricing-card__price-note">{plan.priceNote}</div>
                </div>

                <div className="pricing-card__features-title">What's included</div>
                <ul className="pricing-card__features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="pricing-card__feature">
                      <div className="pricing-card__feature-icon"><CheckCircleFilled /></div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="pricing-card__cta">
                  <Button 
                    type={plan.ctaType} 
                    size="large" 
                    block 
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.ctaLabel}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Content>

      <Footer className="landing__footer">
        <div className="landing__footer-text">
          Work@X ©{new Date().getFullYear()} — AI-Powered Career Growth
        </div>
      </Footer>
    </Layout>
  );
}
