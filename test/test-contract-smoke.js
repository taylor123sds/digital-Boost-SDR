const DEFAULT_BASE_URL = 'http://localhost:3001/api';

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return DEFAULT_BASE_URL;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function requestJson(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data, url };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const baseUrl = normalizeBaseUrl(getEnv('CONTRACT_BASE_URL', DEFAULT_BASE_URL));
  const email = requireEnv('CONTRACT_EMAIL');
  const password = requireEnv('CONTRACT_PASSWORD');
  const agentIdOverride = process.env.CONTRACT_AGENT_ID || null;

  const failures = [];

  const loginResult = await requestJson(baseUrl, '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginResult.response.ok) {
    failures.push({
      step: 'auth.login',
      status: loginResult.response.status,
      url: loginResult.url,
      body: loginResult.data
    });
  }

  const token = loginResult.data?.data?.accessToken;
  if (!token) {
    failures.push({ step: 'auth.token', error: 'Missing accessToken in response' });
  }

  const authHeaders = token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };

  const essentialChecks = [
    { key: 'auth.me', method: 'GET', path: '/auth/me', expect: [200] },
    { key: 'agents.list', method: 'GET', path: '/agents', expect: [200] },
    { key: 'integrations.list', method: 'GET', path: '/integrations', expect: [200] },
    { key: 'command-center.overview', method: 'GET', path: '/command-center/overview', expect: [200] },
    { key: 'command-center.activity-feed', method: 'GET', path: '/command-center/activity-feed', expect: [200] },
    { key: 'funil.stats', method: 'GET', path: '/funil/stats', expect: [200] },
    { key: 'funil.bant', method: 'GET', path: '/funil/bant', expect: [200] },
    { key: 'forecasting.velocity', method: 'GET', path: '/forecasting/velocity', expect: [200] },
    { key: 'forecasting.monthly', method: 'GET', path: '/forecasting/monthly', expect: [200] },
    { key: 'cadences.list', method: 'GET', path: '/cadences', expect: [200] },
    { key: 'cadences.stats', method: 'GET', path: '/cadences/stats', expect: [200] },
    { key: 'prospecting.stats', method: 'GET', path: '/prospecting/stats', expect: [200] },
    { key: 'prospecting.leads', method: 'GET', path: '/prospecting/leads', expect: [200] },
    { key: 'campaigns.list', method: 'GET', path: '/campaigns', expect: [200] }
  ];

  for (const check of essentialChecks) {
    const result = await requestJson(baseUrl, check.path, {
      method: check.method,
      headers: authHeaders
    });
    if (!check.expect.includes(result.response.status)) {
      failures.push({
        step: check.key,
        status: result.response.status,
        url: result.url,
        body: result.data
      });
    }
  }

  const agentsResponse = await requestJson(baseUrl, '/agents', {
    method: 'GET',
    headers: authHeaders
  });
  const firstAgentId = agentIdOverride
    || agentsResponse.data?.data?.[0]?.id
    || agentsResponse.data?.[0]?.id
    || null;

  if (firstAgentId) {
    const evoStatus = await requestJson(
      baseUrl,
      `/agents/${firstAgentId}/channels/evolution/status`,
      { method: 'GET', headers: authHeaders }
    );
    if (![200].includes(evoStatus.response.status)) {
      failures.push({
        step: 'evolution.status',
        status: evoStatus.response.status,
        url: evoStatus.url,
        body: evoStatus.data
      });
    }
  } else {
    failures.push({ step: 'evolution.status', error: 'No agent id available' });
  }

  const campaignCreate = await requestJson(baseUrl, '/campaigns', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: `Contract Smoke ${Date.now()}` })
  });
  if (![200, 201].includes(campaignCreate.response.status)) {
    failures.push({
      step: 'campaigns.create',
      status: campaignCreate.response.status,
      url: campaignCreate.url,
      body: campaignCreate.data
    });
  }

  const campaignId = campaignCreate.data?.id;
  if (campaignId) {
    const campaignGet = await requestJson(baseUrl, `/campaigns/${campaignId}`, {
      method: 'GET',
      headers: authHeaders
    });
    if (![200].includes(campaignGet.response.status)) {
      failures.push({
        step: 'campaigns.get',
        status: campaignGet.response.status,
        url: campaignGet.url,
        body: campaignGet.data
      });
    }
  }

  const whatsappSend = await requestJson(baseUrl, '/whatsapp/send', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ to: '000', message: '' })
  });
  if (![400, 422].includes(whatsappSend.response.status)) {
    failures.push({
      step: 'whatsapp.send',
      status: whatsappSend.response.status,
      url: whatsappSend.url,
      body: whatsappSend.data
    });
  }

  if (failures.length) {
    console.error('Contract smoke test failed:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Contract smoke test passed.');
}

main().catch((error) => {
  console.error('Contract smoke test crashed:', error.message);
  process.exit(1);
});
