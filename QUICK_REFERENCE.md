# ORBION Agent - Quick Reference Guide

**Version:** v2.1.0-wave1
**Last Updated:** 2025-11-11

---

## 🚀 Quick Start

### Running the Agent
```bash
# Standard startup
npm start

# Development with auto-reload
npm run dev

# Check status
npm run status

# Kill all instances
npm run kill
```

### Running Tests
```bash
# Wave 1 foundation tests
node test_wave1.js

# All tests
npm test

# Specific test
npm run test:sheets
```

---

## 📝 Common Code Patterns

### Configuration
```javascript
import config from './src/config/index.js';

// Server config
const port = config.server.port;                    // 3001
const timeout = config.server.requestTimeout;       // 30000

// OpenAI config
const model = config.openai.chatModel;              // 'gpt-4o-mini'
const apiKey = config.openai.apiKey;

// Environment checks
if (config.isDevelopment) { /* ... */ }
if (config.isProduction) { /* ... */ }

// Get raw config value
const customValue = config.get('CUSTOM_ENV_VAR', 'default');
const numValue = config.getInt('CUSTOM_NUM', 42);
const boolValue = config.getBool('CUSTOM_BOOL', false);
```

### Logging
```javascript
import { createLogger, defaultLogger } from './src/utils/logger.enhanced.js';

// Create module-specific logger
const logger = createLogger({ module: 'MyModule' });

// Standard logging
logger.info('Operation started', { userId: 123 });
logger.warn('Slow query detected', { duration: 5000 });
logger.error('Operation failed', { error: error.message });

// Domain-specific logging
logger.openai('Chat completion', { model: 'gpt-4', tokens: 150 });
logger.whatsapp('Message sent', { phone: '5511999999999' });
logger.database('Query executed', { table: 'leads', rows: 42 });
logger.lead('Qualification updated', leadId, { stage: 'Budget' });
logger.campaign('Started', campaignId, { leads: 100 });

// Performance timing
const timer = logger.startTimer('Database Query');
// ... do work
const duration = timer.end({ result: 'success' });

// API logging middleware (in routes)
import { requestLoggerMiddleware } from './src/utils/logger.enhanced.js';
app.use(requestLoggerMiddleware(logger));
```

### Error Handling
```javascript
import {
  ValidationError,
  NotFoundError,
  OpenAIError,
  WhatsAppError,
  DatabaseError,
  errorHandlerMiddleware
} from './src/utils/errors/index.js';

// Throw errors
if (!email.includes('@')) {
  throw new ValidationError('Invalid email format', { field: 'email' });
}

if (!lead) {
  throw new NotFoundError('Lead', leadId);
}

// Catch and wrap external errors
try {
  await openai.chat.completions.create(params);
} catch (error) {
  throw new OpenAIError('Failed to get completion', error);
}

// Express error handler (in server.js)
app.use(errorHandlerMiddleware(logger));

// Manual error handling
try {
  // ... code
} catch (error) {
  if (error.isOperational) {
    logger.warn('Operational error', { error: error.message });
  } else {
    logger.error('Non-operational error', { error: error.message });
  }
  throw error;
}
```

### Dependency Injection
```javascript
import { getContainer } from './src/config/di-container.js';

// Get container
const container = getContainer();

// Resolve dependencies
const config = await container.resolve('config');
const logger = await container.resolve('logger');
const db = await container.resolve('db');
const openai = await container.resolve('openaiClient');

// Register custom singleton
container.registerSingleton('myService', async (c) => {
  const db = await c.resolve('db');
  const logger = await c.resolve('logger');
  return new MyService(db, logger);
});

// Register factory (new instance each time)
container.registerFactory('requestContext', (c) => {
  return { requestId: Date.now() };
});

// Register value
container.registerValue('appVersion', '2.1.0');

// Check if registered
if (container.has('myService')) {
  const service = await container.resolve('myService');
}
```

---

## 🗂️ File Structure

### Wave 1 Components
```
src/
├── config/
│   ├── index.js              # Centralized configuration
│   ├── di-container.js       # Dependency injection
│   ├── express.config.js     # Express middleware setup
│   └── server.startup.js     # Server startup logic
│
├── utils/
│   ├── errors/
│   │   ├── base.error.js     # Base error classes
│   │   ├── domain.error.js   # Domain-specific errors
│   │   └── index.js          # Error exports & utilities
│   └── logger.enhanced.js    # Winston logger
│
├── api/
│   └── routes/               # Modular route files
│
├── tools/                    # Business logic tools
├── handlers/                 # Request handlers
└── server.js                 # Main entry point
```

### Important Files
- **Configuration:** `src/config/index.js`
- **Errors:** `src/utils/errors/index.js`
- **Logger:** `src/utils/logger.enhanced.js`
- **DI Container:** `src/config/di-container.js`
- **Server:** `src/server.js`
- **Environment:** `.env`

---

## 🔧 Configuration Variables

### Required
```bash
OPENAI_API_KEY=sk-...              # OpenAI API key
```

### Optional (with defaults)
```bash
PORT=3000                          # Server port
NODE_ENV=development               # Environment

# OpenAI
OPENAI_CHAT_MODEL=gpt-4o-mini     # Chat model
OPENAI_EMB_MODEL=text-embedding-3-small

# Evolution API
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE=orbion

# Database
DATABASE_PATH=./orbion.db
DATABASE_WAL=true
DATABASE_TIMEOUT=5000

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs/orbion.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

---

## 🐛 Debugging

### Check Logs
```bash
# View latest logs
tail -f logs/orbion.log

