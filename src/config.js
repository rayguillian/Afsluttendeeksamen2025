const config = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: 'gpt-4',
    temperature: 0.7,
  },
  cache: {
    expiration: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Validate required environment variables
const requiredEnvVars = {
  'VITE_OPENAI_API_KEY': config.openai.apiKey,
};

Object.entries(requiredEnvVars).forEach(([name, value]) => {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
  }
});

export default config;
