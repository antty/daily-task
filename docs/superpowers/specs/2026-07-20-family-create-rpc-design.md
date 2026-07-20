# 家庭创建安全函数修复设计

## 背景与根因

线上 `households` 表已存在 `owners create households` 插入策略，条件为 `owner_id = auth.uid()`，但浏览器中的匿名登录会话仍在客户端直插时触发 RLS 拒绝。继续重复创建相同策略无法消除客户端身份值进入写入链路时的不一致。

## 目标

- 保留 `households` 的 RLS，不开放匿名直写。
- 只允许已建立 Supabase 会话的用户为自己创建家庭。
- 保留现有邀请码、家庭管理密码触发器和成员同步流程。
- 迁移可重复执行，不删除既有家庭、成员、任务或完成记录。

## 方案

新增 `public.create_household_with_invite(requested_invite_code text)`，使用 `security definer` 且固定空 `search_path`：

1. 从 `auth.uid()` 读取当前用户，未登录时拒绝执行。
2. 规范化并校验 8 位邀请码，只允许项目使用的安全字符集。
3. 由数据库生成家庭 UUID，并把 `owner_id` 固定为当前用户。
4. 返回新家庭的 `id` 与 `invite_code`。
5. 撤销 `public`、`anon` 的执行权限，只授予 `authenticated`。

前端 `ensureHousehold()` 改为调用该 RPC，不再直接向 `households` 插入。创建成功后仍沿用现有成员、任务类型和任务同步逻辑。

## 数据流程

`浏览器匿名登录会话 → create_household_with_invite RPC → 服务端读取 auth.uid() → 写入 households → 密码触发器初始化默认管理密码 → 前端同步本地成员`

## 错误处理

- 无会话：返回明确的未登录错误，不创建数据。
- 邀请码格式错误或冲突：RPC 失败，前端保留本地成员并允许重新同步。
- 后续成员同步失败：家庭已创建，刷新后可从当前用户的家庭记录恢复并继续同步。

## 测试与验证

- 自动测试验证前端只通过 RPC 创建家庭，不再直接插入 `households`。
- 自动测试验证 schema 与恢复迁移都包含受限 RPC、权限回收和授权。
- 在 Supabase SQL Editor 执行迁移后，用 Safari/Chrome 的现有本地成员状态点击重新同步，确认邀请码生成。
- 完整运行现有测试，验证每日任务、成员管理与 iPad 管理不受影响。

## 回滚

前端可回退到上一个提交；数据库函数可通过 `drop function public.create_household_with_invite(text)` 删除。该函数不改变已有数据结构，回滚不会删除业务数据。
