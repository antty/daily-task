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

## Work Checklist

- [x] Confirm specifications are approved and current.
- [ ] Add or update focused tests.
- [ ] Implement the smallest scoped change.
- [ ] Run focused verification.
- [ ] Run `node --test`.
- [ ] Run `git diff --check` and review the complete diff.
- [ ] Update specifications, decisions, and changelog as applicable.

## Completion Evidence

- Commands and results:
- Manual verification:
- Remaining risks:
