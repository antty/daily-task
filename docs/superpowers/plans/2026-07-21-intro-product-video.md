# Intro 产品教程视频实施计划

> **供代理执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐任务实施本计划。所有步骤使用复选框跟踪。

**目标：** 生成一段约 60 秒、温暖中文女声、只展示桌面网页场景的产品使用教程视频，并将视频、字幕、封面和行动入口嵌入 `intro.html`。

**架构：** 视频制作工程独立放在 `video/intro-product-tour/`，以现有 intro 截图和品牌变量为输入，通过 HyperFrames 生成可复现的动画、旁白与时间轴，再渲染压缩为网页 MP4。产品站点只消费 `assets/intro/video/` 下的成品，不依赖视频制作运行时，也不改动每日任务、Supabase 或 iPad 管理业务代码。

**技术栈：** HTML/CSS、HyperFrames、GSAP、Kokoro TTS、WebVTT、FFmpeg/ffprobe、Node.js 内置测试、GitHub Pages。

## 全局约束

- 视频为 16:9 横屏、约 60 秒、中文简体字幕，只展示桌面浏览器网页场景。
- 使用温暖、亲切、清晰的中文女声，不使用夸张广告腔。
- 不出现手机外框、触控手势、竖屏裁切、真实邀请码或真实家庭隐私数据。
- 视频不自动播放；页面使用 `controls`、`playsinline`、`preload="metadata"` 和封面。
- 视频加载失败不能阻断 intro 页功能摘要与 `index.html` 使用入口。
- 视频工程与业务运行时代码解耦；不得修改 `src/`、Supabase SQL、任务日历或 iPad 管理逻辑。
- 本次发布的 intro 资源缓存版本统一为 `20260721-intro-video`。
- 保留工作区中与本任务无关的未提交 CSS、日历测试、文档和 QA 文件，不得还原或暂存。

## 文件结构

```text
video/intro-product-tour/
  DESIGN.md                 # 视频品牌、色彩、字体与动效规则
  SCRIPT.md                 # 六段旁白和画面意图
  STORYBOARD.md             # 基于真实旁白时长的分镜与转场
  narration.txt             # 实际送入 TTS 的纯旁白文本
  narration.wav             # 中文女声旁白
  transcript.json           # 词级时间戳
  index.html                # HyperFrames 主合成
  assets/                   # 三张网页截图副本
  snapshots/                # 关键帧检查图
assets/intro/video/
  product-tour.mp4          # 网页最终视频
  product-tour-poster.webp  # 视频封面
  product-tour-zh.vtt       # 中文字幕
intro.html                  # 新增视频章节
intro.css                   # 视频章节和响应式样式
tests/ui-structure.test.js  # 视频结构、播放属性与缓存断言
```

---

### Task 1：建立桌面网页视频工程与创意资产

**Files:**
- Create: `video/intro-product-tour/DESIGN.md`
- Create: `video/intro-product-tour/SCRIPT.md`
- Create: `video/intro-product-tour/STORYBOARD.md`
- Create: `video/intro-product-tour/narration.txt`
- Create: `video/intro-product-tour/assets/daily-calendar.webp`
- Create: `video/intro-product-tour/assets/task-completion.webp`
- Create: `video/intro-product-tour/assets/ipad-usage.webp`

**Interfaces:**
- Consumes: `intro.css` 品牌变量与 `assets/intro/*.webp` 三张公开截图。
- Produces: 六段旁白、视觉规范、估算分镜和本地视频素材，供 Task 2/3 使用。

- [ ] **Step 1：检查视频工具环境**

Run:

```bash
node --version
ffmpeg -version
npx hyperframes doctor
```

Expected: Node.js `>=22`；FFmpeg 可执行；HyperFrames 报告浏览器和渲染依赖可用。若失败，先按 `doctor` 的明确缺失项修复环境，不创建替代视频脚本。

- [ ] **Step 2：初始化独立视频工程**

Run:

```bash
npx hyperframes init video/intro-product-tour --non-interactive
mkdir -p video/intro-product-tour/assets
cp assets/intro/daily-calendar.webp video/intro-product-tour/assets/
cp assets/intro/task-completion.webp video/intro-product-tour/assets/
cp assets/intro/ipad-usage.webp video/intro-product-tour/assets/
```

Expected: 工程存在且三个素材文件与源文件字节一致。

