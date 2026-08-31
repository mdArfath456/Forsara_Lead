import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dotenvResult = dotenv.config({ path: resolve(__dirname, '../../.env'), quiet: true });
const localEnv = dotenvResult.parsed || {};

function envValue(name) {
  return localEnv[name] ?? process.env[name];
}

function required(name) {
  const value = envValue(name);
  if (!value) {
    // Fail fast at boot rather than deep inside a provider call
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: envValue('NODE_ENV') || 'development',
  port: Number(envValue('PORT') || 5000),

  mongoUri: required('MONGO_URI'),
  redisUrl: envValue('REDIS_URL') || 'redis://localhost:6379',

  sessionSecret: required('SESSION_SECRET'),

  googlePlacesApiKey: envValue('GOOGLE_PLACES_API_KEY') || '', // optional: free OSM/Foursquare are default
  foursquareApiKey: envValue('FOURSQUARE_API_KEY') || '',
  apolloApiKey: envValue('APOLLO_API_KEY') || '',
  exploriumApiKey: envValue('EXPLORIUM_API_KEY') || '', // fallback POC provider if Apollo finds nothing
  maxContactsPerCompany: Number(envValue('MAX_CONTACTS_PER_COMPANY') || 5),

  corsOrigin: envValue('CORS_ORIGIN') || 'http://localhost:5173',
};
