# 温柔薰衣草全项目 UI 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不修改业务与 Supabase 数据逻辑的前提下，统一首页、任务管理、iPad 使用管理、全部弹窗与移动端的温柔薰衣草视觉和交互规范。

**Architecture:** 以 `styles.css` 的语义令牌作为视觉单一来源，由 `extras-3.css` 承担首页、任务与弹窗组件，由 `ipad.css` 和 `ipad-layout.css` 承担 iPad 页面。保留现有 DOM id 与 Store API，仅添加语义结构类、SVG 图标、可见表单标签、密码显示切换和提交状态。

**Tech Stack:** 原生 HTML、CSS、JavaScript ES Modules、Node 内置测试、Supabase Store（只读现有接口）

## Global Constraints

- 不修改任务、家庭、iPad 使用规则和 Supabase schema/RPC。
- 不增加 UI 框架、图标依赖、远程字体或构建工具。
- 页面内容最大宽度 1240px；卡片圆角 20–22px；控件圆角 12–14px。
- 所有交互目标至少 44×44px，间距至少 8px。
- 微交互 150–240ms，并支持 `prefers-reduced-motion`。
- 手机基准视口 375px；同时检查 768px、1024px、1440px。
- 所有静态资源使用同一个新缓存版本号。
- 保留主目录现有未跟踪的 2026-07-15 设计与计划文档，不纳入提交。

---

### Task 1: 建立视觉令牌与回归测试

**Files:**
- Modify: `tests/ui-structure.test.js`
- Modify: `styles.css`
- Modify: `interaction.css`

**Interfaces:**
- Consumes: 现有 CSS 入口与 Node 文本结构测试。
- Produces: `--color-primary`、`--color-background`、`--color-success`、`--color-warning`、`--color-danger`、`--control-height`、圆角、阴影和动效令牌。

- [ ] **Step 1: 写失败测试**

在 `tests/ui-structure.test.js` 添加：

```js
test('lavender design tokens and accessible motion rules are present', async () => {
  const base = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const interaction = await readFile(new URL('../interaction.css', import.meta.url), 'utf8');
  assert.match(base, /--color-primary:\s*#6d55a6/i);
  assert.match(base, /--color-background:\s*#f7f4fb/i);
  assert.match(base, /--control-height:\s*44px/i);
  assert.match(interaction, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(interaction, /:focus-visible/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern="lavender design tokens" tests/ui-structure.test.js`

Expected: FAIL，缺少新的语义令牌或减少动效规则。

- [ ] **Step 3: 实现令牌与基础交互**

将 `styles.css` 的 `:root` 收敛为：

```css
:root {
  --color-primary: #6d55a6;
  --color-primary-strong: #55408f;
  --color-background: #f7f4fb;
  --color-surface: #ffffff;
  --color-surface-soft: #f2edf8;
  --color-foreground: #292330;
  --color-muted: #746a7d;
  --color-border: #e7deed;
  --color-success: #347a58;
  --color-warning: #a96121;
  --color-danger: #b33e4d;
  --control-height: 44px;
  --radius-control: 13px;
  --radius-card: 22px;
  --shadow-card: 0 10px 30px rgb(43 22 48 / 6%);
  --shadow-dialog: 0 30px 90px rgb(27 18 35 / 30%);
  --motion-fast: 160ms;
  --motion-base: 220ms;
}
```

在 `interaction.css` 为按钮、输入和可点击元素统一 44px 高度、焦点与减少动效：

```css
:where(button, input, select, textarea):focus-visible {
  outline: 3px solid rgb(138 114 186 / 30%);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
```

- [ ] **Step 4: 运行测试**

Run: `node --test --test-name-pattern="lavender design tokens" tests/ui-structure.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add styles.css interaction.css tests/ui-structure.test.js
git commit -m "style: establish lavender design tokens"
```

### Task 2: 优化首页、导航图标与任务卡片

**Files:**
- Modify: `index.html`
- Modify: `extras-3.css`
- Modify: `styles.css`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: Task 1 视觉令牌、现有 `#member-avatar`、`#daily-motivation`、`#calendar-grid`、`#task-list`。
- Produces: `.app-icon` SVG 图标、稳定三列 `.home-bar`、双栏 `.home-layout` 和视觉统一的任务行。

- [ ] **Step 1: 写失败测试**

```js
test('home navigation uses accessible svg icons and responsive hierarchy', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  assert.match(html, /id="open-ipad-manager"[\s\S]*?<svg[^>]*aria-hidden="true"/);
  assert.match(html, /id="open-manage"[\s\S]*?<svg[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /<span aria-hidden="true">(?:◷|⇄|☷)<\/span>/);
  assert.match(css, /\.home-bar\s*\{[^}]*grid-template-columns:/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.home-layout\s*\{[^}]*grid-template-columns:\s*1fr/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern="home navigation uses" tests/ui-structure.test.js`

Expected: FAIL，仍使用字符图标或缺少新布局规则。

- [ ] **Step 3: 改造 HTML 与 CSS**

