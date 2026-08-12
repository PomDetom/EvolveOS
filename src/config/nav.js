// 入口导航解析纯函数（0.1.2）：过滤隐藏 + 按 nav.order 排序。
// nav.order 中的 id 按其列表位置排；未列入的按 1000 + module.order 跟随（用户排序项优先）。
export function resolveNav(allModules, nav) {
  const hidden = new Set(nav?.hidden ?? []);
  const order = nav?.order ?? [];
  const visible = allModules.filter((m) => !hidden.has(m.id));
  const rank = (m) => {
    const i = order.indexOf(m.id);
    return i === -1 ? 1000 + (m.order ?? 99) : i;
  };
  return [...visible].sort((a, b) => rank(a) - rank(b));
}
