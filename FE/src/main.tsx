import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { colors, typography, radius } from './theme';
import './index.css';
import App from './App';

import { config } from './config';

/**
 * Clerk Publishable Key — loaded from runtime config (env.sh injected).
 */
const CLERK_PUBLISHABLE_KEY = config.clerkPublishableKey;

if (!CLERK_PUBLISHABLE_KEY) {
  console.error(
    '[WorkX] Missing VITE_CLERK_PUBLISHABLE_KEY.\n' +
    'Create a Clerk app at https://clerk.com and add the key to .env.development'
  );
}

// ─── Ant Design Premium Dark Theme Integration ───────────
const customAntdTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: colors.primary[500],
    colorBgBase: colors.bg.base,
    colorBgContainer: colors.bg.surface,
    colorBgElevated: colors.bg.elevated,
    colorTextBase: colors.text.primary,
    fontFamily: typography.fontFamily.sans,
    borderRadius: parseInt(radius.md), // Map string '10px' to number 10
    colorBorderSecondary: colors.border.default,
  },
  components: {
    Button: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      borderRadius: parseInt(radius.lg),
      colorPrimary: colors.primary[500],
      colorPrimaryHover: colors.primary[400],
      colorPrimaryActive: colors.primary[600],
    },
    Card: {
      colorBgContainer: colors.bg.surface,
      borderRadiusLG: parseInt(radius['2xl']),
      colorBorderSecondary: colors.border.default,
    },
    Layout: {
      headerBg: 'transparent',
      bodyBg: 'transparent',
      footerBg: 'transparent',
    }
  }
};

import { clerkAppearance } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={customAntdTheme}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY || ''} appearance={clerkAppearance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </ConfigProvider>
  </StrictMode>,
);