# View error logs only
tail -f logs/error.log

# Pretty print JSON logs
tail -f logs/orbion.log | jq '.'
```

### Debug Configuration
```javascript
import config from './src/config/index.js';

// Print all config (sensitive values masked)
console.log(config.toObject());

// Check specific values
console.log('Port:', config.server.port);
console.log('Environment:', config.env);
console.log('OpenAI Model:', config.openai.chatModel);
```

### Debug DI Container
```javascript
import { getContainer } from './src/config/di-container.js';

const container = getContainer();

// List all registered dependencies
console.log('Registered:', container.getRegisteredNames());

// Get info about specific dependency
console.log('DB Info:', container.getInfo('db'));

// Get all dependencies info
console.log('All:', container.getAllInfo());
```

### Debug Server
```bash
# Check what's running
npm run status

# Check ports in use
npm run ports

# Kill all instances
npm run kill

# Restart cleanly
npm run restart
```

---

## 📊 Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3001/health
```

### Server Stats
```javascript
import { serverStats } from './src/config/express.config.js';

console.log({
  uptime: Date.now() - serverStats.startTime,
  totalRequests: serverStats.totalRequests,
  webhooksReceived: serverStats.webhooksReceived,
  messagesProcessed: serverStats.messagesProcessed,
  errors: serverStats.errors
});
```

---

## 🧪 Testing

### Write Tests
```javascript
import { createLogger } from './src/utils/logger.enhanced.js';
import { ValidationError } from './src/utils/errors/index.js';

// Test with logger
const logger = createLogger({ module: 'Test' });
logger.info('Test started');

// Test errors
try {
  throw new ValidationError('Test error');
} catch (error) {
  console.log('Caught:', error.code);
}

// Test config
import config from './src/config/index.js';
console.assert(config.server.port > 0);
```

### Run Tests
```bash
# Foundation tests
node test_wave1.js

# All tests
npm test

# Specific module tests
npm run test:sheets
```

---

## 🎯 Best Practices

### 1. Always Use Configuration
```javascript
// ❌ Bad
const port = process.env.PORT || 3000;

// ✅ Good
import config from './src/config/index.js';
const port = config.server.port;
```

### 2. Always Use Logger
```javascript
// ❌ Bad
console.log('User logged in:', userId);

// ✅ Good
logger.info('User logged in', { userId });
```

### 3. Always Use Custom Errors
```javascript
// ❌ Bad
throw new Error('Lead not found');

// ✅ Good
import { NotFoundError } from './src/utils/errors/index.js';
throw new NotFoundError('Lead', leadId);
```

### 4. Always Resolve Dependencies
```javascript
// ❌ Bad
import Database from 'better-sqlite3';
const db = new Database('./orbion.db');

// ✅ Good (after Wave 2)
const db = await container.resolve('db');
```

### 5. Always Add Context to Logs
```javascript
// ❌ Bad
logger.info('Processing');

// ✅ Good
logger.info('Processing lead', {
  leadId,
  stage: 'Budget',
  timestamp: Date.now()
});
```

---

## 🚨 Common Issues

### Issue: Configuration validation failed
**Solution:** Check `.env` file has required variables:
```bash
OPENAI_API_KEY=sk-...
```

### Issue: Port already in use
**Solution:** Kill existing instances:
```bash
npm run kill
npm start
```

### Issue: Database locked
**Solution:** Check for zombie processes:
```bash
npm run status
npm run kill
```

### Issue: Logger not writing to file
**Solution:** Check logs directory exists:
```bash
mkdir -p logs
```

---

## 📚 Documentation

### Main Documents
1. `REFACTORING_STATUS.md` - Overall project status
2. `WAVE1_IMPLEMENTATION_COMPLETE.md` - Wave 1 details
3. `WAVE2_NEXT_STEPS.md` - What's next
4. `ARCHITECTURE_ASSESSMENT_2025-11-11.md` - Full analysis

### Code Documentation
- All functions have JSDoc comments
- All files have header comments
- Examples in each module

---

## 🔗 Useful Commands

```bash
# Development
npm start                    # Start server
npm run dev                  # Development mode
npm run status              # Check status
npm run kill                # Kill all instances
npm run restart             # Restart server

# Testing
node test_wave1.js          # Foundation tests
npm test                    # All tests
npm run test:sheets         # Sheets tests

# Code Quality
npm run lint                # Check code
npm run lint:fix            # Fix code
npm run format              # Format code
npm run format:check        # Check format

# Database
npm run migrate             # Run migrations
npm run migrate:status      # Check migration status
npm run backup              # Backup database
npm run backup:restore      # Restore backup
```

---

## 💡 Tips

1. **Use TypeScript hints:** Enable JSDoc in VSCode for intellisense
2. **Watch logs:** Keep `tail -f logs/orbion.log` open during development
3. **Test often:** Run `node test_wave1.js` after changes
4. **Read errors:** Custom errors have detailed context
5. **Check docs:** All patterns documented in this guide

---

**Need help?** Check the documentation files or search the codebase for examples!
