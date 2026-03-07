import { supabase } from './supabaseClient.js';

const isMissingAuditTable = (error) => {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''}`;
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes('mark_audit_logs');
};

export const recordMarkAudit = async ({
  markId,
  studentId,
  action,
  oldPayload,
  newPayload,
  actorName,
  actorEmail,
}) => {
  const payload = {
    mark_id: markId || null,
    student_id: studentId || null,
    action,
    old_payload: oldPayload || null,
    new_payload: newPayload || null,
    actor_name: actorName || null,
    actor_email: actorEmail || null,
  };

  const { error } = await supabase.from('mark_audit_logs').insert(payload);
  if (error && !isMissingAuditTable(error)) {
    throw error;
  }
};
