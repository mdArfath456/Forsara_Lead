// backend/src/services/leadProviders/exploriumClient.js

import axios from 'axios';
import { env } from '../../config/env.js';

const EXPLORIUM_BASE_URL =
  'https://api.explorium.ai/v1';

export async function exploriumRequest({
  method = 'POST',
  url,
  data,
  timeout = 30000,
}) {
  if (!env.exploriumApiKey) {
    throw new Error(
      'EXPLORIUM_API_KEY is missing'
    );
  }

  try {
    const response = await axios({
      method,
      baseURL: EXPLORIUM_BASE_URL,
      url,
      data,
      timeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        api_key: env.exploriumApiKey,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      '[Explorium]',
      error.response?.status,
      error.response?.data || error.message
    );

    throw error;
  }
}

export async function checkExploriumHealth() {
  const startedAt = Date.now();
  try {
    const response = await axios({
      method: 'GET',
      baseURL: EXPLORIUM_BASE_URL,
      url: '/health',
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        api_key: env.exploriumApiKey,
      },
    });
    return {
      configured: true,
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      message: 'Explorium API key is valid and accepted.',
    };
  } catch (error) {
    return {
      configured: Boolean(env.exploriumApiKey),
      ok: false,
      status: error.response?.status || 502,
      latencyMs: Date.now() - startedAt,
      code: error.response?.status ? `EXPLORIUM_${error.response.status}` : 'EXPLORIUM_NETWORK',
      message: error.response?.data?.message || error.message || 'Could not reach Explorium API.',
    };
  }
}