function evidenceHead(evidence) {
  return evidence.testedHead ?? evidence.headSha;
}

export function evaluateNativeReadiness({ mode, task, taskBranch, branchHead, changeHeadAncestor = true, codeChangedAfterHead = false, approvalIssues = [] }) {
  const issues = [];
  if (!['shadow', 'enforced'].includes(mode)) issues.push(`协议 mode 非法: ${mode}`);
  if (!task) {
    issues.push('未找到对应 native task');
  } else {
    if (task.branch !== taskBranch) issues.push(`task branch 不一致: ${task.branch} / ${taskBranch}`);
    if (task.status !== 'ready') issues.push(`task 状态不是 ready: ${task.status}`);
    if (task.changeHead) {
      if (!changeHeadAncestor) issues.push('changeHead 不在待合入分支历史中');
      if (codeChangedAfterHead) issues.push('验证后又发生代码改动');
    } else if (task.readyHead !== branchHead) {
      issues.push('readyHead 不等于待合入分支 HEAD');
    }
    if (!Array.isArray(task.evidence) || task.evidence.length === 0) {
      issues.push('缺少验证 evidence');
    } else {
      for (const evidence of task.evidence) {
        const expectedHead = task.changeHead ?? branchHead;
        if (evidenceHead(evidence) !== expectedHead) issues.push(`evidence headSha 过期: ${evidence.gate ?? 'unknown'}`);
        if (evidence.result !== 'success') issues.push(`evidence 未成功: ${evidence.gate ?? 'unknown'}`);
      }
    }
    const expectedReviewHead = task.changeHead ?? branchHead;
    if (!task.review || task.review.reviewedHead !== expectedReviewHead) issues.push('缺少当前代码 HEAD 的评审');
    const findings = task.review?.findings ?? {};
    if (Array.isArray(findings.critical) && findings.critical.length) issues.push('存在未解决 Critical findings');
    if (Array.isArray(findings.important) && findings.important.length) issues.push('存在未解决 Important findings');
    issues.push(...approvalIssues);
  }
  return {
    mode,
    taskId: task?.id ?? null,
    ok: mode === 'shadow' || issues.length === 0,
    issues,
  };
}

export function formatNativeReadiness(report) {
  const result = report.ok ? (report.issues.length ? 'warning' : 'ok') : 'blocked';
  const lines = [`native-readiness mode=${report.mode} task=${report.taskId ?? 'none'} result=${result}`];
  report.issues.forEach((issue) => lines.push(`- ${issue}`));
  return lines.join('\n');
}
