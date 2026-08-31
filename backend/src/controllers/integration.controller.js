import { env } from '../config/env.js';
import { checkApolloHealth } from '../services/leadProviders/apolloClient.js';

export async function getApolloStatus(req, res) {
  const health = await checkApolloHealth();
  res.status(200).json({
    provider: 'apollo',
    configured: health.configured,
    ok: health.ok,
    status: health.status,
    latencyMs: health.latencyMs,
    code: health.code,
    message: health.message,
    authenticationMode: env.apolloApiKey ? 'api_key' : 'not_configured',
  });
}

