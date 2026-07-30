# TASK-20260730: iPad 使用亲子协议

## Status

Done

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

## Work Checklist

- [x] Confirm specifications are approved and current.
- [x] Add or update focused tests.
- [x] Implement the smallest scoped change.
- [x] Run focused verification.
- [x] Run `node --test`.
- [x] Run `git diff --check` and review the complete diff.
- [x] Update specifications and task evidence; leave the pre-existing untracked central changelog untouched.

## Completion Evidence

- Commands and results: 协议聚焦测试 8/8 通过；完整 `node --test` 94/94 通过；`node --check src/app.js` 和 `git diff --check` 通过。
- Manual verification: 1280×900、375×700 和 700×375 三个视口无横向溢出；标题居中；入口与关闭按钮均为 44×44px；正文可滚动；关闭按钮生效且 iPad 页面状态保持不变。
- Remaining risks: 内嵌测试浏览器会拦截 Escape，原生 `dialog` 未注册任何阻止 `cancel` 的逻辑；协议只展示处罚规则，不自动读取系统屏幕使用时间或执行处罚；主工作区的 `docs/changelog.md` 是用户未跟踪文件，本分支未修改或暂存。
