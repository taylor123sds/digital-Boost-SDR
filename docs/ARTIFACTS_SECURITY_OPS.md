# Security Ops Map

| FILE | LINE | SNIPPET |
|---|---:|---|
| src/config/index.js | 24 | JWT_SECRET: 'JWT secret is required for authentication' |
| src/middleware/auth.middleware.js | 9 | const JWT_SECRET = process.env.JWT_SECRET; |
| src/middleware/auth.middleware.js | 11 | if (!JWT_SECRET) { |
| src/middleware/auth.middleware.js | 12 | throw new Error('JWT_SECRET not configured. Set environment variable before starting the server.'); |
| src/middleware/auth.middleware.js | 36 | const decoded = jwt.verify(token, JWT_SECRET); |
| src/middleware/auth.middleware.js | 77 | const decoded = jwt.verify(token, JWT_SECRET); |
| src/services/AuthService.js | 16 | // JWT Configuration - SECURITY: No fallback for JWT_SECRET |
| src/services/AuthService.js | 17 | const JWT_SECRET = process.env.JWT_SECRET; |
| src/services/AuthService.js | 21 | // Validate JWT_SECRET at module load |
| src/services/AuthService.js | 22 | if (!JWT_SECRET) { |
| src/services/AuthService.js | 23 | console.error('  CRITICAL: JWT_SECRET environment variable is not set!'); |
| src/services/AuthService.js | 24 | console.error('   Add JWT_SECRET to your .env file before starting the server.'); |
| src/services/AuthService.js | 27 | throw new Error('JWT_SECRET must be set in production environment'); |
| src/services/AuthService.js | 69 | JWT_SECRET, |
| src/services/AuthService.js | 80 | JWT_SECRET, |
| src/services/AuthService.js | 90 | return jwt.verify(token, JWT_SECRET); |
| src/services/IntegrationOAuthService.js | 16 | const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY \|\| |
| src/services/IntegrationOAuthService.js | 17 | process.env.JWT_SECRET?.substring(0, 32) \|\| |
| src/services/IntegrationOAuthService.js | 181 | config.oauth_tokens_encrypted = encryptedTokens; |
| src/services/IntegrationOAuthService.js | 213 | if (!config.oauth_tokens_encrypted) { |
| src/services/IntegrationOAuthService.js | 218 | const tokens = this.decryptTokens(config.oauth_tokens_encrypted); |
| src/services/IntegrationOAuthService.js | 283 | config.oauth_tokens_encrypted = encryptedTokens; |
| src/services/IntegrationOAuthService.js | 310 | delete config.oauth_tokens_encrypted; |
| src/services/IntegrationService.js | 142 | webhook_secret: webhookSecret |
| src/services/IntegrationService.js | 378 | webhookSecret: configJson.webhook_secret, |
| src/services/IntegrationService.js | 598 | const expectedSecret = configJson.webhook_secret; |
