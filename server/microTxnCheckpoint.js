// Shared persistence contract. CAS revisions prevent a stale worker from
// replacing newer evidence or moving a report cursor backwards.
export function validateMicroTxnCheckpoint(scope, value, expectedRevision) {
    if (typeof scope !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(scope)
        || ['constructor', 'prototype', '__proto__'].includes(scope)) throw new Error('invalid_report_scope');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('invalid_report_revision');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_report_checkpoint');
    const clone = JSON.parse(JSON.stringify(value));
    delete clone.revision;
    return clone;
}
