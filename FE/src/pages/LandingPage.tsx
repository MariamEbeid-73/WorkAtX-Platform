import { useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Badge } from 'antd';
import { FileSearchOutlined, AimOutlined, CodeOutlined } from '@ant-design/icons';
import './LandingPage.css';
import { CustomPricingTable } from '../components/billing/CustomPricingTable';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;




export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  // If already signed in, go directly to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);



  // If we are redirecting, return null to avoid flash of content
  if (!isLoaded || isSignedIn) {
    return null;
  }

  return (
    <Layout className="landing">
     
      
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

                  <CustomPricingTable />
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
