import { it, expect } from 'vitest';
import { resolveNav } from '../../src/config/nav.js';

const M = (id, order) => ({ id, name: id, icon: 'box', order, dir: [], render: () => '' });

it('resolveNav：hidden 过滤', () => {
  const all = [M('home', 0), M('a', 1), M('b', 2)];
  expect(resolveNav(all, { order: [], hidden: ['a'] }).map((m) => m.id)).toEqual(['home', 'b']);
});
it('resolveNav：空 order/hidden → 按 module.order', () => {
  const all = [M('home', 0), M('a', 1), M('b', 2)];
  expect(resolveNav(all, { order: [], hidden: [] }).map((m) => m.id)).toEqual(['home', 'a', 'b']);
});
it('resolveNav：nav.order 中的按列表位置优先，未列入的按 module.order 跟随', () => {
  const all = [M('home', 0), M('a', 1), M('b', 2), M('c', 3)];
  const nav = { order: ['c', 'a'], hidden: [] };
  expect(resolveNav(all, nav).map((m) => m.id)).toEqual(['c', 'a', 'home', 'b']);
});
it('resolveNav：默认 nav（undefined）等价空配置', () => {
  const all = [M('a', 1), M('b', 2)];
  expect(resolveNav(all, undefined).map((m) => m.id)).toEqual(['a', 'b']);
});
