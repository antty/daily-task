# iPad 使用亲子协议实施计划

> **执行要求：** 实施本计划时必须使用 `superpowers:executing-plans`，逐项完成并在每个测试门禁后复核。所有步骤使用复选框跟踪。

**目标：** 在 iPad 使用管理页增加无障碍协议图标入口，并以适配桌面和手机的只读弹窗展示已确认的亲子协议。

**架构：** 协议正文作为静态语义化 HTML 放在 `index.html`，避免读取 store 或引入新的数据状态；`src/app.js` 只负责打开原生 `dialog`，现有通用关闭机制负责关闭。视觉规则集中放入 `ipad-layout.css`，复用全局弹窗系统，并通过 `tests/ui-structure.test.js` 锁定内容、交互、响应式布局和统一缓存版本。

**技术栈：** 原生 HTML、CSS、ES Module、原生 `dialog`、Node.js `node:test`。

## 全局约束

- 保持原生 HTML、CSS 和 ES Module 架构，不引入第三方依赖。
- 协议为静态只读内容，不读取或修改 iPad store，不新增网络请求。
- 不新增 Supabase 表、RPC、RLS、Storage、本地缓存键或数据库迁移。
- 协议入口与关闭按钮的触控区域不得小于 44×44px。
- 桌面弹窗最大宽度为 680px；375px 竖屏和 700×375 横屏不得横向溢出。
- 正常超时区间为 1–60、61–120、超过 120 分钟。
- 未经允许使用区间为 1–9、10–60、61–120、超过 120 分钟；1–9 分钟只提醒。
- 所有正式前端资源使用统一缓存版本 `20260730-ipad-agreement`。
- 不推送、不部署，也不执行生产数据库操作。

---

### 任务 1：建立任务追踪和协议结构回归测试

**文件：**
- 新建：`tasks/TASK-20260730-ipad-parent-child-agreement.md`
- 修改：`tests/ui-structure.test.js`

**接口：**
- 输入：`index.html` 中的协议按钮与弹窗结构、`src/app.js` 中的打开事件。
- 输出：测试名称 `ipad page exposes the approved static parent-child agreement`，供后续任务作为红绿门禁。

- [ ] **步骤 1：创建验收映射任务文档**

```markdown
# TASK-20260730: iPad 使用亲子协议

## Status

In Progress

## Source Specification

- `specs/features/ipad-parent-child-agreement.md`

## Objective

在 iPad 使用管理页提供可访问的协议入口，以只读弹窗完整展示用户确认的亲子协议。

## Scope

- 修改 `index.html`、`src/app.js`、`ipad-layout.css`、`tests/ui-structure.test.js` 和统一缓存版本。
- 新增静态协议展示，不读取或修改 iPad 数据。
- 不涉及数据库、认证、同步、额度计算和处罚自动执行。

## Acceptance Mapping

| 验收标准 | 实现 | 验证 |
| --- | --- | --- |
| AC-1、AC-2 | 协议图标、原生 dialog 和完整静态正文 | 协议结构测试、浏览器点击验证 |
| AC-3、AC-4、AC-5 | 两张语义表格和计算说明 | 协议内容契约测试 |
| AC-6 | 只读打开事件和通用关闭机制 | 交互契约测试、Escape 手动验证 |
| AC-7 | iPad 专属响应式弹窗样式 | CSS 契约测试、三种视口验证 |
| AC-8 | 统一缓存版本和完整回归 | 缓存测试、`node --test` |
```

- [ ] **步骤 2：在 `tests/ui-structure.test.js` 写入失败的协议结构测试**

