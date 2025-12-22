/**
 * @file InboundPipelineMetrics.js
 * @description In-memory counters for inbound pipeline observability
 */

const counters = {
  inbound_received: 0,
  inbound_staged: 0,
  job_enqueued: 0,
  job_processed_ok: 0,
  job_failed: 0,
  dedup_dropped: 0
};

export function incrementInboundMetric(name, amount = 1) {
  if (!Object.prototype.hasOwnProperty.call(counters, name)) {
    counters[name] = 0;
  }
  counters[name] += amount;
  return counters[name];
}

export function getInboundMetrics() {
  return { ...counters };
}

export default {
  incrementInboundMetric,
  getInboundMetrics
};
