import { useNavigate } from 'react-router-dom';
import { Show } from '@clerk/react';
import { usePlans, CheckoutButton } from '@clerk/react/experimental';
import { Button, Spin } from 'antd';
import {
  CheckCircleFilled, RocketOutlined, ThunderboltOutlined, CrownOutlined,
} from '@ant-design/icons';
import '../../pages/LandingPage.css';
import { clerkAppearance } from '../../theme';

const checkoutAppearance = {
    ...clerkAppearance,
    variables: {
        ...clerkAppearance.variables,
        colorText: '#FFFFFF',
        colorTextSecondary: '#F1F5F9',
        colorBackground: '#12141C',
    },
    elements: {
        ...clerkAppearance.elements,
    },
};
const PLAN_PRESENTATION: Record<string, { icon: React.ReactNode; featured: boolean }> = {
    free_user: { icon: <RocketOutlined style={{ fontSize: 28, color: '#A78BFA' }} />, featured: false },
    pro: { icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#22D3EE' }} />, featured: true },
    elite: { icon: <CrownOutlined style={{ fontSize: 28, color: '#F59E0B' }} />, featured: false },
};
export function CustomPricingTable() {
  const navigate = useNavigate();
  const { data: plans, isLoading, isError } = usePlans({ for: 'user' });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !plans) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
        Couldn't load pricing right now. Please try again shortly.
      </div>
    );
  }

  return (
    <div className="pricing__grid">
      {plans
        .filter((plan) => plan.publiclyVisible)
        .map((plan) => {
          const presentation = PLAN_PRESENTATION[plan.slug] ?? { icon: null, featured: false };
          const isFreePlan = !plan.hasBaseFee;

          return (
            <div
              key={plan.id}
              className={`pricing-card ${presentation.featured ? 'pricing-card--featured' : ''}`}
            >
              {presentation.featured && (
                <div className="pricing-card__popular-badge">Most Popular</div>
              )}

              <div className="pricing-card__icon">{presentation.icon}</div>
              <div className="pricing-card__name">{plan.name}</div>
              <div className="pricing-card__description">{plan.description}</div>

              <div style={{ margin: '24px 0' }}>
                <div className="pricing-card__price-row">
                  <span className="pricing-card__price">
                    {isFreePlan ? '$0' : `${plan.fee?.currencySymbol ?? '$'}${plan.fee?.amountFormatted}`}
                  </span>
                  <span className="pricing-card__period">{isFreePlan ? '' : '/month'}</span>
                </div>
                <div className="pricing-card__price-note">
                  {isFreePlan ? 'Always free' : 'Billed monthly · Cancel anytime'}
                </div>
              </div>

              <div className="pricing-card__features-title">What's included</div>
              <ul className="pricing-card__features">
                {plan.features.map((feature) => (
                  <li key={feature.id} className="pricing-card__feature">
                    <div className="pricing-card__feature-icon"><CheckCircleFilled /></div>
                    <span>{feature.name}</span>
                  </li>
                ))}
              </ul>

              <div className="pricing-card__cta">
                {isFreePlan ? (
                  <Button type="default" size="large" block onClick={() => navigate('/dashboard')}>
                    Continue Free
                  </Button>
                ) : (
                  <Show when="signed-in" fallback={
                    <Button type={presentation.featured ? 'primary' : 'default'} size="large" block onClick={() => navigate('/sign-up')}>
                      Sign up to subscribe
                    </Button>
                  }>
                <CheckoutButton
                    planId={plan.id}
                    planPeriod="month"
                    for="user"
                    newSubscriptionRedirectUrl="/dashboard"
                    checkoutProps={{ appearance: checkoutAppearance }}
                >
                      <Button type={presentation.featured ? 'primary' : 'default'} size="large" block>
                        {plan.slug === 'elite' ? 'Get Elite' : `Upgrade to ${plan.name}`}
                      </Button>
                    </CheckoutButton>
                  </Show>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
