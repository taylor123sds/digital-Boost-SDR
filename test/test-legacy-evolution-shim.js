import assert from 'assert';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

async function getFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const mod = await import('node-fetch');
  return mod.default;
}

async function startServer(router) {
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err?.message || 'server_error' });
  });

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function makeToken() {
  return jwt.sign({
    userId: 'user_test',
    email: 'test@example.com',
    role: 'admin',
    tenantId: 'tenant_test'
  }, process.env.JWT_SECRET);
}

async function testLegacyShimBeforeCutoff() {
  process.env.NODE_ENV = 'test';
  process.env.LEGACY_EVOLUTION_ROUTES = 'true';
  process.env.LEGACY_EVOLUTION_CUTOFF_AT = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { default: agentsRouter } = await import(`../src/api/routes/agents.routes.js?shim=${Date.now()}`);
  const { default: channelsRouter } = await import('../src/api/routes/channels.routes.js');

  const testRouter = express.Router();
  testRouter.post('/api/agents/:agentId/channels/evolution/connect', (req, res) => {
    res.json({
      ok: true,
      agentId: req.params.agentId,
      instanceName: req.body?.instanceName || null,
      query: req.query || {}
    });
  });

  channelsRouter.handle = testRouter.handle.bind(testRouter);

  const { server, port } = await startServer(agentsRouter);
  const token = makeToken();
  const doFetch = await getFetch();

  const response = await doFetch(`http://127.0.0.1:${port}/api/agents/agent_1/evolution/create?foo=bar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ instanceName: 'test-instance' })
  });
  const data = await response.json();

  server.close();

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(data, {
    ok: true,
    agentId: 'agent_1',
    instanceName: 'test-instance',
    query: { foo: 'bar' }
  });
}

async function testLegacyShimRequiresAuth() {
  process.env.NODE_ENV = 'test';
  process.env.LEGACY_EVOLUTION_ROUTES = 'true';
  process.env.LEGACY_EVOLUTION_CUTOFF_AT = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { default: agentsRouter } = await import(`../src/api/routes/agents.routes.js?auth=${Date.now()}`);
  const { server, port } = await startServer(agentsRouter);
  const doFetch = await getFetch();

  const response = await doFetch(`http://127.0.0.1:${port}/api/agents/agent_1/evolution/status`);
  const data = await response.json();

  server.close();

  assert.strictEqual(response.status, 401);
  assert.strictEqual(data?.success, false);
}

async function testLegacyShimAfterCutoff() {
  process.env.NODE_ENV = 'test';
  process.env.LEGACY_EVOLUTION_ROUTES = 'true';
  process.env.LEGACY_EVOLUTION_CUTOFF_AT = new Date(Date.now() - 60 * 1000).toISOString();

  const { default: agentsRouter } = await import(`../src/api/routes/agents.routes.js?cutoff=${Date.now()}`);
  const { server, port } = await startServer(agentsRouter);
  const doFetch = await getFetch();
  const token = makeToken();

  const response = await doFetch(`http://127.0.0.1:${port}/api/agents/agent_1/evolution/status`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();

  server.close();

  assert.strictEqual(response.status, 410);
  assert.strictEqual(data?.error, 'LEGACY_EVOLUTION_ROUTE_EXPIRED');
}

async function run() {
  const tests = [
    testLegacyShimBeforeCutoff,
    testLegacyShimRequiresAuth,
    testLegacyShimAfterCutoff
  ];

  for (const testFn of tests) {
    await testFn();
    process.stdout.write(`ok - ${testFn.name}\n`);
  }
}

run().catch((error) => {
  console.error('legacy evolution shim tests failed:', error);
  process.exit(1);
});
