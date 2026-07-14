# 家庭日常任务 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可在桌面与移动端使用的家庭共享任务应用，支持任务、筛选、日历与每日完成记录。

**Architecture:** 无构建依赖的响应式 Web 应用。业务逻辑集中在纯函数模块，浏览器 UI 使用该模块管理状态；数据仓库优先读写 Supabase，未配置时自动使用 localStorage，便于即时体验。

**Tech Stack:** HTML、CSS、原生 ES modules、Node 内置测试运行器、Supabase JavaScript CDN。

## Global Constraints

- 支持家庭成员共享任务及类型；所有成员可管理共享数据。
- 任务具备标题、描述、类型、关联成员、日期、重复规则和逐日完成状态。
- 支持成员、类型、单日/日期范围与完成状态的组合筛选。
- 月历以任务总数与完成比例呈现日期状态。

---

### Task 1: 任务领域与数据仓库

**Files:**
- Create: `src/task-domain.js`
- Create: `src/task-store.js`
- Test: `tests/task-domain.test.js`

- [ ] 先以 Node 测试定义日期范围、重复发生日、筛选和完成统计的预期行为，并验证测试因模块缺失而失败。
- [ ] 实现纯领域函数与 localStorage/Supabase 双仓库；Supabase 配置为空时不发网络请求。
- [ ] 运行 `node --test tests/task-domain.test.js`，确认所有领域测试通过。

### Task 2: 响应式任务界面

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/app.js`

- [ ] 创建家庭成员、任务类型与任务的示例数据，并建立任务新增、删除、完成切换、筛选和日期导航的 UI 状态。
- [ ] 实现任务表单与任务列表；任务支持单日、每日、每周重复，删除操作需要二次确认。
- [ ] 为成员、类型、状态和日期范围实现可组合筛选，并在移动端收叠为顺序卡片布局。

### Task 3: 日历与云端接入说明

**Files:**
- Create: `supabase/schema.sql`
- Create: `README.md`

- [ ] 实现月历网格、今日高亮、当天任务数量/完成比例和日期点选联动。
- [ ] 编写 Supabase 表、RLS 策略与实时订阅所需的 SQL；定义家庭、成员、类型、任务与完成记录的关系。
- [ ] 在 README 中给出运行命令和 Supabase 环境配置方式。

### Task 4: 验证

**Files:**
- Test: `tests/task-domain.test.js`

- [ ] 运行 `node --test` 验证任务领域逻辑。
- [ ] 使用 `node --check src/task-domain.js && node --check src/task-store.js && node --check src/app.js` 验证模块语法。
- [ ] 用本地 HTTP 服务打开页面，确认资源加载、任务新增/完成/删除、筛选与月历点击在浏览器中可用。