- [ ] **Step 3：编写 `DESIGN.md`**

写入以下明确规则：

```markdown
# 习惯养成产品教程视觉规范
## 风格
温暖、清晰、可信赖的桌面网页产品教程；使用浏览器窗口、鼠标点击反馈、局部放大和轻量标注。
## 颜色
- 主紫：#6f52b5
- 深紫：#563b9f
- 柔紫：#efe9fb
- 墨色：#251f2d
- 暖白：#fffaf4
- 成功绿：#3d8b6a
## 字体
-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
## 动效
柔和推进、局部缩放、鼠标点击波纹；每个场景有独立入口动画，场景之间使用遮罩或卡片推移转场。
## 禁止
- 不使用手机外框、触控手势或竖屏构图
- 不使用真实家庭数据
- 不使用快速闪切、霓虹色或夸张弹跳
- 不让字幕遮挡网页关键操作区域
```

- [ ] **Step 4：编写旁白文件**

`SCRIPT.md` 按 0–6、6–16、16–30、30–41、41–53、53–60 秒六段记录“旁白、画面、重点标注”。`narration.txt` 只保存设计规格中的六段旁白正文，段落之间空一行，不包含时间码、标题或 Markdown 标记。

Expected: 旁白完整覆盖家庭建立、任务创建、任务完成记录、iPad 时间管理和最后 CTA；不包含手机操作。

- [ ] **Step 5：编写估算版 `STORYBOARD.md`**

每段必须包含：估算起止时间、桌面浏览器画面、入口动画、场景转场、截图资产、鼠标/标注位置、字幕安全区。第 1–5 段只有入口动画，不提前做退出动画；场景切换由转场负责，第 6 段允许最终淡出。

- [ ] **Step 6：验证并提交创意资产**

Run:

```bash
rg -n "手机外框|触控手势|竖屏" video/intro-product-tour
rg -n "TBD|TODO|待定" video/intro-product-tour || true
git diff --check
```

Expected: 禁止项只出现在 `DESIGN.md` 的禁止规则中；不存在占位内容；diff 无空白错误。

Commit:

```bash
git add video/intro-product-tour/DESIGN.md video/intro-product-tour/SCRIPT.md video/intro-product-tour/STORYBOARD.md video/intro-product-tour/narration.txt video/intro-product-tour/assets
git commit -m "feat: add intro video creative assets"
```

---

### Task 2：生成中文女声、时间戳与字幕

**Files:**
- Create: `video/intro-product-tour/narration.wav`
- Create: `video/intro-product-tour/transcript.json`
- Create: `assets/intro/video/product-tour-zh.vtt`
- Modify: `video/intro-product-tour/STORYBOARD.md`

**Interfaces:**
- Consumes: `narration.txt` 和六段估算分镜。
- Produces: 可播放旁白、词级时间戳、WebVTT 字幕和真实场景时长，供 Task 3 合成。

- [ ] **Step 1：试听三种中文女声**

Run:

```bash
cd video/intro-product-tour
npx hyperframes tts "每天的任务容易忘，iPad 一用又容易超时。" --voice zf_xiaobei --output audition-xiaobei.wav
npx hyperframes tts "每天的任务容易忘，iPad 一用又容易超时。" --voice zf_xiaoni --output audition-xiaoni.wav
npx hyperframes tts "每天的任务容易忘，iPad 一用又容易超时。" --voice zf_xiaoxiao --output audition-xiaoxiao.wav
```

Expected: 三个试听文件均可播放。选择最温暖、吐字最清晰且不过度广告化的一种；默认优先 `zf_xiaobei`，除非试听结果存在明显机械感或发音问题。

- [ ] **Step 2：生成完整旁白并检查时长**

Run（以下以默认声音为例，若 Step 1 选择其他声音只替换 voice 参数）：

```bash
npx hyperframes tts narration.txt --voice zf_xiaobei --output narration.wav
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 narration.wav
```

Expected: 旁白约 54–62 秒。若超过 62 秒，删减重复形容词；若短于 54 秒，在段落间加入自然停顿文案，不改变六段信息结构，然后重新生成。

- [ ] **Step 3：生成词级时间戳**

Run:

```bash
npx hyperframes transcribe narration.wav --language zh
```

Expected: `transcript.json` 存在，首个词开始时间 `>=0`，最后一个词结束时间不超过音频总时长。

