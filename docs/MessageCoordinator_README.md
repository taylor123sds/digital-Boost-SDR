# MessageCoordinator System - ORBION WhatsApp Agent

## Overview

The MessageCoordinator system is a comprehensive message queue and coordination layer that works alongside the MessageOrchestrator to provide advanced message management for the ORBION WhatsApp agent. It ensures proper message ordering, prevents race conditions, detects duplicates, and provides intelligent batching for high-frequency contacts.

## Key Features

### 🔄 FIFO Queue Management
- **Per-contact queues**: Each contact gets their own First-In-First-Out message queue
- **Race condition prevention**: Only one message per contact is processed at a time
- **Automatic cleanup**: Empty queues are automatically removed after 5 minutes of inactivity

### 🔍 Duplicate Detection
- **10-second window**: Messages with identical content within 10 seconds are detected as duplicates
- **Content-based hashing**: Uses SHA-256 hashing of message content (excluding timestamps)
- **Automatic cleanup**: Old duplicate detection entries are cleaned up every 30 seconds

### 📦 Message Batching
- **High-frequency detection**: Automatically detects contacts sending >3 messages per minute
- **Intelligent batching**: Combines multiple messages into batches for efficient processing
- **Configurable timeouts**: 2-second batch timeout with maximum 5 messages per batch

### 📊 Comprehensive Statistics
- **Real-time monitoring**: Track queue sizes, processing times, and duplicate rates
- **Performance metrics**: Messages per minute, uptime, memory usage
- **Health monitoring**: System health checks with configurable thresholds

### 🚨 Emergency Management
- **Queue flushing**: Emergency flush capabilities for individual contacts or all queues
- **Overflow protection**: Automatic queue size limiting with oldest message removal
- **System safeguards**: Emergency flush when queue count exceeds thresholds

## Integration with ORBION

The MessageCoordinator is seamlessly integrated into the ORBION webhook processing flow:

```
Webhook → WebhookHandler → MessageCoordinator → MessageOrchestrator → ResponseManager
```

### Flow Process

1. **Webhook receives message** → WebhookHandler validates and extracts data
2. **MessageCoordinator enqueues** → Checks for duplicates, manages queues, handles batching
3. **MessageCoordinator dequeues** → Returns next message in FIFO order
4. **MessageOrchestrator processes** → Handles actual message processing logic
5. **MessageCoordinator marks complete** → Updates queue status for next message

## API Endpoints

### Admin Endpoints

#### Get Coordinator Statistics
```
GET /api/admin/coordinator/stats
```
Returns comprehensive statistics including queue status, performance metrics, and batching information.

#### Get Contact Queue Status
```
GET /api/admin/coordinator/contact/:contactId
```
Returns queue status for a specific contact including queue size, processing state, and activity timestamps.

#### Flush Contact Queue
```
POST /api/admin/coordinator/flush/:contactId
```
Emergency flush of all messages in a specific contact's queue.

#### Emergency Flush All Queues
```
POST /api/admin/coordinator/emergency-flush
```
Nuclear option - flushes all queues system-wide.

#### Test Coordinator
```
POST /api/admin/coordinator/test
```
Runs a complete test cycle with mock messages to verify coordinator functionality.

### Health Monitoring

The MessageCoordinator is included in the main health endpoints:

```
GET /api/health
GET /api/admin/handlers-health
```

## Configuration

The MessageCoordinator includes several configurable parameters:

```javascript
config: {
  QUEUE_CLEANUP_INTERVAL: 5 * 60 * 1000,      // 5 minutes
  DUPLICATE_CLEANUP_INTERVAL: 30 * 1000,       // 30 seconds
  MAX_QUEUE_SIZE: 20,                          // Max messages per contact
  EMERGENCY_FLUSH_THRESHOLD: 50,               // Total queues before emergency
  INACTIVITY_THRESHOLD: 5 * 60 * 1000         // 5 minutes inactivity
}

batchConfig: {
  BATCH_THRESHOLD: 3,                          // Messages per minute for batching
  BATCH_TIMEOUT: 2000,                         // 2 seconds batch timeout
  BATCH_MAX_SIZE: 5                            // Max messages per batch
}
```

