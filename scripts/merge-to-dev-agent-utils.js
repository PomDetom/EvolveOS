function latestEvidenceByGate(evidence = []) {
  const latest = new Map();
  evidence.forEach((record, index) => latest.set(record.commandId ?? record.gate ?? `unknown-${index}`, record));
  return [...latest.values()];
}

export function evidenceReadiness({ evidence = [], requiredGates = [], baseSha = null, headSha = null, changedPathsHash = null }) {
  const latest = new Map(latestEvidenceByGate(evidence).map((record) => [record.commandId ?? record.gate, record]));
  const issues = [];
  for (const gate of requiredGates) {
    const record = latest.get(gate);
    if (!record) { issues.push(`缺少当前 HEAD 的 evidence: ${gate}`); continue; }
    if (record.result !== 'success') issues.push(`evidence 未成功: ${gate}`);
    if (baseSha && record.baseSha !== baseSha) issues.push(`evidence baseSha 过期: ${gate}`);
    if (headSha && record.headSha !== headSha) issues.push(`evidence headSha 过期: ${gate}`);
    if (changedPathsHash && record.changedPathsHash !== changedPathsHash) issues.push(`evidence changedPathsHash 过期: ${gate}`);
  }
  return { ok: issues.length === 0, issues };
}

export function reviewReadiness({ review = null, headSha = null, required = false, acceptedSubjectHeads = [] } = {}) {
  if (!required) return { ok: true, issues: [] };
  const subjectHead = review?.subjectHead ?? review?.reviewedHead;
  const issues = [];
  if (!review || !subjectHead) issues.push('缺少真实 semantic review artifact');
  else {
    if (headSha && subjectHead !== headSha && !acceptedSubjectHeads.includes(subjectHead)) issues.push('review subjectHead 不等于待合入分支 HEAD');
    if (review.result !== 'approved') issues.push('review result 不是 approved');
    const findings = review.findings ?? {};
    if (Array.isArray(findings.critical) && findings.critical.length) issues.push('存在未解决 Critical findings');
    if (Array.isArray(findings.important) && findings.important.length) issues.push('存在未解决 Important findings');
  }
  return { ok: issues.length === 0, issues };
}

export function evaluateNativeReadiness({
  mode = 'v2', task = null, taskBranch = null, branchHead = null, baseSha = null,
  changedPathsHash = null, requiredGates = [], evidence = task?.evidence ?? [], review = task?.review ?? null,
  boundaryOk = true, boundaryIssues = [], scopeIssues = [], noteIssues = [], approvalIssues = [],
  requireTask = false, requireReview = false, requireEvidence = true, humanIssues = [],
  reviewSubjectHeads = [],
}) {
  const issues = [];
  if (!boundaryOk) issues.push(...boundaryIssues);
  issues.push(...scopeIssues, ...noteIssues, ...approvalIssues, ...humanIssues);
  if (!task) {
    if (requireTask) issues.push('该变更需要 recovery task，但未找到对应 task');
  } else {
    if (task.schemaVersion !== 2) issues.push('task 不是 schemaVersion 2 recovery manifest');
    if (task.branch !== taskBranch) issues.push(`task branch 不一致: ${task.branch} / ${taskBranch}`);
    if (task.recovery?.state === 'cancelled') issues.push('recovery task 已取消');
    if (task.recovery?.state === 'blocked' && !task.recovery.blockedReason) issues.push('blocked task 缺少 blockedReason');
    if (task.baseSha && baseSha && task.baseSha !== baseSha) issues.push('task baseSha 与当前 base 不一致');
    if (task.approval?.required === true && (!task.approval.approvedBy || !task.approval.approvedAt || !task.approval.scopeHash)) issues.push('task 需要 human approval 但缺少批准事实');
  }
  if (requireEvidence && requiredGates.length) issues.push(...evidenceReadiness({ evidence, requiredGates, baseSha, headSha: branchHead, changedPathsHash }).issues);
  issues.push(...reviewReadiness({ review, headSha: branchHead, required: requireReview, acceptedSubjectHeads: reviewSubjectHeads }).issues);
  return { mode, taskId: task?.id ?? null, ok: issues.length === 0, issues };
}

export function formatNativeReadiness(report) {
  const result = report.ok ? (report.issues.length ? 'warning' : 'ok') : 'blocked';
  return [`native-readiness protocol=${report.mode} task=${report.taskId ?? 'none'} result=${result}`, ...report.issues.map((issue) => `- ${issue}`)].join('\n');
}