```js
test('ipad page exposes the approved static parent-child agreement', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const agreement = html.match(/<dialog id="ipad-agreement-dialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  const agreementRules = agreement.match(/<ol>[\s\S]*?<\/ol>/)?.[0] || '';

  assert.match(html, /id="open-ipad-agreement"[^>]*aria-label="查看 iPad 使用协议"[\s\S]*?<svg[^>]*aria-hidden="true"/);
  assert.match(agreement, /<h2>每日 iPad 使用亲子协议<\/h2>/);
  assert.match(agreement, /为了让 iPad 成为学习和娱乐的好帮手/);
  assert.equal((agreementRules.match(/<li>/g) || []).length, 5);
  assert.match(agreement, /正常使用超时处理规则/);
  assert.match(agreement, /未经允许使用的处罚规则/);
  assert.match(agreement, /1–60 分钟/);
  assert.match(agreement, /61–120 分钟/);
  assert.match(agreement, /1–9 分钟/);
  assert.match(agreement, /10–60 分钟/);
  assert.match(agreement, /不记录违规次数/);
  assert.match(agreement, /iPad 系统记录的当日使用总时长 − 习惯养成系统当日登记的使用时长/);
  assert.match(agreement, /计算结果小于 0，则按 0 分钟计算/);
  assert.doesNotMatch(agreement, /暂停使用 iPad 3 天/);
  assert.match(app, /\$\('#open-ipad-agreement'\)\.onclick = \(\) => \$\('#ipad-agreement-dialog'\)\.showModal\(\)/);
  assert.doesNotMatch(app, /open-ipad-agreement[\s\S]{0,240}getIpadState/);
});
```

- [ ] **步骤 3：运行聚焦测试并确认失败**

运行：

```bash
node --test --test-name-pattern='approved static parent-child agreement' tests/ui-structure.test.js
```

预期：失败，指出 `open-ipad-agreement` 或 `ipad-agreement-dialog` 尚不存在。

- [ ] **步骤 4：提交测试与任务追踪**

```bash
git add tasks/TASK-20260730-ipad-parent-child-agreement.md tests/ui-structure.test.js
git commit -m "test: define ipad agreement contract"
```

---

### 任务 2：实现协议入口、静态正文和打开交互

**文件：**
- 修改：`index.html:35-46`
- 修改：`index.html:56-65`
- 修改：`src/app.js:101-112`
- 测试：`tests/ui-structure.test.js`

**接口：**
- 输入：按钮 ID `open-ipad-agreement`。
- 输出：弹窗 ID `ipad-agreement-dialog`；点击按钮调用 `showModal()`；关闭按钮继续使用 `[data-close-dialog]` 通用机制。

- [ ] **步骤 1：把 iPad 页标题栏改为三槽结构并增加协议图标**

```html
<div class="ipad-page-head">
  <button id="close-ipad-page" class="text-button ipad-mobile-back" aria-label="返回任务" title="返回任务"><span aria-hidden="true">←</span></button>
  <div class="ipad-page-title"><h2>iPad 使用管理</h2></div>
  <button id="open-ipad-agreement" class="text-button ipad-agreement-entry" aria-label="查看 iPad 使用协议" title="查看使用协议">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 3.75h7.5L18 7.25V20.25H7z"></path>
      <path d="M14.5 3.75v3.5H18M9.75 11h5.5M9.75 14.5h5.5"></path>
    </svg>
  </button>
</div>
```

- [ ] **步骤 2：在现有 iPad 弹窗组中加入只读协议弹窗**

