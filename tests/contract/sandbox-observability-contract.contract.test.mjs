import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const asyncRoot = path.join(root, 'apis', 'async');
const loadJson = (name) => JSON.parse(fs.readFileSync(path.join(asyncRoot, name), 'utf8'));

const asyncApi = loadJson('sandbox-events.asyncapi.json');
const envelope = loadJson('sandbox-event-envelope.schema.json');
const catalog = loadJson('sandbox-event-catalog.json');
const outbox = loadJson('sandbox-outbox.contract.json');
const auditRecord = loadJson('sandbox-audit-record.schema.json');
const observability = loadJson('sandbox-observability-catalog.json');
const commandResult = JSON.parse(fs.readFileSync(
  path.join(root, 'apis', 'commands', 'sandbox-command-execution-result.schema.json'),
  'utf8'
));

const forbiddenNames = [
  'secret',
  'token',
  'password',
  'credential',
  'privatekey',
  'hostpath',
  'command',
  'argv',
  'rawoutput',
  'allocationreference',
  'signedurl',
  'sql',
  'prompt',
  'email',
  'phone'
];

function walkKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, keys);
    return keys;
  }
  if (!value || typeof value !== 'object') return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    walkKeys(child, keys);
  }
  return keys;
}

test('Sandbox AsyncAPI is a draft SDKWork event authority', () => {
  assert.equal(asyncApi.asyncapi, '3.0.0');
  assert.equal(asyncApi.info['x-sdkwork-status'], 'draft');
  assert.equal(asyncApi.info['x-sdkwork-requirement-id'], 'REQ-2026-0010');
  assert.ok(asyncApi.channels.sandboxEvents);
  assert.ok(asyncApi.operations.publishSandboxEvent);
  assert.equal(asyncApi.components.messages.SandboxEventEnvelope.payload.$ref, './sandbox-event-envelope.schema.json');
  assert.equal(catalog.outboxContract, './sandbox-outbox.contract.json');
  assert.equal(catalog.auditRecordSchema, './sandbox-audit-record.schema.json');
  assert.equal(catalog.observabilityCatalog, './sandbox-observability-catalog.json');
});

test('Sandbox envelope is bounded, correlated, redacted, and schema-versioned', () => {
  assert.equal(envelope.title, 'SandboxEventEnvelope');
  assert.equal(envelope.additionalProperties, false);
  for (const required of [
    'id',
    'type',
    'source',
    'specversion',
    'time',
    'dataSchemaVersion',
    'tenantId',
    'traceId',
    'redactionClassification',
    'data'
  ]) {
    assert.ok(envelope.required.includes(required), `missing required field: ${required}`);
  }
  assert.equal(envelope.properties.specversion.const, '1.0');
  assert.deepEqual(envelope.properties.redactionClassification.enum, [
    'Public',
    'Internal',
    'TenantSensitive',
    'PersonalData',
    'Secret',
    'Regulated',
    'Unknown'
  ]);
  assert.equal(envelope.$defs.SandboxEventData.additionalProperties, false);
  assert.equal(envelope.$defs.SandboxEventData.properties.durationMs.maximum, 86400000);
  assert.equal(envelope.$defs.SandboxEventData.properties.bytes.maximum, 1073741824);
});

