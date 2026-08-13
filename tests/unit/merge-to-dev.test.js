import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../scripts/merge-to-dev-utils.js';

describe('merge-to-dev 参数解析', () => {
  it('仅分支名', () => {
    expect(parseArgs(['docs/x'])).toEqual({ branch: 'docs/x', message: null, noSync: false, noCleanup: false });
  });

  it('--message 空格形式取下一参数为文案', () => {
    expect(parseArgs(['docs/x', '--message', 'merge: 摘要']).message).toBe('merge: 摘要');
  });

  it('--message= 等号形式', () => {
    expect(parseArgs(['docs/x', '--message=merge: 摘要']).message).toBe('merge: 摘要');
  });

  it('标志位 --no-sync / --no-cleanup', () => {
    expect(parseArgs(['docs/x', '--no-sync', '--no-cleanup']))
      .toEqual({ branch: 'docs/x', message: null, noSync: true, noCleanup: true });
  });

  it('--message 在分支名前也能正确取分支', () => {
    const a = parseArgs(['--message', 'merge: 摘要', 'docs/x']);
    expect(a.branch).toBe('docs/x');
    expect(a.message).toBe('merge: 摘要');
  });

  it('空参数 → 全空', () => {
    expect(parseArgs([])).toEqual({ branch: null, message: null, noSync: false, noCleanup: false });
  });
});
