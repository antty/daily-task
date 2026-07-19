# iPad 日历同款选择态实施计划

> **供智能执行代理使用：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项实施本计划。所有步骤使用复选框（`- [ ]`）跟踪。

**目标：** 将 iPad 使用管理页日历统一为已确认的 iPhone 风格日期选择态，同时保留正常、超时和无额度的业务语义。

**架构：** 保留 `renderIpadMonth()` 的额度与超时计算，仅把日期和状态拆分为独立元素，并在 `ipad-layout.css` 中建立日期圆、今天圆环及下方状态图标。缓存版本统一更新，避免手机继续使用旧样式。

**技术栈：** 静态 HTML、CSS、JavaScript、Node.js 内置测试运行器。

## 全局约束

- 选中日期为紫色实心圆，今天未选中为紫色细圆环。
- 正常状态显示绿色勾，超时状态显示红色叉，无额度不显示状态。
- 日期与状态之间至少保留 6px 间距。
- 日期按钮触控区域不低于 44px，375px 与横屏下不得横向溢出。
- 不修改额度、计时、超时计算、日期选择事件或 Supabase 数据结构。

---

### 任务 1：拆分 iPad 日期与状态结构

**涉及文件：**
- 修改：`tests/ui-structure.test.js`
- 修改：`src/app.js`

**接口：**
- 输入：`renderIpadMonth(ipad, memberId)` 现有的 `status`、`limit` 与 `state.ipadSelectedDate`。
- 输出：`.ipad-calendar-date` 日期元素、`.ipad-calendar-status` 状态元素以及 `.today` 状态类。

- [ ] **步骤 1：先添加失败的结构测试**

断言 `renderIpadMonth()` 输出独立的日期和状态元素，并为今天添加类名：

```js
assert.match(app, /class="ipad-calendar-date"/);
assert.match(app, /class="ipad-calendar-status \$\{status\}"/);
assert.match(app, /date === today \? 'today' : ''/);
assert.match(app, /aria-hidden="true"/);
```

- [ ] **步骤 2：运行聚焦测试并确认失败**

```bash
node --test --test-name-pattern='ipad calendar uses the shared iPhone-style date hierarchy' tests/ui-structure.test.js
```

预期结果：测试失败，因为当前日期和勾叉仍拼接在同一个按钮文本中。

- [ ] **步骤 3：实现最小结构调整**

在 `renderIpadMonth()` 中保留原状态计算和辅助技术文案，将按钮内容改为：

```html
<b class="ipad-calendar-date">日期</b>
<small class="ipad-calendar-status 状态" aria-hidden="true">✓ 或 ✕</small>
```

无额度日期不输出状态元素；按钮继续保留 `aria-pressed`、`aria-label`、`title` 和 `data-ipad-day`。

- [ ] **步骤 4：运行聚焦测试并确认通过**

```bash
node --test --test-name-pattern='ipad calendar uses the shared iPhone-style date hierarchy' tests/ui-structure.test.js
```

预期结果：测试通过。

### 任务 2：实现 iPhone 风格选择态和状态层级

**涉及文件：**
- 修改：`tests/ui-structure.test.js`
- 修改：`ipad-layout.css`

**接口：**
- 输入：任务 1 产生的 `.ipad-calendar-date`、`.ipad-calendar-status`、`.selected`、`.today`、`.within-limit` 和 `.overtime`。
- 输出：32px 桌面日期圆、30px 手机日期圆、60px 日期按钮以及下方居中状态。

- [ ] **步骤 1：先添加失败的样式测试**

断言按钮为稳定触控区、选中格取消整格装饰、日期使用圆形焦点、状态位于下方：

```js
assert.match(css, /\.ipad-calendar-grid button\s*\{[^}]*position:\s*relative[^}]*min-height:\s*60px/);
assert.match(css, /\.ipad-calendar-date\s*\{[^}]*left:\s*50%[^}]*width:\s*32px[^}]*height:\s*32px[^}]*border-radius:\s*50%/);
assert.match(css, /\.ipad-calendar-grid button\.selected\s*\{[^}]*background:\s*transparent[^}]*box-shadow:\s*none[^}]*transform:\s*none/);
assert.match(css, /\.ipad-calendar-grid button\.selected \.ipad-calendar-date\s*\{[^}]*background:\s*var\(--color-primary\)[^}]*color:\s*#fff/);
assert.match(css, /\.ipad-calendar-grid button\.today:not\(\.selected\) \.ipad-calendar-date/);
assert.match(css, /\.ipad-calendar-status\s*\{[^}]*left:\s*50%[^}]*bottom:\s*4px[^}]*width:\s*14px[^}]*height:\s*14px/);
```

- [ ] **步骤 2：运行测试并确认失败**

```bash
node --test --test-name-pattern='ipad calendar uses the shared iPhone-style date hierarchy' tests/ui-structure.test.js
```

预期结果：结构断言通过，新增样式断言失败。

- [ ] **步骤 3：实现最小样式**

在 `ipad-layout.css` 中移除整格选中边框、整格超时边框与位移，新增圆形日期焦点和独立状态图标；移动端仍保持 60px 单元高度和 30px 日期圆。

- [ ] **步骤 4：运行聚焦测试并确认通过**

```bash
node --test --test-name-pattern='ipad calendar uses the shared iPhone-style date hierarchy|ipad daily overtime' tests/ui-structure.test.js
```

预期结果：两项测试通过，原有超时辅助文案断言继续通过。

### 任务 3：更新缓存版本并完成验证

**涉及文件：**
- 修改：`tests/ui-structure.test.js`
- 修改：`index.html`
- 修改：`qa-calendar-visual.html`

**接口：**
- 输出：所有正式前端资源统一使用 `20260719-ipad-ios-calendar`。

- [ ] **步骤 1：先更新缓存版本测试并确认失败**

将三处正式资源版本期望更新为 `20260719-ipad-ios-calendar`，执行：

```bash
node --test --test-name-pattern='cache|version|stylesheet' tests/ui-structure.test.js
```

预期结果：`index.html` 仍使用旧版本，测试失败。

- [ ] **步骤 2：更新全部正式资源和视觉卡版本**

将 `index.html` 的六个样式表和 `src/app.js` 版本统一更新；视觉卡的三个样式表版本同步更新。

- [ ] **步骤 3：运行自动化验证**

```bash
node --check src/app.js
node --test
git diff --check
```

预期结果：语法检查退出码为 0，全部测试通过，差异检查无错误。

- [ ] **步骤 4：验证真实布局**

在桌面默认视口、375×700 和 700×375 下确认：日期圆与状态不重叠、超时仍为红色叉、正常为绿色勾、无额度不显示状态、页面无横向溢出。

- [ ] **步骤 5：提交实现**

```bash
git add src/app.js ipad-layout.css index.html qa-calendar-visual.html tests/ui-structure.test.js docs/superpowers/plans/2026-07-19-ipad-calendar-selection.md
git commit -m "fix: align ipad calendar selection styling"
```
