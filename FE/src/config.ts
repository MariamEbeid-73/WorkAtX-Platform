declare global {
  interface Window {
    _env_?: Record<string, string>;
  }
}

const getEnvVar = (key: string, defaultValue: string = ""): string => {
  // 1. Try to get the variable from the injected runtime config
  if (window._env_ && window._env_[key]) {
    return window._env_[key];
  }
  
  // 2. Fall back to Vite's build-time/local env
  if (import.meta.env[key]) {
    return import.meta.env[key];
  }

  // 3. Use default
  return defaultValue;
};

export const config = {
  apiUrl: getEnvVar("VITE_API_URL", "http://localhost:5000"),
  clerkPublishableKey: getEnvVar("VITE_CLERK_PUBLISHABLE_KEY", ""),
};
