import { env } from '../config/env.js';
import { checkApolloHealth } from '../services/leadProviders/apolloClient.js';
import { checkExploriumHealth } from '../services/leadProviders/exploriumClient.js';

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

export async function getExploriumStatus(req, res) {
  const health = await checkExploriumHealth();
  res.status(200).json({
    provider: 'explorium',
    configured: health.configured,
    ok: health.ok,
    status: health.status,
    latencyMs: health.latencyMs,
    code: health.code,
    message: health.message,
    authenticationMode: env.exploriumApiKey ? 'api_key' : 'not_configured',
  });
}
