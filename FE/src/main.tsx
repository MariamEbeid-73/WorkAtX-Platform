import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { ConfigProvider } from 'antd';
import { clerkAppearance } from './theme';
import { workXTheme } from './theme/antdTheme';
import './index.css';
import App from './App';
import { config } from './config';

const CLERK_PUBLISHABLE_KEY = config.clerkPublishableKey;

if (!CLERK_PUBLISHABLE_KEY) {
  console.error('[WorkX] Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to .env.development');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={workXTheme}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY || ''} appearance={clerkAppearance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </ConfigProvider>
  </StrictMode>,
);
