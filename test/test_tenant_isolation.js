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

async function login(baseUrl, email, password) {
  return requestJson(baseUrl, '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

async function register(baseUrl, payload) {
  return requestJson(baseUrl, '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function resolveToken(baseUrl, label) {
  const tokenEnv = getEnv(`TENANT_${label}_TOKEN`, null);
  if (tokenEnv) {
    return tokenEnv;
  }

  const email = getEnv(`TENANT_${label}_EMAIL`, null);
  const password = getEnv(`TENANT_${label}_PASSWORD`, null);
  const autoRegister = getEnv('TENANT_AUTO_REGISTER', 'false') === 'true';

  if (!email || !password) {
    throw new Error(`Missing TENANT_${label}_EMAIL or TENANT_${label}_PASSWORD`);
  }

  let loginResult = await login(baseUrl, email, password);
  if (!loginResult.response.ok && autoRegister) {
    await register(baseUrl, {
      name: `Tenant ${label} Manager`,
      email,
      password,
      company: `Tenant ${label} Co`,
      sector: 'outro'
    });
    loginResult = await login(baseUrl, email, password);
  }

  if (!loginResult.response.ok) {
    throw new Error(`Failed to login tenant ${label}: ${loginResult.response.status}`);
  }

  const token = loginResult.data?.data?.accessToken;
  if (!token) {
    throw new Error(`Missing accessToken for tenant ${label}`);
  }

  return token;
}

async function main() {
  const baseUrl = normalizeBaseUrl(getEnv('CONTRACT_BASE_URL', DEFAULT_BASE_URL));
  const failures = [];

  const tokenA = await resolveToken(baseUrl, 'A');
  const tokenB = await resolveToken(baseUrl, 'B');

  const headersA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` };
  const headersB = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` };

  const agentPayload = {
    name: `Tenant A Agent ${Date.now()}`,
    type: 'sdr',
    status: 'active'
  };

  const createAgent = await requestJson(baseUrl, '/agents', {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify(agentPayload)
  });

  if (![200, 201].includes(createAgent.response.status)) {
    failures.push({
      step: 'agents.create',
      status: createAgent.response.status,
      body: createAgent.data
    });
  }

  const createdAgentId = createAgent.data?.data?.id;
  if (!createdAgentId) {
    failures.push({ step: 'agents.create', error: 'Missing agent id for tenant A' });
  }

  const listA = await requestJson(baseUrl, '/agents', {
    method: 'GET',
    headers: headersA
  });
  if (!listA.response.ok) {
    failures.push({ step: 'agents.list.A', status: listA.response.status });
  }

  const listB = await requestJson(baseUrl, '/agents', {
    method: 'GET',
    headers: headersB
  });
  if (!listB.response.ok) {
    failures.push({ step: 'agents.list.B', status: listB.response.status });
  }

  const agentsA = listA.data?.data || listA.data || [];
  const agentsB = listB.data?.data || listB.data || [];

  if (createdAgentId && !agentsA.some((agent) => agent.id === createdAgentId)) {
    failures.push({ step: 'agents.visible.A', error: 'Tenant A does not see its agent' });
  }

  if (createdAgentId && agentsB.some((agent) => agent.id === createdAgentId)) {
    failures.push({ step: 'agents.visible.B', error: 'Tenant B can see tenant A agent' });
  }

  if (createdAgentId) {
    const getAsB = await requestJson(baseUrl, `/agents/${createdAgentId}`, {
      method: 'GET',
      headers: headersB
    });
    if (getAsB.response.status !== 404) {
      failures.push({
        step: 'agents.cross_read',
        status: getAsB.response.status,
        body: getAsB.data
      });
    }
  }

  if (failures.length) {
    console.error('Tenant isolation test failed:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Tenant isolation test passed.');
}

main().catch((error) => {
  console.error('Tenant isolation test crashed:', error.message);
  process.exit(1);
});
