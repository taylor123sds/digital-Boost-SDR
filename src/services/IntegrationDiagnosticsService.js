/**
 * @file IntegrationDiagnosticsService.js
 * @description Connectivity and schema diagnostics for integrations
 */

import axios from 'axios';
import { defaultLogger } from '../utils/logger.enhanced.js';

const logger = defaultLogger.child({ module: 'IntegrationDiagnostics' });

const DEFAULT_PROBE_PATHS = ['/health', '/status', '/api/health', '/api/status'];

function buildAuthHeaders(auth = {}) {
  if (!auth || typeof auth !== 'object') return {};

  if (auth.type === 'api_key') {
    const header = auth.header || 'X-API-KEY';
    if (!auth.value) return {};
    return { [header]: auth.value };
  }

  if (auth.type === 'bearer') {
    if (!auth.token) return {};
    return { Authorization: `Bearer ${auth.token}` };
  }

  if (auth.type === 'basic') {
    if (!auth.username || !auth.password) return {};
    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  return {};
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function extractJsonKeys(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload)) {
    const first = payload[0];
    if (first && typeof first === 'object') {
      return Object.keys(first);
    }
    return [];
  }
  return Object.keys(payload);
}

function suggestMapping(keys) {
  const lower = keys.map(key => key.toLowerCase());
  const findKey = (candidates) => {
    const hit = lower.find(key => candidates.some(candidate => key.includes(candidate)));
    return hit ? keys[lower.indexOf(hit)] : null;
  };

  return {
    employeeName: findKey(['name', 'full_name', 'employee']),
    periodStart: findKey(['start', 'inicio', 'from', 'data_inicio']),
    periodEnd: findKey(['end', 'fim', 'to', 'data_fim']),
    issuer: findKey(['issuer', 'doctor', 'medico', 'crm']),
    cid: findKey(['cid']),
    crm: findKey(['crm'])
  };
}

async function probeEndpoint(baseUrl, path, headers) {
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      headers,
      timeout: 8000,
      validateStatus: status => status >= 200 && status < 500
    });

    const latencyMs = Date.now() - startTime;
    const contentType = response.headers?.['content-type'] || '';
    const data = response.data;
    const keys = contentType.includes('json') ? extractJsonKeys(data) : [];

    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      latencyMs,
      url,
      contentType,
      sampleKeys: keys,
      suggestedMapping: keys.length ? suggestMapping(keys) : {}
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startTime,
      url,
      error: error.message
    };
  }
}

export async function diagnoseIntegration(integration) {
  if (!integration?.baseUrl) {
    return {
      ok: false,
      error: 'baseUrl obrigatorio para diagnostico.'
    };
  }

  const headers = buildAuthHeaders(integration.auth);
  const probePaths = (integration.probePaths && integration.probePaths.length)
    ? integration.probePaths
    : DEFAULT_PROBE_PATHS;

  logger.info('Iniciando diagnostico de integracao', {
    provider: integration.provider,
    baseUrl: integration.baseUrl,
    probeCount: probePaths.length
  });

  const results = [];
  for (const path of probePaths) {
    const result = await probeEndpoint(integration.baseUrl, path, headers);
    results.push(result);
    if (result.ok) {
      return {
        ok: true,
        baseUrl: integration.baseUrl,
        provider: integration.provider || '',
        authType: integration.auth?.type || '',
        result,
        probes: results
      };
    }
  }

  return {
    ok: false,
    baseUrl: integration.baseUrl,
    provider: integration.provider || '',
    authType: integration.auth?.type || '',
    probes: results
  };
}
