// v2 compatibility stub. Git history is the activity log; this module never
// writes activity.jsonl and is intentionally not part of package scripts.
export const ACTIVITY_FILE = null;
export function recordTaskActivity() { throw new Error('v2 不支持 activity.jsonl；请使用 Git history'); }
export function readTaskActivity() { return []; }
export function activityPath() { return null; }
export function activityRelativePath() { return null; }
export function commitWorkflowRecord() { throw new Error('v2 不支持 workflow checkpoint commit'); }