- [ ] **Step 4：把真实时间映射回分镜**

根据 `transcript.json` 将六段分镜的起止时间改为真实旁白词时间，每段末尾预留 0.3–0.5 秒呼吸时间。总合成时长取旁白时长向上取整，但控制在 54–63 秒。

- [ ] **Step 5：创建 WebVTT 字幕**

生成 `assets/intro/video/product-tour-zh.vtt`：

```vtt
WEBVTT

00:00:00.000 --> 00:00:06.000
每天的任务容易忘，iPad 一用又容易超时。
把家庭习惯放进一套清晰的系统，事情会简单很多。
```

其余五个 cue 使用 `STORYBOARD.md` 的真实边界和对应旁白；每个 cue 不超过两行，相邻 cue 不重叠，最后 cue 结束时间不超过旁白总时长。

- [ ] **Step 6：验证并提交声音与字幕**

Run:

```bash
ffprobe -v error -show_entries stream=codec_name,channels,sample_rate -of json narration.wav
test -s narration.wav
test -s transcript.json
test -s ../../assets/intro/video/product-tour-zh.vtt
git diff --check
```

Expected: WAV 可解码；旁白、时间戳与字幕文件均非空；diff 无空白错误。

Commit:

```bash
git add video/intro-product-tour/narration.wav video/intro-product-tour/transcript.json video/intro-product-tour/STORYBOARD.md assets/intro/video/product-tour-zh.vtt
git commit -m "feat: add intro video narration and captions"
```

---

### Task 3：构建、检查并渲染桌面网页教程视频

**Files:**
- Modify: `video/intro-product-tour/index.html`
- Create: `video/intro-product-tour/snapshots/*.png`
- Create: `assets/intro/video/product-tour.mp4`
- Create: `assets/intro/video/product-tour-poster.webp`

**Interfaces:**
- Consumes: `DESIGN.md`、真实时长的 `STORYBOARD.md`、旁白、字幕和三张网页截图。
- Produces: intro 页面可直接使用的 MP4 与 WebP 封面。

- [ ] **Step 1：搭建静态英雄帧布局**

在 `index.html` 创建一个 1920×1080 根合成。六个场景分别使用完整 `.scene-content` 容器，采用 flex/grid 与内边距完成最终位置；装饰元素可绝对定位，正文容器禁止硬编码 `top/left`。每个网页截图放入带浏览器标题栏的窗口卡片，使用 `object-fit: contain`，不得裁剪成手机比例。

- [ ] **Step 2：接入旁白与真实时间轴**

根合成加入：

```html
<audio id="narration" data-start="0" data-track-index="10" src="narration.wav" data-volume="1"></audio>
```

每个场景使用 `STORYBOARD.md` 的真实 `data-start` 和 `data-duration`。所有 GSAP timeline 使用 `{ paused: true }` 并注册到 `window.__timelines`。

- [ ] **Step 3：添加入口动画与场景转场**

每个场景的标题、浏览器窗口、标注、鼠标与字幕都有独立 `gsap.from()` 入口动画；同场景至少使用三种 easing。第 1–5 场不添加退出 tween，由场景遮罩/卡片推移转场负责离场；仅最终 CTA 场允许淡出。不得使用 `repeat:-1`、`Math.random()` 或异步构建 timeline。

- [ ] **Step 4：运行静态与运行时检查**

Run:

```bash
cd video/intro-product-tour
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect --samples 15
```

Expected: lint/validate 0 errors；inspect 无文字裁切、画布溢出或非预期重叠。逐项修复后重复执行，不能通过忽略错误完成。

- [ ] **Step 5：生成并逐张检查关键帧**

先使用估算时间 `3,11,23,35,47,57` 生成六段英雄帧；若 `STORYBOARD.md` 的真实旁白边界使某一帧落在转场中，只把该时间移动到对应段落的 60%–70% 位置后重新生成：

```bash
npx hyperframes snapshot . --at 3,11,23,35,47,57
```

逐张查看 `snapshots/`：文字可读、截图加载、浏览器窗口完整、无手机设备元素、标注不遮挡操作、色彩符合 `DESIGN.md`。

- [ ] **Step 6：启动 Studio 预览并完整检查**

Run:

```bash
npx hyperframes preview --port 4567
```

