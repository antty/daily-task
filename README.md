# 日常：家庭任务管理

一个无构建步骤的响应式任务管理前端。可添加/删除单次、每日、每周任务，按成员、类型、状态、日期范围筛选，并在月历中查看每天的完成进度。

## 本地运行

在项目目录执行：

```bash
python3 -m http.server 4173
```

然后在浏览器打开 `http://localhost:4173`。数据默认存储在浏览器的 `localStorage`，无需注册即可体验；清除浏览器网站数据会清空任务。

## Supabase 上线准备

1. 创建 Supabase 项目并在 SQL Editor 运行 [schema.sql](supabase/schema.sql)。
2. 启用 Email 登录，并在应用中接入 Supabase Auth。
3. 将前端的本地仓库替换为对 `households`、`household_members`、`task_types`、`tasks`、`task_assignees`、`task_completions` 的查询和订阅；数据库已经用 RLS 限制为同一家庭成员。

免费项目适合个人家庭使用；连续闲置时可能会暂停，恢复后继续可用。

## 测试

```bash
node --test
node --check src/task-domain.js && node --check src/task-store.js && node --check src/app.js
```