```html
<dialog id="ipad-agreement-dialog" class="manager-dialog ipad-agreement-dialog">
  <div class="dialog-head">
    <div><p class="eyebrow">家庭约定</p><h2>每日 iPad 使用亲子协议</h2></div>
    <button class="text-button dialog-close-icon" data-close-dialog="ipad-agreement-dialog" aria-label="关闭协议"><span aria-hidden="true">×</span></button>
  </div>
  <article class="dialog-body ipad-agreement-content">
    <p class="ipad-agreement-lead">为了让 iPad 成为学习和娱乐的好帮手，也为了保护眼睛、保证作息、培养自律和健康习惯，我们一起订立以下约定。</p>
    <section>
      <h3>使用约定</h3>
      <ol>
        <li>iPad 平时由家长保管，小朋友不能自行取用。</li>
        <li>每次使用 iPad，必须在吃完饭 30 分钟后才能开始。</li>
        <li>每次开始使用 iPad 时，需要在系统中登记开始时间。</li>
        <li>到达约定使用时间后，小朋友应主动停止使用，并将 iPad 交还给家长。</li>
        <li>如果当日累计计入时长超过约定时间，则按照以下规则处理。</li>
      </ol>
    </section>
    <section>
      <h3>正常使用超时处理规则</h3>
      <table class="ipad-agreement-table">
        <thead><tr><th scope="col">超时时长</th><th scope="col">处理方式</th></tr></thead>
        <tbody>
          <tr><td>超时 1–60 分钟</td><td>记录违规 1 次；累计违规超过 3 次，暂停使用 1 天</td></tr>
          <tr><td>超时 61–120 分钟</td><td>暂停使用 2 天</td></tr>
          <tr><td>超时超过 120 分钟</td><td>暂停使用 1 周</td></tr>
        </tbody>
      </table>
    </section>
    <section>
      <h3>未经允许使用的处罚规则</h3>
      <p>未经家长允许使用 iPad 时，根据未经允许使用的时长进行阶梯处理。</p>
      <p class="ipad-agreement-formula"><strong>未经允许使用时长</strong><span>iPad 系统记录的当日使用总时长 − 习惯养成系统当日登记的使用时长</span></p>
      <p class="ipad-agreement-note">如果计算结果小于 0，则按 0 分钟计算。</p>
      <table class="ipad-agreement-table">
        <thead><tr><th scope="col">未经允许使用时长</th><th scope="col">处理方式</th></tr></thead>
        <tbody>
          <tr><td>1–9 分钟</td><td>进行提醒，不记录违规次数</td></tr>
          <tr><td>10–60 分钟</td><td>暂停使用 1 天</td></tr>
          <tr><td>61–120 分钟</td><td>暂停使用 2 天</td></tr>
          <tr><td>超过 120 分钟</td><td>暂停使用 1 周</td></tr>
        </tbody>
      </table>
    </section>
    <section>
      <h3>补充说明</h3>
      <ul>
        <li>家长应公平、稳定地保管和交接 iPad，并协助记录使用时间。</li>
        <li>如果遇到外出、假期或学习任务等特殊情况，可由家长和小朋友提前商量，临时调整。</li>
        <li>本协议不是为了惩罚，而是为了帮助小朋友学会安排时间、遵守约定和保护身体。</li>
      </ul>
    </section>
  </article>
</dialog>
```

- [ ] **步骤 3：增加纯展示打开事件**

```js
$('#open-ipad-agreement').onclick = () => $('#ipad-agreement-dialog').showModal();
```

- [ ] **步骤 4：运行聚焦测试并确认通过**

运行：

```bash
node --test --test-name-pattern='approved static parent-child agreement' tests/ui-structure.test.js
```

预期：通过；协议入口、正文、规则边界和无 store 读取契约全部满足。

- [ ] **步骤 5：提交结构与交互**

```bash
git add index.html src/app.js tests/ui-structure.test.js
git commit -m "feat: add ipad parent-child agreement"
```

---

### 任务 3：实现弹窗视觉、响应式排版和无障碍触控

**文件：**
- 修改：`tests/ui-structure.test.js`
- 修改：`ipad-layout.css`

**接口：**
- 输入：`.ipad-page-head`、`.ipad-agreement-entry`、`.ipad-agreement-dialog`、`.ipad-agreement-content`、`.ipad-agreement-table`。
- 输出：桌面 680px 阅读弹窗、手机底部 sheet、44px 图标、可换行公式与表格。

- [ ] **步骤 1：写入失败的视觉契约测试**