打开 `http://localhost:4567/#project/intro-product-tour`，完整播放一次并拖动检查六段转场、旁白、字幕安全区与最终 CTA。

- [ ] **Step 7：渲染和网页压缩**

用户已明确要求生成并嵌入视频，因此执行最终渲染：

```bash
npx hyperframes render --fps 30 --quality high --output renders/intro-product-tour-master.mp4
mkdir -p ../../assets/intro/video
ffmpeg -y -i renders/intro-product-tour-master.mp4 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k ../../assets/intro/video/product-tour.mp4
```

Expected: MP4 使用 H.264/AAC、`yuv420p`、faststart，总大小低于 40 MB。

- [ ] **Step 8：生成视频封面**

从第一段内容完整出现、约 3 秒处生成封面：

```bash
ffmpeg -y -ss 3 -i ../../assets/intro/video/product-tour.mp4 -frames:v 1 -vf "scale=1600:-2" -c:v libwebp -quality 84 ../../assets/intro/video/product-tour-poster.webp
```

Expected: 1600px 宽的 WebP，标题、浏览器画面和品牌色清晰可见。

- [ ] **Step 9：验证并提交视频成品**

Run:

```bash
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,pix_fmt,width,height -of json assets/intro/video/product-tour.mp4
test -s assets/intro/video/product-tour-poster.webp
test -s assets/intro/video/product-tour-zh.vtt
git diff --check
```

Expected: 时长 54–63 秒，1920×1080，H.264/AAC，`yuv420p`，文件非空且低于 40 MB。

Commit:

```bash
git add video/intro-product-tour/index.html video/intro-product-tour/DESIGN.md video/intro-product-tour/SCRIPT.md video/intro-product-tour/STORYBOARD.md assets/intro/video/product-tour.mp4 assets/intro/video/product-tour-poster.webp
git commit -m "feat: render intro product tutorial video"
```

---

### Task 4：将视频嵌入 Intro 页面

**Files:**
- Modify: `intro.html`
- Modify: `intro.css`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `assets/intro/video/product-tour.mp4`、`product-tour-poster.webp`、`product-tour-zh.vtt`。
- Produces: Hero 后、核心功能前的可访问视频区块和 `index.html` CTA。

- [ ] **Step 1：先写失败的页面结构测试**

在 `tests/ui-structure.test.js` 新增：

```js
test('intro product video teaches the desktop web workflow without autoplay', async () => {
  const intro = await readFile(new URL('../intro.html', import.meta.url), 'utf8');
  assert.match(intro, /id="product-video"/);
  assert.match(intro, /src="assets\/intro\/video\/product-tour\.mp4"/);
  assert.match(intro, /poster="assets\/intro\/video\/product-tour-poster\.webp"/);
  assert.match(intro, /src="assets\/intro\/video\/product-tour-zh\.vtt"/);
  assert.match(intro, /<video[^>]*controls[^>]*playsinline[^>]*preload="metadata"/);
  assert.doesNotMatch(intro, /<video[^>]*autoplay/);
  assert.match(intro, /href="index\.html"[^>]*>立即开始使用<\/a>/);
});
```

- [ ] **Step 2：运行测试确认 RED**

Run:

```bash
node --test --test-name-pattern='intro product video' tests/ui-structure.test.js
```

Expected: FAIL，提示缺少 `id="product-video"`。

- [ ] **Step 3：在 Hero 后加入视频章节**

在 `intro-hero` 结束后、`features` 之前增加：

```html
<section id="product-video" class="intro-section intro-product-video" aria-labelledby="product-video-title">
  <div class="intro-shell">
    <div class="intro-section-heading">
      <p class="intro-eyebrow">产品教程</p>
      <h2 id="product-video-title">60 秒了解习惯养成</h2>
      <p>从每日打卡到 iPad 时间管理，快速看看一家人如何开始。</p>
    </div>
    <div class="intro-video-frame">
      <video controls playsinline preload="metadata" poster="assets/intro/video/product-tour-poster.webp">
        <source src="assets/intro/video/product-tour.mp4" type="video/mp4">
        <track kind="captions" srclang="zh-CN" label="简体中文" src="assets/intro/video/product-tour-zh.vtt" default>
        你的浏览器暂不支持视频播放。你仍可以查看下方功能介绍并开始使用。
      </video>
    </div>
    <div class="intro-video-actions">
      <p>少一点催促，多一点主动，从今天开始记录看得见的进步。</p>
      <a class="intro-button intro-button-primary" href="index.html">立即开始使用</a>
    </div>
  </div>
</section>
```

