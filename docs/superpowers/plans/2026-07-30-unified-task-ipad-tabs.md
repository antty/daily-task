# 任务打卡与 iPad 使用同页 Tab 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将任务打卡和 iPad 使用管理整合为同页双 Tab，并完成桌面与手机端布局适配。

**架构：** 保留现有 `home-view`、`ipad-view` 和数据仓库契约，新增轻量 `activeWorkspace` 视图状态与集中式 `showWorkspace()`。新增专用 `workspace-tabs.css` 管理导航与响应式布局，避免继续堆叠在旧页面样式中。

**技术栈：** 原生 HTML、CSS、JavaScript ES Module、Node 内置测试运行器。

## 全局约束

- 不修改 Supabase、数据库、RLS、RPC 或领域计算。
- 不引入第三方依赖。
- 所有图标使用 SVG，图标按钮提供可访问名称。
- 触控区域不小于 44×44px。
- 正式静态资源使用同一缓存版本。
- 保留旧 `ipadMember` 查询参数兼容。

---

### 任务 1：建立同页导航契约

**文件：**
- 修改：`tests/ui-structure.test.js`

**接口：**
- 产生：对 `workspace-tabs`、`workspace-tab-tasks`、`workspace-tab-ipad`、`showWorkspace()` 和入口归属的结构约束。

- [ ] **步骤 1：编写失败测试**

新增测试断言：

```js
test('task and ipad tools share one accessible tab workspace', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /role="tablist"[^>]*aria-label="功能切换"/);
  assert.match(html, /id="workspace-tab-tasks"[^>]*role="tab"[^>]*aria-controls="home-view"/);
  assert.match(html, /id="workspace-tab-ipad"[^>]*role="tab"[^>]*aria-controls="ipad-view"/);
  assert.match(app, /function showWorkspace\(workspace\)/);
  assert.doesNotMatch(app, /window\.open\(url, '_blank'\)/);
  assert.doesNotMatch(app, /location\.assign\(url\)/);
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`node --test --test-name-pattern="share one accessible tab workspace" tests/ui-structure.test.js`

预期：因 Tab 结构和 `showWorkspace()` 尚不存在而失败。

- [ ] **步骤 3：补充入口归属和响应式失败测试**

断言任务管理只位于 `home-view`，iPad 操作只位于 `ipad-view`，并要求 `workspace-tabs.css` 包含 900px 与 560px 断点和 44px 触控尺寸。

- [ ] **步骤 4：再次运行测试并确认按预期失败**

运行：`node --test --test-name-pattern="tab workspace|workspace navigation" tests/ui-structure.test.js`

预期：失败原因仅为新结构和样式缺失。

### 任务 2：实现同页 Tab 结构与行为

**文件：**
- 修改：`index.html`
- 修改：`src/app.js`
- 新建：`workspace-tabs.css`
- 修改：`ipad-layout.css`

**接口：**
- 消费：现有 `render()`、`renderIpad()`、`selectIpadMember()`。
- 产生：`activeWorkspace: 'tasks' | 'ipad'` 与 `showWorkspace(workspace)`。

- [ ] **步骤 1：重排 HTML**

在顶部加入：

```html
<nav class="workspace-tabs" role="tablist" aria-label="功能切换">
  <button id="workspace-tab-tasks" role="tab" aria-controls="home-view" aria-selected="true">任务打卡</button>
  <button id="workspace-tab-ipad" role="tab" aria-controls="ipad-view" aria-selected="false">iPad 使用</button>
</nav>
```

将激励文案移到应用栏下方；将任务管理和添加任务放入 `home-view` 工具栏；将 iPad 专属操作集中到 `ipad-view` 工具栏。

- [ ] **步骤 2：实现集中式视图切换**

```js
let activeWorkspace = ipadPageMemberId ? 'ipad' : 'tasks';

function showWorkspace(workspace) {
  activeWorkspace = workspace === 'ipad' ? 'ipad' : 'tasks';
  $('#home-view').hidden = activeWorkspace !== 'tasks';
  $('#ipad-view').hidden = activeWorkspace !== 'ipad';
  $('#workspace-tab-tasks').setAttribute('aria-selected', String(activeWorkspace === 'tasks'));
  $('#workspace-tab-ipad').setAttribute('aria-selected', String(activeWorkspace === 'ipad'));
  if (activeWorkspace === 'ipad') renderIpad();
  else render();
}
```

Tab 点击调用 `showWorkspace()`，成员切换根据 `activeWorkspace` 选择现有处理逻辑。

- [ ] **步骤 3：移除新窗口切换**

删除 `window.open()`、`location.assign()` 和独立返回 iPad 页逻辑；旧 `ipadMember` 参数只决定初始成员与初始 Tab。

- [ ] **步骤 4：实现专用响应式样式**

`workspace-tabs.css` 定义桌面三列、900px 两行应用栏、560px 等宽 Tab、独立激励条、工作区工具栏及至少 44px 的触控区域。

- [ ] **步骤 5：清理冲突样式**

从 `ipad-layout.css` 移除“iPad 页面隐藏 home-bar”和独立返回标题布局，避免与同页导航冲突。

- [ ] **步骤 6：运行聚焦测试并修复至通过**

运行：`node --test --test-name-pattern="tab workspace|workspace navigation|mobile ipad view|home navigation" tests/ui-structure.test.js`

预期：全部通过。

### 任务 3：缓存、回归与浏览器验收

**文件：**
- 修改：`index.html`
- 修改：`tests/ui-structure.test.js`
- 修改：`specs/features/unified-task-ipad-tabs.md`
- 修改：`tasks/TASK-20260730-unified-task-ipad-tabs.md`

**接口：**
- 产生：统一发布缓存版本和完成证据。

- [ ] **步骤 1：更新统一缓存版本**

将所有正式 CSS 和 `src/app.js` 查询版本统一更新为 `20260730-unified-tabs`，并加入 `workspace-tabs.css`。

- [ ] **步骤 2：运行语法与完整测试**

运行：

```bash
node --check src/app.js
node --test
git diff --check
```

预期：全部成功且无格式错误。

- [ ] **步骤 3：浏览器验收**

在 375px、768px、1280px 下验证：

- 两个 Tab 可点击并正确显示内容；
- 切换后日期状态保留；
- 任务管理仅在任务 Tab；
- iPad 管理操作仅在 iPad Tab；
- 无横向滚动，Tab 和按钮触控区域不少于 44px；
- 旧 `ipadMember` 链接直接进入 iPad Tab。

- [ ] **步骤 4：更新任务证据**

记录聚焦测试、完整测试、三个视口和剩余风险。

## 计划自查

- 覆盖 AC-1 至 AC-9。
- 无待定项、占位符或未定义接口。
- 文件职责明确：结构在 HTML，状态编排在 `app.js`，导航样式在独立 CSS。
