import axios from 'axios';
import { env } from '../../config/env.js';

export const EXPLORIUM_BASE_URL = 'https://api.explorium.ai/v1';

export class ExploriumApiError extends Error {
    constructor(message, { status, code, endpoint } = {}) {
        super(message);
        this.name = 'ExploriumApiError';
        this.status = status;
        this.code = code;
        this.endpoint = endpoint;
        this.isExploriumApiError = true;
    }
}

export function requireExploriumKey() {
    if (!env.exploriumApiKey) {
        throw new ExploriumApiError('Explorium API key is not configured. Set EXPLORIUM_API_KEY in backend/.env.', {
            status: 503,
            code: 'EXPLORIUM_NOT_CONFIGURED',
        });
    }
    return env.exploriumApiKey;
}

function messageForStatus(status) {
    if (status === 401) return 'Explorium API key is invalid or revoked.';
    if (status === 402) return 'Explorium credit balance is exhausted for this workspace.';
    if (status === 403) return 'Explorium rejected this request because the API key does not allow this endpoint.';
    if (status === 422) return 'Explorium rejected the request because required fields are missing or invalid.';
    if (status === 429) return 'Explorium rate limit was reached. Please retry later.';
    return 'Explorium API request failed.';
}

export async function exploriumRequest(config) {
    const key = requireExploriumKey();
    const endpoint = config.url || '';

    try {
        return await axios({
            ...config,
            baseURL: config.baseURL || EXPLORIUM_BASE_URL,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                ...(config.headers || {}),
                api_key: key,
            },
            timeout: config.timeout ?? 20000,
        });
    } catch (error) {
        const status = error.response?.status;
        const providerMessage = error.response?.data?.detail || error.response?.data?.message;
        throw new ExploriumApiError(
            status ? `${messageForStatus(status)}${providerMessage ? ` ${JSON.stringify(providerMessage)}` : ''}` : 'Could not reach Explorium API.',
            { status: status || 502, code: `EXPLORIUM_${status || 'NETWORK'}`, endpoint }
        );
    }
}