test('Sandbox event catalog has exact dotted names and operational governance', () => {
  assert.equal(catalog.kind, 'sdkwork.sandbox.event-catalog');
  assert.equal(catalog.status, 'draft');
  assert.equal(catalog.requirementId, 'REQ-2026-0010');
  assert.equal(catalog.eventTypes.length, 33);
  const eventTypes = new Set();
  for (const event of catalog.eventTypes) {
    assert.match(event.type, /^sandbox\.[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*){1,4}$/);
    assert.equal(event.dataSchemaVersion, 1);
    assert.ok(!eventTypes.has(event.type), `duplicate event type: ${event.type}`);
    eventTypes.add(event.type);
    assert.match(event.retentionClass, /^(operational|terminal-metadata|audit|telemetry)$/);
    assert.match(event.orderingScope, /^(none|tenant|tenant-session|provider|node)$/);
    assert.match(event.replay, /^(safe|rebuildable)$/);
    assert.equal(event.consumerIdempotency, true);
    assert.equal(typeof event.producesAuditFact, 'boolean');
  }
  assert.ok(eventTypes.has('sandbox.security.policy.denied'));
  assert.ok(eventTypes.has('sandbox.metrics.updated'));
  assert.ok(eventTypes.has('sandbox.quota.resource.limit.applied'));
  assert.ok(eventTypes.has('sandbox.quota.resource.limit.exceeded'));
  assert.ok(eventTypes.has('sandbox.resource.usage.recorded'));
  assert.ok(eventTypes.has('sandbox.scheduler.placement.selected'));
  assert.ok(eventTypes.has('sandbox.scheduler.placement.failed'));
  assert.ok(eventTypes.has('sandbox.scheduler.capacity.reserved'));
  assert.ok(eventTypes.has('sandbox.scheduler.capacity.released'));
  assert.ok(eventTypes.has('sandbox.node.enrollment.approved'));
  assert.ok(eventTypes.has('sandbox.node.identity.rotated'));
  assert.ok(eventTypes.has('sandbox.node.trust.changed'));
  assert.ok(eventTypes.has('sandbox.node.inventory.updated'));
  assert.ok(eventTypes.has('sandbox.node.draining'));
  assert.ok(eventTypes.has('sandbox.node.quarantined'));
});

test('Sandbox contract source contains no forbidden secret or provider-private field names', () => {
  const keys = walkKeys({ asyncApi, envelope, catalog, outbox, auditRecord, observability })
    .map((key) => key.toLowerCase().replaceAll('_', ''));
  for (const forbidden of forbiddenNames) {
    assert.ok(!keys.includes(forbidden), `forbidden contract key: ${forbidden}`);
  }
});

test('Sandbox Outbox contract requires atomic PostgreSQL facts and at-least-once delivery', () => {
  assert.equal(outbox.kind, 'sdkwork.sandbox.outbox-contract');
  assert.equal(outbox.status, 'draft');
  assert.equal(outbox.requirementId, 'REQ-2026-0010');
  assert.equal(outbox.implementationAuthorized, false);
  assert.equal(outbox.authoritativeStore, 'postgresql');
  assert.equal(outbox.deliveryGuarantee, 'at-least-once');
  assert.equal(
    outbox.transactionBoundary.sandbox_business_fact_and_outbox_record,
    'same-authoritative-database-transaction'
  );
  assert.equal(outbox.transactionBoundary.sandbox_publish_after_commit, true);
  assert.equal(outbox.transactionBoundary.sandbox_telemetry_is_not_transaction_authority, true);
  assert.ok(outbox.record.requiredFields.every((field) => field.startsWith('sandbox_')));
  assert.ok(outbox.record.uniqueConstraints.includes('sandbox_event_id'));
  assert.equal(outbox.record.tenantLeadingIndexesRequired, true);
});

test('Sandbox Outbox delivery, replay, ordering, and retention are bounded and fail safe', () => {
  assert.equal(outbox.retry.strategy, 'bounded-exponential-with-jitter');
  assert.equal(outbox.retry.deadLetterAfterAttemptLimit, true);
  assert.equal(outbox.retry.silentDropAllowed, false);
  assert.ok(outbox.bounds.sandbox_attempt_count_max > 0);
  assert.ok(outbox.bounds.sandbox_attempt_count_max <= 12);
  assert.ok(outbox.bounds.sandbox_publish_batch_size_max <= 200);
  assert.ok(outbox.bounds.sandbox_replay_batch_size_max <= 200);
  assert.ok(outbox.bounds.sandbox_event_envelope_max_bytes <= 262144);
  assert.equal(outbox.deadLetter.operatorReplayRequiresAuthorization, true);
  assert.equal(outbox.deadLetter.operatorReplayProducesAuditFact, true);
  assert.equal(outbox.replay.consumerIdempotencyRequired, true);
  assert.equal(outbox.replay.unboundedReplayAllowed, false);
  assert.equal(outbox.ordering.globalOrderingAllowed, false);
  assert.equal(outbox.retention.deletionIsBoundedAndAudited, true);
});