## Usage Examples

### Basic Message Processing
```javascript
import messageCoordinator from './src/handlers/MessageCoordinator.js';

// Enqueue a message
const result = await messageCoordinator.enqueueMessage(contactId, {
  text: 'Hello world',
  messageType: 'text',
  timestamp: Date.now(),
  messageId: 'unique-id'
});

// Dequeue next message (FIFO)
const nextMessage = messageCoordinator.dequeueMessage(contactId);

// Mark processing complete
messageCoordinator.markProcessingComplete(contactId);
```

### Monitoring and Statistics
```javascript
// Get comprehensive statistics
const stats = messageCoordinator.getQueueStats();

// Check system health
const health = messageCoordinator.getHealthStatus();

// Get specific contact status
const contactStatus = messageCoordinator.getContactQueueStatus(contactId);
```

### Emergency Operations
```javascript
// Flush specific contact queue
const flushResult = messageCoordinator.flushQueue(contactId);

// Emergency flush all queues
const emergencyResult = messageCoordinator.emergencyFlushAll();

// Clear all coordinator data
const clearResult = messageCoordinator.clearAll();
```

## Event System

The MessageCoordinator emits various events for monitoring and integration:

- `messageEnqueued` - When a message is added to a queue
- `messageDequeued` - When a message is removed from a queue
- `duplicateDetected` - When a duplicate message is identified
- `batchCreated` - When messages are batched together
- `queueFlushed` - When a queue is manually flushed
- `emergencyFlush` - When emergency flush is triggered
- `autoCleanup` - When automatic cleanup removes old queues
- `processingComplete` - When processing is marked complete

## Performance Characteristics

### Memory Usage
- **Efficient storage**: Uses Maps for O(1) queue access
- **Automatic cleanup**: Removes old data to prevent memory leaks
- **Configurable limits**: Bounded queue sizes prevent runaway growth

### Processing Speed
- **Fast duplicate detection**: SHA-256 hashing with time-based windows
- **FIFO guarantees**: Maintains message order per contact
- **Batching optimization**: Reduces processing overhead for high-frequency contacts

### Scalability
- **Per-contact isolation**: No cross-contact interference
- **Emergency safeguards**: Automatic protection against system overload
- **Configurable thresholds**: Tunable for different workload characteristics

## Troubleshooting

### High Duplicate Rates
If you see high duplicate detection rates:
1. Check if clients are retransmitting messages
2. Verify webhook configuration isn't duplicating calls
3. Monitor the duplicate cleanup logs

### Queue Overflow
If queues are consistently full:
1. Check processing performance with orchestrator stats
2. Monitor for stuck processing states
3. Consider adjusting MAX_QUEUE_SIZE

### Memory Issues
If memory usage is high:
1. Check queue cleanup frequency
2. Monitor duplicate detection map sizes
3. Verify auto-cleanup is functioning

### Emergency Flushes
If emergency flushes are triggered:
1. Investigate what's causing queue buildup
2. Check system performance and bottlenecks
3. Consider adjusting EMERGENCY_FLUSH_THRESHOLD

## Testing

Run the comprehensive test suite:

```bash
node test_coordinator.js
```

This tests:
- Basic enqueue/dequeue functionality
- Duplicate detection accuracy
- Queue statistics reporting
- Batching system behavior
- Emergency flush operations
- Health status monitoring

## Integration Notes

The MessageCoordinator seamlessly integrates with existing ORBION systems:

- **WebhookHandler**: Provides validated message data
- **MessageOrchestrator**: Receives processed queue items
- **ResponseManager**: Gets coordinated response timing
- **PersistenceManager**: Stores coordination metadata

The system maintains backward compatibility while adding the coordination layer for improved reliability and performance.