# Task I1 实施报告：Tauri 壳搭建

**需求源**：`docs/superpowers/plans/2026-08-05-iteration.md` Task I1；配置权威 `docs/tauri-integration.md` §1

**状态**：完成 — `npx tauri dev` 编译通过并成功启动无边框透明窗口（标题 "UI Design System"，MainWindowHandle 有效）；浏览器 smoke e2e 通过

**提交**：`5035457`（`chore: Tauri 壳搭建（src-tauri + 配置 + scripts）`）；本报告随 docs 留痕提交

## 一、执行步骤摘要

| 步骤 | 命令 | 结果 |
|---|---|---|
| 1 | `npm install -D @tauri-apps/cli` | `@tauri-apps/cli@^2.11.4`（tauri-cli 2.11.4），0 漏洞 |
| 2 | `npx tauri init --app-name ui-design --window-title "UI Design System" --frontend-dist ../dist --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build"` | 无输出静默完成（非交互，全部参数已提供）；生成 src-tauri/ 四件套 + icons + capabilities + Cargo.lock |
| 3 | 手改 `tauri.conf.json` | 见第二节 |
| 4 | `npx tauri dev`（后台 + 轮询日志） | 编译 **3m59s**（361 crates，快于预期的 5-15 分钟，crate 缓存/网络良好）；`Running target\debug\app.exe`；进程存在（PID 26496）、窗口句柄 4459056、MainWindowTitle "UI Design System"、日志无 panic/error |
| 5 | `npx playwright test tests/e2e/smoke.spec.js` | **1 passed**（前端零改动，浏览器回归不受影响） |
| 6 | package.json scripts + `.taurignore` | 见第三节 |
| 7 | `git commit` | `5035457` |

CLI 参数实测与计划书完全一致（`--ci` 未用到，因为全部参数均已提供，无交互提示）。

**进程清理**：`taskkill //F //IM app.exe //T` 终止应用；vite（PID 27868，监听 5173）单独按端口定位终止；`wmic` 复核无残留 ui-design 相关 node 进程（未误杀其他项目进程）。

## 二、tauri.conf.json 最终内容

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "UI Design System",
  "version": "0.1.0",
  "identifier": "com.uidesign.system",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "UI Design System",
        "width": 880,
        "height": 560,
        "minWidth": 720,
        "minHeight": 480,
        "decorations": false,
        "transparent": true,
        "shadow": true
      }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
    "android": { "debugApplicationIdSuffix": ".debug" }
  }
}
```

与指南 §1.1 逐项对齐：`decorations:false` / `transparent:true` / `shadow:true` / 880×560 / minWidth 720 / minHeight 480 / `withGlobalTauri:true`。`productName` 取英文 "UI Design System"（中文 productName 在 Windows 打包路径有风险，中文由窗口 title 承担）；`identifier` 按计划书取 `com.uidesign.system`。其余（bundle.icon、csp:null、android debugApplicationIdSuffix）保持 `tauri init` 默认。

## 三、其他文件

- `src-tauri/Cargo.toml` — 默认生成（tauri 2.11.3 / tauri-build 2.6.3 / tauri-plugin-log 2 / serde / serde_json / log）；lib 名 `app_lib`。Rust 依赖仅官方 crate（符合全局约束）。
- `src-tauri/src/main.rs` + `lib.rs` — 默认生成，未改（lib.rs 仅注册 log 插件 debug 级）。
- `src-tauri/capabilities/default.json` — 默认 `core:default`，未改。
- `src-tauri/.gitignore` — 默认（`/target/`、`/gen/schemas`）；`Cargo.lock` 已提交。
- `package.json` — devDependencies 加 `@tauri-apps/cli@^2.11.4`；scripts 加 `tauri` / `tauri:dev` / `tauri:build`。
- `.taurignore`（新建）— 忽略 `node_modules` / `dist` / `tests` / `docs` / `.superpowers` / `.github`。

## 四、验证输出

- **编译**：`Finished dev profile [unoptimized + debuginfo] target(s) in 3m 59s`，无 error/warning。
- **启动**：`Running target\debug\app.exe`；日志全程无 panic/failed；Vite dev server（5173）ready in 1167ms，`curl` 200。
- **窗口**：`Get-Process app` → `MainWindowTitle = UI Design System`、`MainWindowHandle = 4459056`（非 0，窗口真实创建）。透明/无边框目检留给 I5 真机验收（本任务按计划书要求以「进程存在 + 无 panic」为准）。
- **回归**：smoke.spec.js 1 passed；前端零改动，未跑全量 e2e（按任务要求 smoke 即可）。

## 五、顾虑与备注

1. **`tauri dev` 进程树清理依赖手动 taskkill**：Windows 上停止后台任务不会自动杀 vite/app.exe 子树，需按进程名 + 监听端口分别终止（已执行，无残留）。后续 I2-I5 跑真机时注意同样清理。
2. **透明窗口已知平台行为**：Windows 上透明 + 无边框 resize 偶发黑边/闪烁、全屏时透明可能失效（指南 §1.2）— 本任务不处理，I5 真机验收时留意。
3. **`productName` 用英文**：计划书允许「中文或英文」二选一，取英文规避 Windows 打包路径/产物名编码风险；界面中文由 `title` 与前端承担。
4. **`tauri build`（release）未验证**：本任务验证范围为 `tauri dev`；release 编译与打包（NSIS/MSI）留待 I5 或后续需要发布时执行。首次 `tauri dev` 的 361 crate 已缓存，后续编译将明显加快。
5. **前端未动**：`src/` 零改动（`git status` 确认），符合「I2 才接线窗口控制」的边界。
