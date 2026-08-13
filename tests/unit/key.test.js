import { describe, it, expect } from 'vitest';
import {
  VAULT_PATH_KEY, REMEMBER_PATH_KEY,
  escapeHtml, matchesQuery, matchesAnyTag, filterEntries,
  allTags, sortByName, splitTags, isRememberPathEnabled,
} from '../../src/apps/key/key-utils.js';

const gh = { id: '1', name: 'GitHub', url: 'https://github.com', username: 'alice', password: 'p1', notes: null, tags: ['work', 'dev'], created_at: 1000, updated_at: 1000 };
const em = { id: '2', name: 'Email', url: 'https://mail.example.com', username: 'a@x.com', password: 'p2', notes: null, tags: ['personal'], created_at: 1000, updated_at: 2000 };

describe('key-utils', () => {
  it('escapeHtml：转义 HTML 特殊字符', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a"b\'c&d')).toBe('a&quot;b&#39;c&amp;d');
    expect(escapeHtml(null)).toBe('');
  });

  it('matchesQuery：大小写不敏感匹配名称/网址/用户名', () => {
    expect(matchesQuery(gh, 'github')).toBe(true);
    expect(matchesQuery(gh, 'GITHUB')).toBe(true);
    expect(matchesQuery(gh, 'github.com')).toBe(true);
    expect(matchesQuery(gh, 'alice')).toBe(true);
    expect(matchesQuery(gh, 'nope')).toBe(false);
    expect(matchesQuery(gh, '')).toBe(true);
  });

  it('matchesAnyTag：任一标签命中；空筛选为真', () => {
    expect(matchesAnyTag(gh, ['work'])).toBe(true);
    expect(matchesAnyTag(gh, ['dev', 'personal'])).toBe(true);
    expect(matchesAnyTag(gh, ['personal'])).toBe(false);
    expect(matchesAnyTag(gh, [])).toBe(true);
  });

  it('filterEntries：query 与 tags 组合（AND）', () => {
    expect(filterEntries([gh, em], { query: '', activeTags: [] })).toHaveLength(2);
    expect(filterEntries([gh, em], { query: 'git', activeTags: [] })).toEqual([gh]);
    expect(filterEntries([gh, em], { query: '', activeTags: ['work'] })).toEqual([gh]);
    expect(filterEntries([gh, em], { query: 'git', activeTags: ['personal'] })).toEqual([]);
  });

  it('allTags：去重并排序', () => {
    expect(allTags([gh, em])).toEqual(['dev', 'personal', 'work']);
  });

  it('sortByName：按名称 zh locale 排序', () => {
    const sorted = sortByName([em, gh]);
    expect(sorted.map((e) => e.name)).toEqual(['Email', 'GitHub']);
    // 不原地修改
    expect([em, gh].map((e) => e.name)).toEqual(['Email', 'GitHub']);
  });

  it('splitTags：按中英文逗号拆分去空', () => {
    expect(splitTags('work, 邮箱，dev')).toEqual(['work', '邮箱', 'dev']);
    expect(splitTags('')).toEqual([]);
  });

  it('isRememberPathEnabled：默认开，显式 false 关', () => {
    localStorage.removeItem(REMEMBER_PATH_KEY);
    expect(isRememberPathEnabled()).toBe(true);
    localStorage.setItem(REMEMBER_PATH_KEY, 'false');
    expect(isRememberPathEnabled()).toBe(false);
    localStorage.removeItem(REMEMBER_PATH_KEY);
  });

  it('常量名', () => {
    expect(VAULT_PATH_KEY).toBe('pwm.vaultPath');
    expect(REMEMBER_PATH_KEY).toBe('pwm.rememberPath');
  });
});