test('Sandbox audit schema captures bounded actor, action, resource, tenant, result, time, and trace', () => {
  assert.equal(auditRecord.title, 'SandboxAuditRecord');
  assert.equal(auditRecord.additionalProperties, false);
  for (const required of [
    'sandboxAuditId',
    'sandboxActor',
    'sandboxAction',
    'sandboxResource',
    'sandboxTenantId',
    'sandboxResult',
    'sandboxTime',
    'sandboxTraceId',
    'sandboxRedactionClassification'
  ]) {
    assert.ok(auditRecord.required.includes(required), `missing audit field: ${required}`);
  }
  assert.equal(auditRecord.$defs.SandboxAuditActor.additionalProperties, false);
  assert.equal(auditRecord.$defs.SandboxAuditResource.additionalProperties, false);
  assert.match(
    auditRecord.$defs.SandboxAuditActor.properties.sandboxActorRefHash.pattern,
    /sha256/u
  );
  assert.match(
    auditRecord.$defs.SandboxAuditResource.properties.sandboxResourceRefHash.pattern,
    /sha256/u
  );
  assert.deepEqual(auditRecord.properties.sandboxResult.enum, ['allowed', 'denied', 'failed']);
});

test('Sandbox metric catalog uses canonical names, units, types, and bounded labels', () => {
  assert.equal(observability.kind, 'sdkwork.sandbox.observability-catalog');
  assert.equal(observability.status, 'draft');
  assert.equal(observability.implementationAuthorized, false);
  assert.deepEqual(observability.metrics.requiredLabels, [
    'service',
    'environment',
    'deployment_profile',
    'runtime_target'
  ]);
  assert.ok(observability.metrics.catalog.length >= 10);
  const metricNames = new Set();
  for (const metric of observability.metrics.catalog) {
    assert.match(metric.name, /^sdkwork_sandbox_[a-z0-9_]+$/u);
    assert.ok(!metricNames.has(metric.name), `duplicate metric: ${metric.name}`);
    metricNames.add(metric.name);
    assert.match(metric.type, /^(counter|gauge|histogram)$/u);
    assert.ok(metric.additionalLabels.every((label) => label.startsWith('sandbox_')));
    assert.ok(
      metric.additionalLabels.every((label) =>
        observability.metrics.allowedBoundedLabels.includes(label)
      )
    );
    if (metric.type === 'counter') assert.match(metric.name, /_total$/u);
    if (metric.type === 'histogram') {
      if (metric.unit === 'seconds') {
        assert.match(metric.name, /_duration_seconds$/u);
      } else {
        assert.equal(metric.unit, 'bytes');
        assert.match(metric.name, /_bytes$/u);
      }
    }
  }
  assert.ok(observability.metrics.histogramBucketsSeconds.length > 0);
  assert.deepEqual(observability.metrics.boundedLabelValues.sandbox_exit_class, [
    'zero',
    'nonzero',
    'signaled',
    'none'
  ]);
  assert.deepEqual(observability.metrics.boundedLabelValues.sandbox_stream, ['stdout', 'stderr']);
  assert.deepEqual(observability.metrics.boundedLabelValues.sandbox_cleanup_status, [
    'not-required',
    'completed',
    'failed'
  ]);
  assert.deepEqual(
    observability.metrics.boundedLabelValues.sandbox_cleanup_status,
    commandResult.properties.sandboxCleanupStatus.enum
  );
  assert.equal(observability.metrics.histogramBucketsBytes.at(-1), 67108864);
  assert.ok(metricNames.has('sdkwork_sandbox_command_executions_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_command_execution_duration_seconds'));
  assert.ok(metricNames.has('sdkwork_sandbox_command_output_bytes'));
  assert.ok(metricNames.has('sdkwork_sandbox_command_cleanup_duration_seconds'));
  assert.deepEqual(
    observability.metrics.catalog.find(
      (metric) => metric.name === 'sdkwork_sandbox_command_cleanup_duration_seconds'
    ).additionalLabels,
    ['sandbox_provider_kind', 'sandbox_outcome', 'sandbox_cleanup_status']
  );
  assert.ok(metricNames.has('sdkwork_sandbox_resource_limit_operations_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_resource_limit_operation_duration_seconds'));
  assert.ok(metricNames.has('sdkwork_sandbox_resource_limit_breaches_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_resource_saturation_ratio'));
  assert.ok(metricNames.has('sdkwork_sandbox_admission_decisions_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_scheduler_placement_operations_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_scheduler_placement_duration_seconds'));
  assert.ok(metricNames.has('sdkwork_sandbox_scheduler_queue_wait_duration_seconds'));
  assert.ok(metricNames.has('sdkwork_sandbox_capacity_reservations_active'));
  assert.ok(metricNames.has('sdkwork_sandbox_capacity_saturation_ratio'));
  assert.ok(metricNames.has('sdkwork_sandbox_node_enrollment_operations_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_node_enrollment_duration_seconds'));
  assert.ok(metricNames.has('sdkwork_sandbox_node_identity_rotation_operations_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_node_attestation_verifications_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_node_attestation_verification_duration_seconds'));
  assert.ok(metricNames.has('sdkwork_sandbox_node_inventory_publications_total'));
  assert.ok(metricNames.has('sdkwork_sandbox_nodes_by_scheduling_state'));
  assert.ok(observability.metrics.forbiddenLabels.includes('sandbox_trace_id'));
  assert.ok(observability.metrics.forbiddenLabels.includes('sandbox_raw_tenant_id'));
  assert.ok(observability.metrics.forbiddenLabels.includes('sandbox_raw_command'));
});