将三个顶部入口替换为同一 20×20 viewBox 的线性 SVG，按钮保留原 id、`aria-label` 和 `title`。使用以下结构规范：

```html
<button id="open-manage" class="text-button icon-entry" aria-label="管理任务" title="管理任务">
  <svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
</button>
```

在 `extras-3.css` 设置桌面顶部三列、手机激励文案独占下一行；任务卡片使用次级表面，完成按钮不缩小，任务标题可聚焦：

```css
.home-bar { display:grid; grid-template-columns:auto minmax(220px,1fr) auto; gap:16px; align-items:center; }
.app-icon { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; }
.task { border:0; border-radius:14px; background:var(--color-surface-soft); padding:12px; }
```

- [ ] **Step 4: 运行结构测试与全套测试**

Run: `node --test --test-name-pattern="home navigation uses" tests/ui-structure.test.js && node --test`

Expected: 所有测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add index.html styles.css extras-3.css tests/ui-structure.test.js
git commit -m "style: refine home calendar and task hierarchy"
```

### Task 3: 统一全部弹窗与表单结构

**Files:**
- Modify: `index.html`
- Modify: `extras.css`
- Modify: `extras-3.css`
- Modify: `interaction.css`
- Modify: `src/app.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: 现有 `<dialog>` id、`data-close-dialog`、各表单 name 和提交事件。
- Produces: `.dialog-shell`、`.dialog-head`、`.dialog-body`、`.dialog-footer`、`.field-label`、`[data-password-toggle]`。

- [ ] **Step 1: 写失败测试**

```js
test('dialogs share labeled fields, accessible close controls, and mobile sheets', async () => {
  const css = await readFile(new URL('../extras-3.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /class="[^"]*dialog-body/);
  assert.match(html, /class="[^"]*dialog-footer/);
  assert.match(html, /data-password-toggle/);
  assert.match(app, /\[data-password-toggle\]/);
  assert.match(css, /\.manager-dialog::backdrop\s*\{[^}]*rgba\(35,\s*28,\s*42,\s*\.52\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.manager-dialog\s*\{[^}]*margin-top:\s*auto/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern="dialogs share" tests/ui-structure.test.js`

Expected: FAIL，缺少统一弹窗段落和密码切换。

- [ ] **Step 3: 重构弹窗标记但保留 id/name**

为每个弹窗增加四段式类；将占位符承担标签的输入改为可见标签。密码字段结构：

```html
<label class="form-field">
  <span class="field-label">管理密码</span>
  <span class="password-field">
    <input name="password" type="password" inputmode="numeric" autocomplete="current-password" required>
    <button type="button" class="password-toggle" data-password-toggle aria-label="显示密码">显示</button>
  </span>
</label>
```

关闭图标统一为 44×44px SVG，危险按钮置于底部操作区并与取消按钮拉开。

- [ ] **Step 4: 添加密码显示切换**

在 `src/app.js` 注册：

```js
document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = button.closest('.password-field').querySelector('input');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.textContent = showing ? '显示' : '隐藏';
    button.setAttribute('aria-label', showing ? '显示密码' : '隐藏密码');
  });
});
```

- [ ] **Step 5: 实现统一弹窗与手机底部弹层 CSS**

```css
.manager-dialog { width:min(600px,calc(100vw - 32px)); padding:0; border:1px solid rgb(255 255 255 / 80%); }
.dialog-head,.dialog-body,.dialog-footer { padding-inline:24px; }
.dialog-footer { display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--color-border); }
.manager-dialog::backdrop { background:rgba(35,28,42,.52); backdrop-filter:blur(3px); }
@media (max-width:600px) {
  .manager-dialog { margin:auto 12px 12px; width:calc(100vw - 24px); max-height:calc(100dvh - 24px); }
}
```

- [ ] **Step 6: 验证**

Run: `node --test --test-name-pattern="dialogs share" tests/ui-structure.test.js && node --check src/app.js && node --test`

Expected: 所有测试 PASS。

- [ ] **Step 7: 提交**

```bash
git add index.html extras.css extras-3.css interaction.css src/app.js tests/ui-structure.test.js
git commit -m "style: unify dialogs and form interactions"
```

### Task 4: 重构 iPad 使用管理视觉层级

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `ipad.css`
- Modify: `ipad-layout.css`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `renderIpad()` 的 limit、summary、entries、types 与现有计时器数据属性。
- Produces: 四项 `.ipad-metric` 概览、`.ipad-page-actions`、稳定 `.ipad-record` 与完整七列手机月历。

- [ ] **Step 1: 写失败测试**

```js
test('ipad page exposes metric cards and a complete mobile calendar', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');
  assert.match(app, /ipad-metric/);
  assert.match(app, /今日记录/);
  assert.match(css, /\.ipad-content-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.25fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.ipad-calendar-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7,\s*1fr\)/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern="ipad page exposes" tests/ui-structure.test.js`

Expected: FAIL，概览仍为内联文字或手机月历列数不正确。

