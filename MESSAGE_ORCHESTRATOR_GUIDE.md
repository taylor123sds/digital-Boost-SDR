# MessageOrchestrator System Guide

## Overview

The MessageOrchestrator is a comprehensive system designed to prevent race conditions, duplicate responses, and system deadlocks in the ORBION WhatsApp agent system. It provides robust message processing orchestration with queuing, timeouts, and automatic deadlock detection.

## Key Features

### 🔒 Contact Locking System
- Prevents multiple processors from handling the same contact simultaneously
- Automatic lock expiration (30 seconds)
- Manual emergency unlock capabilities

### 📥 Message Queuing
- Intelligent queue system with configurable limits (max 10 messages per contact)
- FIFO processing order
- Automatic queue cleanup when contact becomes available

### ⏱️ Timeout Protection
- Configurable processing timeouts (30s default)
- Automatic timeout detection and recovery
- Prevents system hangs from stuck processors

### 🔍 Deadlock Detection
- Automatic deadlock detection every 30 seconds
- Self-healing system that resolves stuck processes
- Comprehensive logging and statistics

### 📊 Real-time Statistics
- Processing metrics and success rates
- System health monitoring
- Queue status and performance analytics

### 🎯 EventEmitter Pattern
- Real-time event notifications
- Comprehensive logging system
- Integration-friendly architecture

## Configuration

The system comes with sensible defaults but can be configured:

```javascript
const config = {
  PROCESSING_TIMEOUT: 30000,      // 30 seconds
  LOCK_TIMEOUT: 5000,             // 5 seconds
  MAX_QUEUE_SIZE: 10,             // Max messages per contact
  DEADLOCK_CHECK_INTERVAL: 30000, // 30 seconds
  MAX_CONCURRENT_CONTACTS: 50     // System limit
};
```

## Basic Usage

### Simple Integration

```javascript
import orchestrator from './src/handlers/message_orchestrator.js';

// Define your message processor
const messageProcessor = async (message, context) => {
  // Your processing logic here
  return {
    success: true,
    response: "Message processed successfully"
  };
};

// Process a message
const result = await orchestrator.processMessage(
  'contact_id_123',
  { text: 'Hello!', timestamp: Date.now() },
  messageProcessor
);

if (result.success && !result.queued) {
  console.log('Response:', result.response);
} else if (result.queued) {
  console.log('Message was queued for processing');
}
```

### WhatsApp Webhook Integration

```javascript
// In your webhook handler
export async function handleWhatsAppMessage(req, res) {
  const { from, body } = req.body;

  const messageProcessor = async (message, context) => {
    // Import your actual agent
    const { processMessage } = await import('./src/core/OrbionHybridAgent.js');
    return await processMessage(context.contactId, message.text, {});
  };

  try {
    const result = await orchestrator.processMessage(
      from,
      { text: body, timestamp: Date.now() },
      messageProcessor
    );

    if (result.success && !result.queued) {
      // Send response to WhatsApp
      await sendWhatsAppMessage(from, result.response);
    }

    res.json({ success: true, queued: result.queued });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

## Event Handling

The orchestrator emits events for monitoring and debugging:

```javascript
// Set up event listeners
orchestrator.on('messageReceived', (data) => {
  console.log(`Message from ${data.contactId}: ${data.message.text}`);
});

orchestrator.on('lockAcquired', (data) => {
  console.log(`Processing started for ${data.contactId}`);
});

orchestrator.on('lockReleased', (data) => {
  console.log(`Processing completed for ${data.contactId} in ${data.duration}ms`);
});

orchestrator.on('messageQueued', (data) => {
  console.log(`Message queued for ${data.contactId} (queue size: ${data.queueSize})`);
});

orchestrator.on('deadlocksResolved', (data) => {
  console.log(`${data.count} deadlocks resolved automatically`);
});

orchestrator.on('processingError', (data) => {
  console.error(`Error processing ${data.contactId}: ${data.error}`);
});
```

## Monitoring and Statistics

### Get System Statistics

```javascript
const stats = orchestrator.getStats();
console.log('System Statistics:', {
  totalProcessed: stats.totalProcessed,
  successRate: stats.successRate,
  currentlyProcessing: stats.currentlyProcessing,
  totalQueued: stats.totalQueued,
  uptime: stats.uptimeFormatted,
  averageProcessingTime: stats.averageProcessingTime
});
```

### Check Contact Status

```javascript
// Check if a contact is currently being processed
const isLocked = orchestrator.isContactLocked('contact_123');
console.log('Contact locked:', isLocked);
```

## Emergency Operations

### Emergency Unlock

```javascript
// Unlock a specific contact
const unlockedCount = orchestrator.emergencyUnlock('contact_123');