test('Sandbox logs, traces, audit, and backpressure preserve correlation and fact separation', () => {
  assert.equal(observability.structuredLogs.type, 'SandboxStructuredLogRecord');
  assert.ok(observability.structuredLogs.requiredContextFields.includes('trace_id'));
  assert.ok(observability.structuredLogs.requiredContextFields.includes('sandbox_operation'));
  assert.equal(observability.traces.type, 'SandboxTraceObservation');
  assert.equal(observability.traces.traceAuthority, 'server-owned-trace-id');
  assert.equal(observability.traces.competingTraceIdentityAllowed, false);
  assert.equal(observability.audit.type, 'SandboxAuditRecord');
  assert.equal(observability.audit.durableWhenTelemetryExporterUnavailable, true);
  assert.equal(observability.audit.consoleLogIsAuthority, false);
  assert.equal(observability.backpressure.sandbox_business_events, 'durable-outbox-no-silent-loss');
  assert.equal(observability.backpressure.sandbox_security_audit, 'durable-no-silent-loss');
  assert.equal(observability.factSeparation.sandbox_metrics_are_billing_truth, false);
  assert.equal(observability.factSeparation.sandbox_logs_are_audit_truth, false);
  assert.equal(observability.factSeparation.sandbox_dashboard_is_business_truth, false);
  assert.equal(observability.factSeparation.sandbox_dashboard_is_rebuildable_projection, true);
});

test('Sandbox event catalog keeps telemetry separate from audit and billing facts', () => {
  const metricEvent = catalog.eventTypes.find((event) => event.type === 'sandbox.metrics.updated');
  assert.equal(metricEvent.category, 'telemetry');
  assert.equal(metricEvent.retentionClass, 'telemetry');
  assert.equal(metricEvent.producesAuditFact, false);
  assert.equal(metricEvent.replay, 'rebuildable');
  for (const event of catalog.eventTypes.filter((item) => item.producesAuditFact)) {
    assert.ok(
      event.retentionClass === 'audit' || event.category !== 'telemetry',
      `${event.type} must be non-telemetry when it produces an audit fact`
    );
  }
});
