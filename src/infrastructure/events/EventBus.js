/**
 * @file infrastructure/events/EventBus.js
 * @description Event bus for domain events
 * Wave 4: Infrastructure Layer - Events
 */

import { ApplicationError } from '../../utils/errors/index.js';

/**
 * Event Bus
 * Publish-subscribe event system for domain events
 */
export class EventBus {
  /**
   * @param {Object} logger - Logger instance
   */
  constructor(logger) {
    this.logger = logger;
    this.handlers = new Map(); // eventName -> Set<handler>
    this.middlewares = [];
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new ApplicationError('Event handler must be a function', {
        code: 'INVALID_HANDLER',
        eventName
      });
    }

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName).add(handler);

    this.logger.debug('Event handler registered', {
      eventName,
      handlerCount: this.handlers.get(eventName).size
    });

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventName);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventName);
        }
      }
    };
  }

  /**
   * Subscribe to multiple events
   * @param {Array<string>} eventNames - Event names
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe all function
   */
  subscribeToMany(eventNames, handler) {
    const unsubscribers = eventNames.map(eventName =>
      this.subscribe(eventName, handler)
    );

    // Return function that unsubscribes from all
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Subscribe once to an event
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribeOnce(eventName, handler) {
    const wrappedHandler = async (event) => {
      await handler(event);
      unsubscribe();
    };

    const unsubscribe = this.subscribe(eventName, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Publish an event
   * @param {Object} event - Event to publish
   * @returns {Promise<void>}
   */
  async publish(event) {
    if (!event || !event.name) {
      throw new ApplicationError('Event must have a name', {
        code: 'INVALID_EVENT',
        event
      });
    }

    this.logger.debug('Publishing event', {
      eventName: event.name,
      eventId: event.id,
      handlerCount: this.handlers.get(event.name)?.size || 0
    });

    // Apply middlewares
    for (const middleware of this.middlewares) {
      event = await middleware(event);
    }

    const handlers = this.handlers.get(event.name);

    if (!handlers || handlers.size === 0) {
      this.logger.debug('No handlers for event', {
        eventName: event.name
      });
      return;
    }

    // Execute handlers in parallel
    const results = await Promise.allSettled(
      Array.from(handlers).map(handler =>
        this._executeHandler(handler, event)
      )
    );

    // Log failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error('Some event handlers failed', {
        eventName: event.name,
        failures: failures.length,
        total: handlers.size,
        errors: failures.map(f => f.reason?.message)
      });
    } else {
      this.logger.debug('Event published successfully', {
        eventName: event.name,
        handlersExecuted: handlers.size
      });
    }
  }

  /**
   * Execute a single handler
   * @private
   * @param {Function} handler - Event handler
   * @param {Object} event - Event
   * @returns {Promise<void>}
   */
  async _executeHandler(handler, event) {
    const startTime = Date.now();

    try {
      await handler(event);

      const duration = Date.now() - startTime;

      if (duration > 1000) {
        this.logger.warn('Event handler took too long', {
          eventName: event.name,
          duration
        });
      }
    } catch (error) {
      this.logger.error('Event handler failed', {
        eventName: event.name,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Publish multiple events
   * @param {Array<Object>} events - Events to publish
   * @returns {Promise<void>}
   */
  async publishMany(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Add middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new ApplicationError('Middleware must be a function', {
        code: 'INVALID_MIDDLEWARE'
      });
    }

    this.middlewares.push(middleware);

    this.logger.debug('Middleware added', {
      count: this.middlewares.length
    });
  }

  /**
   * Clear all handlers
   */
  clear() {
    this.handlers.clear();
    this.logger.debug('All event handlers cleared');
  }

  /**
   * Clear handlers for specific event
   * @param {string} eventName - Event name
   */
  clearEvent(eventName) {
    this.handlers.delete(eventName);
    this.logger.debug('Event handlers cleared', { eventName });
  }

  /**
   * Get handler count for event
   * @param {string} eventName - Event name
   * @returns {number} Handler count
   */
  getHandlerCount(eventName) {
    return this.handlers.get(eventName)?.size || 0;
  }

  /**
   * Get all registered event names
   * @returns {Array<string>} Event names
   */
  getRegisteredEvents() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const events = this.getRegisteredEvents();

    return {
      eventCount: events.length,
      totalHandlers: events.reduce((sum, eventName) =>
        sum + this.getHandlerCount(eventName), 0),
      middlewareCount: this.middlewares.length,
      events: events.map(eventName => ({
        name: eventName,
        handlerCount: this.getHandlerCount(eventName)
      }))
    };
  }
}

export default EventBus;
