import axios from 'axios';
import { env } from '../../config/env.js';

export const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';

export class ApolloApiError extends Error {
  constructor(message, { status, code, endpoint } = {}) {
    super(message);
    this.name = 'ApolloApiError';
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
    this.isApolloApiError = true;
  }
}

export function requireApolloKey() {
  if (!env.apolloApiKey) {
    throw new ApolloApiError('Apollo API key is not configured. Set APOLLO_API_KEY in backend/.env.', {
      status: 503,
      code: 'APOLLO_NOT_CONFIGURED',
    });
  }
  return env.apolloApiKey;
}

function messageForStatus(status) {
  if (status === 401) return 'Apollo API key is invalid or revoked. Create a new API key and update APOLLO_API_KEY.';
  if (status === 403) return 'Apollo rejected this request because the API key scope or Apollo plan does not allow this endpoint.';
  if (status === 422) return 'Apollo rejected the request because required company/person matching data is missing or invalid.';
  if (status === 429) return 'Apollo rate limit was reached. Please retry later.';
  return 'Apollo API request failed.';
}

export async function apolloRequest(config) {
  const key = requireApolloKey();
  const endpoint = config.url || '';

  try {
    return await axios({
      ...config,
      baseURL: config.baseURL || APOLLO_BASE_URL,
      headers: {
        accept: 'application/json',
        ...(config.data ? { 'content-type': 'application/json' } : {}),
        ...(config.headers || {}),
        'x-api-key': key,
      },
      timeout: config.timeout ?? 20000,
    });
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = error.response?.data?.error;
    throw new ApolloApiError(
      status ? `${messageForStatus(status)}${providerMessage && status !== 401 ? ` ${providerMessage}` : ''}` : 'Could not reach Apollo API.',
      { status: status || 502, code: `APOLLO_${status || 'NETWORK'}`, endpoint }
    );
  }
}

export async function checkApolloHealth() {
  const startedAt = Date.now();
  try {
    const response = await apolloRequest({ method: 'get', url: '/auth/health', timeout: 10000 });
    return {
      configured: true,
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      message: 'Apollo API key is valid and accepted.',
    };
  } catch (error) {
    return {
      configured: Boolean(env.apolloApiKey),
      ok: false,
      status: error.status || 502,
      latencyMs: Date.now() - startedAt,
      code: error.code,
      message: error.message,
    };
  }
}
