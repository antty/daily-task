# 功能介绍主页实施计划

> **面向执行代理：** 必须使用 `superpowers:executing-plans` 按任务逐项实施；每一步使用复选框跟踪。

**目标：** 新增独立的 `intro.html` 产品介绍页，通过功能说明、真实截图和使用流程，引导家庭用户进入现有任务系统。

**架构：** 页面使用静态 HTML 与独立 CSS，不加载业务脚本和 Supabase。产品截图保存到 `assets/intro/`，所有行动按钮链接到现有 `index.html`，从而与任务系统完全解耦。

**技术栈：** HTML5、CSS3、Node.js 内置测试、浏览器视觉验证。

## 全局约束

- `index.html` 继续作为任务系统入口，不修改现有任务数据与交互逻辑。
- 介绍页文件为 `intro.html`，专属样式为 `intro.css`。
- 不新增前端框架、构建工具或运行时依赖。
- 页面正文正常文本不小于 16 像素，交互区域不小于 44×44 像素。
- 桌面端采用双栏首屏，窄屏采用文字在上、截图在下，无水平滚动。
- 所有截图必须包含明确的 `alt`、宽高属性，并保存为项目本地资源。

---

### 任务 1：建立介绍页结构契约

**文件：**
- 修改：`tests/ui-structure.test.js`
- 创建：`intro.html`

**接口：**
- 输入：浏览器直接访问 `intro.html`。
- 输出：包含 `intro-header`、`intro-hero`、`features`、`screenshots`、`workflow`、`intro-cta` 的语义化静态页面。

- [ ] **步骤 1：编写失败测试**

在 `tests/ui-structure.test.js` 中读取 `intro.html` 并断言：

```js
test('product introduction page exposes the public landing structure', () => {
  const html = readFileSync(new URL('../intro.html', import.meta.url), 'utf8');
  assert.match(html, /<title>习惯养成 · 家庭任务与 iPad 使用管理<\/title>/);
  assert.match(html, /id="intro-hero"/);
  assert.match(html, /id="features"/);
  assert.match(html, /id="screenshots"/);
  assert.match(html, /id="workflow"/);
  assert.match(html, /href="index\.html"[^>]*>\s*立即开始/);
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`node --test --test-name-pattern='product introduction page' tests/ui-structure.test.js`

预期：因 `intro.html` 不存在而失败。

- [ ] **步骤 3：实现最小页面结构**

创建 `intro.html`，包含跳到主要内容链接、语义化导航、首屏、三张功能卡片、截图区、四步流程、页尾行动区和页脚。首屏与页尾的按钮使用：

```html
<a class="intro-button intro-button-primary" href="index.html">立即开始</a>
```

- [ ] **步骤 4：运行结构测试并确认通过**

运行：`node --test --test-name-pattern='product introduction page' tests/ui-structure.test.js`

预期：相关测试通过。

### 任务 2：本地化产品截图并完成视觉样式

**文件：**
- 创建：`assets/intro/daily-calendar.webp`
- 创建：`assets/intro/task-completion.webp`
- 创建：`assets/intro/ipad-usage.webp`
- 创建：`intro.css`
- 修改：`intro.html`
- 修改：`tests/ui-structure.test.js`

**接口：**
- 输入：三张真实产品界面截图。
- 输出：本地 WebP 图片与桌面、手机均可用的介绍页视觉样式。

- [ ] **步骤 1：编写失败测试**

增加截图与样式契约：

```js
test('product introduction page uses local accessible screenshots', () => {
  const html = readFileSync(new URL('../intro.html', import.meta.url), 'utf8');
  assert.match(html, /href="intro\.css\?v=20260719-intro"/);
  for (const name of ['daily-calendar', 'task-completion', 'ipad-usage']) {
    assert.match(html, new RegExp(`src="assets/intro/${name}\\.webp"[^>]+alt="[^"]+"[^>]+width="\\d+"[^>]+height="\\d+"`));
  }
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`node --test --test-name-pattern='local accessible screenshots' tests/ui-structure.test.js`

预期：因本地截图和正式样式尚未接入而失败。

- [ ] **步骤 3：准备截图资源**

把 README 中对应的真实产品截图下载或从已有截图素材复制到临时文件，使用系统图像工具转换为 WebP，并控制最长边不超过 1600 像素。输出固定到 `assets/intro/` 的三个文件名。

- [ ] **步骤 4：实现介绍页样式**

在 `intro.css` 中定义：

```css
:root {
  --intro-primary: #6f52b5;
  --intro-primary-strong: #563b9f;
  --intro-ink: #251f2d;
  --intro-muted: #706879;
  --intro-border: #e7e1ec;
  --intro-surface: #ffffff;
  --intro-tint: #f7f4fb;
}

.intro-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr);
  gap: clamp(40px, 7vw, 96px);
  align-items: center;
}

@media (max-width: 820px) {
  .intro-hero-grid { grid-template-columns: 1fr; }
}
```

完成导航、首屏、功能卡片、截图画廊、流程步骤、页尾行动区、键盘焦点、图片懒加载和减少动效适配。

- [ ] **步骤 5：运行截图结构测试并确认通过**

运行：`node --test --test-name-pattern='product introduction page|local accessible screenshots' tests/ui-structure.test.js`

预期：相关测试全部通过。

### 任务 3：响应式验证与回归检查

**文件：**
- 修改：`intro.css`（仅在验证发现问题时）
- 修改：`intro.html`（仅在验证发现问题时）

**接口：**
- 输入：本地 HTTP 地址 `http://localhost:4177/intro.html`。
- 输出：通过桌面、手机与横屏验证的最终页面。

- [ ] **步骤 1：启动本地服务**

运行：`python3 -m http.server 4177`

- [ ] **步骤 2：桌面视觉验证**

使用 1440×900 视口检查：首屏双栏、导航单行、截图完整、锚点和两个“立即开始”链接可用。

- [ ] **步骤 3：手机视觉验证**

使用 390×844 视口检查：首屏单栏、无水平滚动、文字无截断、按钮触控区不小于 44 像素、截图不溢出。

- [ ] **步骤 4：横屏验证**

使用 844×390 视口检查导航与首屏不遮挡，内容仍可自然滚动。

- [ ] **步骤 5：执行完整测试与静态检查**

运行：

```bash
node --check src/app.js
node --test
git diff --check
```

预期：JavaScript 语法检查通过，全部测试通过，无空白错误。

- [ ] **步骤 6：提交功能**

仅暂存本功能涉及的文件：

```bash
git add intro.html intro.css assets/intro tests/ui-structure.test.js docs/superpowers/plans/2026-07-19-product-intro-page.md
git commit -m "feat: add product introduction page"
```
