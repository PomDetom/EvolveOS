# 任务简报 1：色温滑杆映射（color.temperature 补视觉消费者）

**需求来源**：计划书「后续计划项 A」— 定制器色彩组已有 `temperature` 滑杆（RANGES [-1, 1, 0.05]），但 `color.temperature` 无视觉消费者，拖动无可见效果。

**目标**：`color.temperature`（-1 冷 → 1 暖）映射到**中性色阶的冷暖偏移** — 拖动色温滑杆，全局中性色（面板背景/文字灰阶/边框）明显变冷或变暖，实时生效。

## 实施规格

### 1. tokens.css：中性色阶参数化

- 当前 `--neutral-50..950` 是固定 hex 值（11 级）。改为 HSL 参数化：`hsl(var(--neutral-hue) <sat>% <light>%)`。
- `:root` 新增 `--neutral-hue: 235;`（默认冷调 — 与当前视觉一致，基线不变）。
- 每级的 sat/light 由原 hex 转换得出，**保持当前视觉等效**。逐级转换（示例）：
  - `#f7f8fa` → `hsl(var(--neutral-hue) 14% 97%)`
  - 其余各级同样转换（hue 统一走变量，低饱和下与原色相视觉无差；sat/light 取原值）。
- 注意：全仓所有 `--neutral-*` 消费方（themes.css 的 --text-*、--surface-*、badge default、switch 轨道等）经变量自动跟随，**不需要改消费方**。

### 2. apply.js：温度 → 色相映射

- 导出纯函数 `temperatureToHue(t)`：
  - `t <= 0`：`235 + 25 * t`（t=-1 → 210，更冷偏蓝）
  - `t > 0`：`235 - 195 * t`（t=1 → 40，暖橙灰）
  - `Math.round` 后返回整数
- `applyConfig` 追加：`temperature === 0` → `root.style.removeProperty('--neutral-hue')`（默认态无覆盖，基线不变）；否则写 `--neutral-hue: <映射值>`。

### 3. 测试

**单测**（tests/unit/apply.test.js 追加）：
- `temperatureToHue(-1) === 210`、`temperatureToHue(0) === 235`、`temperatureToHue(0.5) === 138`（235-97.5=137.5 → round 138）、`temperatureToHue(1) === 40`
- `temperature: 0` 时不写 `--neutral-hue`（inline 为空）
- `temperature: 0.5` 时写 `--neutral-hue: 138`

**e2e**（tests/e2e/customizer.spec.js 追加）：
- 打开定制器 → 色温滑杆 `fill('1')` → `getComputedStyle(document.documentElement).getPropertyValue('--neutral-hue').trim() === '40'`
- 重置后 `--neutral-hue` 为空（恢复默认）

### 4. 提交

`feat: 色温滑杆映射（中性色冷暖偏移）`

## 约束

- 默认态（temperature=0）零覆盖 — **36 张视觉基线不得变化**；如运行全量 e2e 有基线失败，先确认是否由本任务引入（不应有），再决定重生成。
- 动画红线、令牌引用规则不变；不改定制器 UI（滑杆已存在，自动生效）。
- 文案中文。
