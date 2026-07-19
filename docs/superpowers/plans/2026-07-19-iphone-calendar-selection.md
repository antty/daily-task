# iPhone 风格日历选择态实施计划

> **供智能执行代理使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项实施本计划。所有步骤使用复选框（`- [ ]`）跟踪。

**目标：** 将任务日历当前的卡片式选择态改为类似 iPhone 日历的圆形日期焦点，并让任务状态清晰地独立展示在日期下方。

**架构：** 保留现有 `renderCalendar()` 生成的 HTML 和任务状态判断逻辑，仅重构末尾 CSS 覆盖层。所有日期共用居中的圆形位置，选中日期填充圆形，今天使用描边圆形，任务状态占据下方居中位置。

**技术栈：** 静态 HTML、CSS、JavaScript、Node.js 内置测试运行器。

## 全局约束

- 选中日期只有一个主要视觉焦点：薰衣草紫实心圆。
- 选中日历格不展示整格渐变、边框或卡片阴影。
- 任务状态位于日期下方，并与日期保持至少 6px 间距。
- 整个日历格仍是可交互按钮，高度不低于 44px。
- 不修改任务状态计算、日期事件、Supabase 数据或任务归属。
- 验证桌面、375px 手机和手机横屏布局。

---

### 任务 1：圆形日历选择态与居中任务状态

**涉及文件：**
- 修改：`tests/ui-structure.test.js`
- 修改：`extras-3.css`
- 修改：`index.html`

**接口：**
- 输入：`renderCalendar()` 现有的 `.day`、`.day.today`、`.day.selected`、`.day b` 和 `.calendar-status` 结构。
- 输出：桌面端 32px 居中日期区域、手机端 30px 日期区域、实心圆选择态、仅描边的今天状态，以及下方居中的任务状态。

- [ ] **步骤 1：用 iPhone 风格断言替换旧选择态测试**

在 `tests/ui-structure.test.js` 中，将现有日历选择态 CSS 断言替换为：

```js
assert.match(css, /\.compact-home \.day\s*\{[^}]*height:\s*60px/);
assert.match(css, /\.compact-home \.day b\s*\{[^}]*position:\s*absolute[^}]*left:\s*50%[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border-radius:\s*50%[^}]*transform:\s*translateX\(-50%\)/);
assert.match(css, /\.compact-home \.day\.selected\s*\{[^}]*background:\s*transparent[^}]*box-shadow:\s*none/);
assert.match(css, /\.compact-home \.day\.selected b\s*\{[^}]*background:\s*var\(--color-primary\)[^}]*color:\s*#fff/);
assert.match(css, /\.compact-home \.day\.today:not\(\.selected\) b\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--color-primary\)/);
assert.match(css, /\.compact-home \.day \.calendar-status\s*\{[^}]*left:\s*50%[^}]*bottom:\s*4px[^}]*width:\s*14px[^}]*height:\s*14px[^}]*transform:\s*translateX\(-50%\)/);
assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.compact-home \.day b\s*\{[^}]*width:\s*30px[^}]*height:\s*30px/);
```

- [ ] **步骤 2：运行聚焦测试并确认测试失败**

执行：

```bash
node --test --test-name-pattern='selected task calendar' tests/ui-structure.test.js
```

预期结果：测试失败，因为当前选择态仍使用圆角矩形和整格视觉效果。

- [ ] **步骤 3：实现居中的日期与任务状态区域**

将 `extras-3.css` 末尾当前的选择态和状态覆盖代码替换为：

```css
/* iPhone 风格日历层级：日期焦点在上，任务状态在下。 */
.compact-home .day {
  height: 60px;
  padding: 0;
  text-align: center;
}

.compact-home .day b {
  display: grid;
  position: absolute;
  top: 3px;
  left: 50%;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  color: var(--color-foreground);
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  transform: translateX(-50%);
  transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
}

.compact-home .day.selected {
  background: transparent;
  box-shadow: none;
}

.compact-home .day.selected b {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 10px rgb(85 64 143 / 22%);
}

.compact-home .day.today:not(.selected) b {
  color: var(--color-primary-strong);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.compact-home .day .calendar-status {
  display: grid;
  position: absolute;
  left: 50%;
  right: auto;
  bottom: 4px;
  width: 14px;
  height: 14px;
  margin: 0;
  place-items: center;
  font-size: 9px;
  transform: translateX(-50%);
}

.compact-home .day .calendar-status.has-task,
.compact-home .day .calendar-status.idle {
  left: 50%;
  right: auto;
  bottom: 8px;
  width: 14px;
  height: 3px;
  margin: 0;
  border-radius: 999px;
  background: #83b697;
  color: transparent;
  font-size: 0;
  transform: translateX(-50%);
}

.compact-home .day .calendar-status.idle {
  background: #d7d1dc;
  opacity: .7;
}

@media (max-width: 600px) {
  .compact-home .day b {
    top: 4px;
    width: 30px;
    height: 30px;
    font-size: 13px;
  }
}
```

- [ ] **步骤 4：通过先失败后通过的测试更新前端缓存版本**

将 `tests/ui-structure.test.js` 中三处缓存版本期望值改为：

```text
20260719-ios-calendar
```

执行：

```bash
node --test --test-name-pattern='cache|version|stylesheet' tests/ui-structure.test.js
```

预期结果：`index.html` 仍使用旧版本时测试失败。随后将 `index.html` 中所有样式表和脚本地址统一更新为 `20260719-ios-calendar`，再次执行同一命令，预期测试通过。

- [ ] **步骤 5：运行聚焦测试和完整校验**

执行：

```bash
node --test --test-name-pattern='selected task calendar|cache|version|stylesheet' tests/ui-structure.test.js
node --check src/app.js
node --test
git diff --check
```

预期结果：聚焦测试全部通过，完整测试零失败，JavaScript 语法检查退出码为 0，差异检查没有错误。

- [ ] **步骤 6：在规定断点验证真实页面渲染**

本地启动页面，分别检查选中日期、今天、已完成、未完成、有任务和无任务日历格：

```text
桌面默认视口
375 × 700
700 × 375
```

确认选中日期是唯一实心圆；今天未选中时使用描边圆；所有任务状态都在日期下方居中；日期圆与状态不重叠；日历格没有溢出。

- [ ] **步骤 7：提交实现代码**

```bash
git add extras-3.css index.html tests/ui-structure.test.js docs/superpowers/plans/2026-07-19-iphone-calendar-selection.md
git commit -m "fix: adopt iPhone-style calendar selection"
```