// Unlock all contacts (emergency reset)
const totalUnlocked = orchestrator.emergencyUnlock();
```

### Manual Deadlock Detection

```javascript
// Manually trigger deadlock detection
const deadlocksResolved = orchestrator.detectAndResolveDeadlocks();
console.log(`Resolved ${deadlocksResolved} deadlocks`);
```

## Error Handling

The orchestrator provides comprehensive error handling:

```javascript
const result = await orchestrator.processMessage(contactId, message, processor);

if (!result.success) {
  if (result.queued) {
    // Message was queued for later processing
    console.log('Message queued');
  } else if (result.fallback) {
    // Fallback response due to error
    console.log('Fallback response:', result.response);
  } else {
    // Processing error
    console.error('Processing failed:', result.error);
  }
}
```

## System Health Monitoring

### Real-time Health Check

```javascript
function checkSystemHealth() {
  const stats = orchestrator.getStats();

  return {
    healthy: stats.successRate > 95,
    processing: stats.currentlyProcessing,
    queued: stats.totalQueued,
    uptime: stats.uptime,
    errors: stats.totalErrors,
    deadlocks: stats.totalDeadlocks
  };
}
```

### Automatic Health Monitoring

```javascript
// Set up periodic health monitoring
setInterval(() => {
  const health = checkSystemHealth();

  if (!health.healthy) {
    console.warn('System health degraded:', health);
  }

  if (health.processing > 40) {
    console.warn('High processing load:', health.processing);
  }
}, 60000); // Check every minute
```

## Best Practices

### 1. Processor Function Design

```javascript
// Good: Async processor with proper error handling
const goodProcessor = async (message, context) => {
  try {
    // Your processing logic
    const result = await processLogic(message.text);

    return {
      success: true,
      response: result.response,
      metadata: result.metadata
    };
  } catch (error) {
    throw error; // Let orchestrator handle it
  }
};

// Bad: Synchronous or hanging processor
const badProcessor = (message, context) => {
  // Synchronous processing (blocks)
  const result = heavyComputationSync();
  return result;
};
```

### 2. Contact ID Consistency

```javascript
// Always use consistent contact IDs
const contactId = phoneNumber.replace(/\D/g, ''); // Clean phone number
await orchestrator.processMessage(contactId, message, processor);
```

### 3. Message Object Structure

```javascript
// Recommended message structure
const message = {
  text: messageText,
  timestamp: Date.now(),
  messageId: uniqueMessageId,
  type: 'text', // or 'audio', 'image', etc.
  metadata: {
    // Additional context
  }
};
```

## Troubleshooting

### Common Issues

1. **High Queue Sizes**
   ```javascript
   // Check queue details
   const stats = orchestrator.getStats();
   console.log('Queue details:', stats.queueDetails);
   ```

2. **Frequent Timeouts**
   ```javascript
   // Check timeout statistics
   if (stats.totalTimeouts > 10) {
     console.warn('Consider optimizing processor performance');
   }
   ```

3. **Memory Leaks**
   ```javascript
   // Monitor memory usage
   const memUsage = stats.memoryUsage;
   if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
     console.warn('High memory usage detected');
   }
   ```

### Debugging

Enable detailed logging for debugging:

```javascript
// Enable all event logging
orchestrator.on('messageReceived', console.log);
orchestrator.on('lockAcquired', console.log);
orchestrator.on('lockReleased', console.log);
orchestrator.on('messageQueued', console.log);
orchestrator.on('processingError', console.error);
```

## Graceful Shutdown

The orchestrator automatically handles graceful shutdowns:

```javascript
// Manual cleanup (called automatically on SIGINT/SIGTERM)
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  orchestrator.cleanup();
  process.exit(0);
});
```

## Testing

Run the comprehensive test suite:

```bash
node test_message_orchestrator.js
```

The test file demonstrates all features and provides examples for integration.

## Integration with Existing ORBION Systems

The MessageOrchestrator is designed to integrate seamlessly with existing ORBION components:

- **OrbionHybridAgent**: Primary message processor
- **WhatsApp Tools**: Message sending and receiving
- **Memory System**: Contact state management
- **Analytics**: Performance monitoring

For complete integration examples, see `test_message_orchestrator.js`.