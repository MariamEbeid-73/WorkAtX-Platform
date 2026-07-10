declare global {
  interface Window {
    _env_?: Record<string, string>;
  }
}

const getEnvVar = (key: string, defaultValue = ''): string => {
  return window._env_?.[key] || import.meta.env[key] || defaultValue;
};

export const config = {
  apiUrl: getEnvVar('VITE_API_URL', 'http://localhost:5000'),
  clerkPublishableKey: getEnvVar('VITE_CLERK_PUBLISHABLE_KEY', ''),
};
