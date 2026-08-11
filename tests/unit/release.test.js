import { describe, it, expect } from 'vitest';
import { collectCommits, formatChangelogEntry } from '../../scripts/release.js';

describe('release changelog', () => {
  it('collectCommits：去掉短哈希前缀取 subject', () => {
    expect(collectCommits('a1b2c3d feat: x\ne4f5g6h fix: y\n')).toEqual(['feat: x', 'fix: y']);
    expect(collectCommits('')).toEqual([]);
  });

  it('formatChangelogEntry：渲染版本条目（含分类占位 + 草稿提交列表）', () => {
    const entry = formatChangelogEntry({ version: '0.1.1', date: '2026-08-11', commits: ['feat: a', 'fix: b'] });
    expect(entry).toContain('## [0.1.1] - 2026-08-11');
    expect(entry).toContain('### Added');
    expect(entry).toContain('- feat: a');
    expect(entry).toContain('- fix: b');
  });

  it('formatChangelogEntry：无提交时给占位提示', () => {
    const entry = formatChangelogEntry({ version: '0.1.1', date: '2026-08-11', commits: [] });
    expect(entry).toContain('本版本变更待整理');
  });
});
