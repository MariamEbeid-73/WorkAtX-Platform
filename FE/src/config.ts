declare global {
  interface Window {
    _env_?: Record<string, string>;
  }
}

const getEnvVar = (key: string, defaultValue = ''): string => {
  return window._env_?.[key] || import.meta.env[key] || defaultValue;
};

const apiUrl = getEnvVar('VITE_API_URL', import.meta.env.DEV ? 'http://localhost:5000' : '');

if (!apiUrl) {
  throw new Error('VITE_API_URL is required outside local development.');
}

export const config = {
  apiUrl,
  clerkPublishableKey: getEnvVar('VITE_CLERK_PUBLISHABLE_KEY', ''),
};