```js
test('ipad agreement uses a balanced header and responsive reading dialog', async () => {
  const css = await readFile(new URL('../ipad-layout.css', import.meta.url), 'utf8');

  assert.match(css, /\.ipad-page-head\s*\{[^}]*display:\s*grid[^}]*align-items:\s*center/);
  assert.match(css, /\.ipad-agreement-entry\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/);
  assert.match(css, /\.ipad-agreement-dialog\s*\{[^}]*--dialog-width:\s*680px[^}]*overflow:\s*hidden/);
  assert.match(css, /\.ipad-agreement-content\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.ipad-agreement-table\s*\{[^}]*width:\s*100%[^}]*table-layout:\s*fixed/);
  assert.match(css, /\.ipad-agreement-formula\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.ipad-page-head\s*\{[^}]*grid-template-columns:\s*44px minmax\(0,\s*1fr\) 44px/);
});
```

- [ ] **步骤 2：运行视觉契约并确认失败**

运行：

```bash
node --test --test-name-pattern='responsive reading dialog' tests/ui-structure.test.js
```

预期：失败，指出协议专属选择器尚不存在。

- [ ] **步骤 3：在 `ipad-layout.css` 增加标题栏和协议弹窗样式**

```css
.ipad-page-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
}

.ipad-page-title { min-width: 0; grid-column: 1; }

.ipad-agreement-entry {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  color: var(--color-primary);
  grid-column: 2;
}

.ipad-agreement-entry svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ipad-agreement-dialog {
  --dialog-width: 680px;
  overflow: hidden;
}

.ipad-agreement-dialog > .dialog-head {
  position: sticky;
  top: 0;
  z-index: 1;
}

.ipad-agreement-content {
  max-height: calc(88dvh - 82px);
  overflow-y: auto;
  overscroll-behavior: contain;
  line-height: 1.75;
}

.ipad-agreement-content section { display: grid; gap: 10px; }
.ipad-agreement-content h3 { margin: 6px 0 0; font-size: 16px; }
.ipad-agreement-content p { margin: 0; color: var(--color-muted); }
.ipad-agreement-content ol,
.ipad-agreement-content ul { display: grid; gap: 8px; margin: 0; padding-left: 1.4em; }
.ipad-agreement-lead { padding: 14px 16px; border-radius: 14px; background: var(--color-surface-soft); }

.ipad-agreement-formula {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-left: 3px solid var(--color-primary);
  border-radius: 0 12px 12px 0;
  background: #f6f1fc;
  overflow-wrap: anywhere;
}

.ipad-agreement-formula strong { color: var(--color-primary-strong); }
.ipad-agreement-note { font-size: 12px; }

.ipad-agreement-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  font-size: 13px;
}

.ipad-agreement-table th,
.ipad-agreement-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.ipad-agreement-table th { background: var(--color-surface-soft); color: var(--color-muted); }
.ipad-agreement-table th:first-child,
.ipad-agreement-table td:first-child { width: 34%; }
.ipad-agreement-table tr:last-child td { border-bottom: 0; }

@media (max-width: 760px) {
  .ipad-page-head { grid-template-columns: 44px minmax(0, 1fr) 44px; }
  .ipad-page-title { text-align: center; }
  .ipad-agreement-entry { grid-column: 3; }
  .ipad-page-head::after { display: none; }
}

@media (max-width: 600px) {
  .ipad-agreement-content { max-height: calc(100dvh - 106px - env(safe-area-inset-bottom)); }
  .ipad-agreement-table th,
  .ipad-agreement-table td { padding: 9px 8px; font-size: 12px; }
  .ipad-agreement-table th:first-child,
  .ipad-agreement-table td:first-child { width: 38%; }
}
```

- [ ] **步骤 4：运行协议结构与视觉测试**

运行：

```bash
node --test --test-name-pattern='parent-child agreement|responsive reading dialog' tests/ui-structure.test.js
```

预期：两项测试通过。

- [ ] **步骤 5：提交视觉实现**