- [ ] **Step 3: 更新 iPad 页面和渲染标记**

将 `#ipad-summary` 渲染为：

```js
summaryElement.innerHTML = !summary ? '' : `
  <div class="ipad-metric"><span>${dateQuotaLabel}</span><strong>${summary.limitMinutes} 分钟</strong></div>
  <div class="ipad-metric"><span>已使用</span><strong>${summary.usedMinutes} 分钟</strong></div>
  <div class="ipad-metric ${summary.isOvertime ? 'is-danger' : ''}"><span>${summary.isOvertime ? '已超时' : '剩余'}</span><strong>${summary.isOvertime ? summary.overtimeMinutes : summary.remainingMinutes} 分钟</strong></div>
  <div class="ipad-metric"><span>今日记录</span><strong>${entries.length} 次</strong></div>`;
```

保留所有现有 data 属性和计时器局部刷新逻辑。

- [ ] **Step 4: 实现桌面与手机布局**

桌面记录/月历为 1.25fr / .75fr；手机单列并将完整七列日历置于记录前。计时器使用 `font-variant-numeric: tabular-nums` 和固定最小宽度。

- [ ] **Step 5: 验证**

Run: `node --test --test-name-pattern="ipad page exposes" tests/ui-structure.test.js && node --check src/app.js && node --test`

Expected: 所有测试 PASS。

- [ ] **Step 6: 提交**

```bash
git add index.html src/app.js ipad.css ipad-layout.css tests/ui-structure.test.js
git commit -m "style: clarify ipad usage workspace"
```

### Task 5: 缓存版本、响应式与视觉验收

**Files:**
- Modify: `index.html`
- Modify: `tests/ui-structure.test.js`
- Verify: `styles.css`, `extras.css`, `extras-3.css`, `interaction.css`, `ipad.css`, `ipad-layout.css`, `src/app.js`

**Interfaces:**
- Consumes: Tasks 1–4 的完整页面与组件。
- Produces: 统一新缓存版本和验证证据。

- [ ] **Step 1: 写缓存与移动端失败测试**

```js
test('lavender refresh uses one cache version and safe mobile widths', async () => {
  const versions = [...html.matchAll(/\?v=([\w-]+)/g)].map((match) => match[1]);
  assert.equal(new Set(versions).size, 1);
  assert.match(versions[0], /^20260717-lavender-ui$/);
  const css = await Promise.all(['styles.css','extras-3.css','ipad-layout.css'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.ok(css.every((source) => !/width:\s*100vw/.test(source)));
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern="lavender refresh uses" tests/ui-structure.test.js`

Expected: FAIL，仍是旧缓存版本。

- [ ] **Step 3: 更新全部静态资源版本**

将 `index.html` 中 6 个 CSS 与 `src/app.js` 的查询参数统一为 `?v=20260717-lavender-ui`。

- [ ] **Step 4: 运行自动验证**

Run: `node --test && node --check src/app.js && node --check src/management-password.js && git diff --check`

Expected: 全部 PASS，命令退出码 0。

- [ ] **Step 5: 启动本地测试页并进行视觉验证**

Run: `python3 -m http.server 4176`

检查清单：

- 1440×900：首页双栏对齐；顶部成员、激励和图标同一视觉轴。
- 768×1024：首页与 iPad 页面无横向滚动，按钮目标不缩小。
- 375×812：首页完整日历、任务列表、弹窗底部安全边距可见。
- 添加任务弹窗不全屏；密码、成员、类型、完成和删除弹窗共享层级。
- iPad 页手机端有返回按钮、完整七列日历、额度概览和稳定计时器。
- 键盘 Tab 可聚焦所有按钮；关闭按钮名称可读；减少动效模式不播放位移动画。

- [ ] **Step 6: 根据视觉检查只修复验收问题并复测**

每项修复后运行：`node --test && git diff --check`。

- [ ] **Step 7: 提交**

```bash
git add index.html styles.css extras.css extras-3.css interaction.css ipad.css ipad-layout.css src/app.js tests/ui-structure.test.js
git commit -m "test: verify responsive lavender ui refresh"
```

### Task 6: 最终分支验证与交付

**Files:**
- Verify: all tracked files changed by Tasks 1–5

**Interfaces:**
- Consumes: 完成的功能分支。
- Produces: 可供用户决定合并、PR 或保留的验证分支。

- [ ] **Step 1: 执行完整验证**

Run: `node --test && node --check src/app.js && node --check src/management-password.js && git diff --check && git status --short`

Expected: 测试零失败、语法与差异检查退出码 0；只允许保留用户已有的两份未跟踪 2026-07-15 文档。

- [ ] **Step 2: 核对提交范围**

Run: `git diff main...HEAD --stat && git log --oneline main..HEAD`

Expected: 只包含设计系统、设计说明、实施计划和 UI 优化相关代码/测试。

- [ ] **Step 3: 交付选择**

保持 `codex/ui-refresh-lavender` 分支，不自动合并或推送；向用户提供本地合并、创建 PR、保留分支或放弃四个选项。