- [ ] **Step 4：添加桌面与窄屏展示样式**

在 `intro.css` 添加：

```css
.intro-product-video { background: var(--intro-tint); }
.intro-video-frame { width: min(100%, 1040px); margin: 40px auto 0; padding: 10px; border: 1px solid var(--intro-border); border-radius: var(--intro-radius-md); background: var(--intro-surface); box-shadow: var(--intro-shadow-lg); }
.intro-video-frame video { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: calc(var(--intro-radius-md) - 8px); background: var(--intro-ink); object-fit: cover; }
.intro-video-actions { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 28px; color: var(--intro-muted); }
@media (max-width: 640px) { .intro-video-frame { margin-top: 28px; padding: 6px; } .intro-video-actions { flex-direction: column; gap: 16px; text-align: center; } }
```

- [ ] **Step 5：统一 Intro 缓存版本**

把 `intro.html` 的 `intro.css` 查询参数改为：

```html
<link rel="stylesheet" href="intro.css?v=20260721-intro-video">
```

同步更新对应测试断言，确保 intro 发布时不会继续使用旧样式缓存。

- [ ] **Step 6：运行结构与全量测试**

Run:

```bash
node --test --test-name-pattern='intro product video|product introduction' tests/ui-structure.test.js
node --test --test-reporter=dot
git diff --check
```

Expected: targeted 与全量测试均 0 失败，diff 无空白错误。

- [ ] **Step 7：提交网页集成**

```bash
git add intro.html intro.css tests/ui-structure.test.js assets/intro/video/product-tour-zh.vtt
git commit -m "feat: add product tutorial video to intro page"
```

---

### Task 5：浏览器验收、合并与发布

**Files:**
- Verify: `intro.html`
- Verify: `https://antty.github.io/daily-task/intro.html?v=20260721-intro-video`

**Interfaces:**
- Consumes: Task 1–4 的全部提交。
- Produces: 可供外部用户观看并进入任务系统的线上 intro 视频章节。

- [ ] **Step 1：运行发布前验证**

Run:

```bash
node --check src/app.js
node --test --test-reporter=dot
git diff --check
git status --short
```

Expected: 0 失败；只保留用户原有无关未提交文件。

- [ ] **Step 2：本地浏览器验收**

启动静态服务器并打开 `intro.html?v=20260721-intro-video`，验证：

- 视频区块位于 Hero 与核心功能之间。
- 封面清晰，不自动播放，点击后中文女声和字幕正常。
- 全屏、进度、音量和画中画控件可用。
- 视频只展示桌面网页，没有手机场景。
- 结束画面与页面 CTA 都可进入 `index.html`。
- 模拟视频资源失败时，页面其他内容和 CTA 仍可使用。

- [ ] **Step 3：最终代码审查**

审查从功能分支基线到当前 HEAD 的净差异，重点检查视频隐私、媒体体积、字幕边界、缓存版本、无 autoplay、无业务代码耦合。修复所有 P0/P1/P2 后重新运行 Step 1。

- [ ] **Step 4：合入并推送 main**

只合入本计划产生的聚焦提交，不包含用户的无关未提交文件，然后：

```bash
git push origin main
```

- [ ] **Step 5：确认 GitHub Pages 与线上资源**

Run:

```bash
gh api 'repos/antty/daily-task/actions/runs?per_page=1' --jq '.workflow_runs[0] | {status, conclusion, head_sha, html_url}'
curl -fsSI https://antty.github.io/daily-task/assets/intro/video/product-tour.mp4
curl -fsSL 'https://antty.github.io/daily-task/intro.html?v=20260721-intro-video' | rg 'product-tour\.mp4|20260721-intro-video'
```

Expected: Pages `completed/success`，MP4 返回 200 且为视频内容类型，线上 intro 引用新视频与新缓存版本。

- [ ] **Step 6：线上浏览器复测**

打开 `https://antty.github.io/daily-task/intro.html?v=20260721-intro-video`，重复本地的关键播放与 CTA 检查。最终交付同时提供线上 intro 地址、HyperFrames Studio 地址、提交哈希和 Pages 构建地址。