```bash
git add ipad-layout.css tests/ui-structure.test.js
git commit -m "style: polish ipad agreement dialog"
```

---

### 任务 4：更新缓存版本、变更记录并完成回归验证

**文件：**
- 修改：`index.html`
- 修改：`src/app.js`
- 修改：`tests/ui-structure.test.js`
- 修改：`tasks/TASK-20260730-ipad-parent-child-agreement.md`
- 修改：`docs/changelog.md`

**接口：**
- 输入：当前缓存版本 `20260720-family-rpc`。
- 输出：所有正式前端资源统一使用 `20260730-ipad-agreement`。

- [ ] **步骤 1：先把缓存契约预期改为新版本**

将三个硬编码缓存断言和统一版本断言中的预期值改为：

```js
'20260730-ipad-agreement'
```

- [ ] **步骤 2：运行缓存测试并确认失败**

运行：

```bash
node --test --test-name-pattern='release version|frontend assets|lavender refresh' tests/ui-structure.test.js
```

预期：失败，实际值仍为 `20260720-family-rpc`。

- [ ] **步骤 3：统一更新正式资源版本**

把 `index.html` 中全部正式 CSS、`src/app.js` 引用，以及 `src/app.js` 中 `supabase-store.js` 的查询参数统一替换为：

```text
20260730-ipad-agreement
```

- [ ] **步骤 4：更新变更记录和任务状态**

在 `docs/changelog.md` 的 `Unreleased / Added` 中增加：

```markdown
- iPad 使用管理页新增亲子协议图标入口和响应式只读协议弹窗。
```

把 `tasks/TASK-20260730-ipad-parent-child-agreement.md` 的状态改为 `Done`，并补充：

```markdown
## Completion Evidence

- Commands and results: 协议聚焦测试、`node --test`、`node --check src/app.js` 和 `git diff --check` 全部通过。
- Manual verification: 桌面、375×700 和 700×375 视口下入口、滚动、表格、关闭按钮和 Escape 均正常。
- Remaining risks: 协议只展示处罚规则，不自动读取系统屏幕使用时间或执行处罚。
```

- [ ] **步骤 5：运行聚焦测试、语法检查和完整测试**

运行：

```bash
node --test --test-name-pattern='parent-child agreement|responsive reading dialog|release version|frontend assets|lavender refresh' tests/ui-structure.test.js
node --check src/app.js
node --test
git diff --check
```

预期：全部退出码为 0。

- [ ] **步骤 6：启动本地页面并进行三视口人工验证**

运行：

```bash
python3 -m http.server 4178
```

验证：

1. 桌面宽屏：协议图标位于 iPad 标题右侧，点击打开 680px 内的阅读弹窗。
2. 375×700：返回、标题、协议入口三列平衡；正文纵向滚动；两张表格和公式不横向溢出。
3. 700×375：弹窗高度受限且标题、关闭按钮可见。
4. 鼠标、键盘焦点和 Escape 均可正确打开或关闭协议。
5. 打开和关闭协议前后，额度、记录、当前成员和日历选择均不变化。

- [ ] **步骤 7：审查最终差异并提交**

```bash
git status --short
git diff -- index.html src/app.js ipad-layout.css tests/ui-structure.test.js tasks/TASK-20260730-ipad-parent-child-agreement.md docs/changelog.md
git add index.html src/app.js ipad-layout.css tests/ui-structure.test.js tasks/TASK-20260730-ipad-parent-child-agreement.md docs/changelog.md
git commit -m "chore: finalize ipad agreement release"
```

## 规格覆盖自检

- AC-1、AC-2：任务 1 和任务 2。
- AC-3、AC-4、AC-5：任务 1、任务 2。
- AC-6：任务 2 和任务 4。
- AC-7：任务 3 和任务 4。
- AC-8：任务 4。
- 没有数据库、安全、同步或领域逻辑变更。
- 没有未定义的接口、占位实现或未覆盖的验收标准。
