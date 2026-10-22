# AGENTS.md — 代理上岗手册
<!-- 这是所有编码代理（Claude Code / Copilot agent / Codex 等）的入职培训材料。
     自动化成功率的上限由这份文件的质量决定：命令必须可执行、红线必须明确。
     项目演进后记得同步更新——weekly-maintenance 会帮你检查它是否漂移。 -->

## 1. 项目概览
本仓库是一个「自维护、自开发」模板：触发器（issue / PR 评论 / CI 失败 / 定时巡检）
→ 代理改代码 → CI 验证 → 分级合并。七层架构与文件对应关系见 README。

<!-- TODO（模板使用者）：换成你项目的一两句话简介——是什么、为谁服务。 -->

## 2. 技术栈与目录结构
- 运行时 Node.js ≥ 22；包管理 pnpm（`package.json` 的 `packageManager` 字段锁定版本）
- 语言 TypeScript（strict）；测试 vitest；Lint eslint（flat config）
- `src/` 源码与测试；`.github/workflows/` 七层自动化；`.claude/skills/` 接入技能；根目录 `AGENTS.md` / `CLAUDE.md` / `CODEOWNERS` 为护栏

<!-- TODO（模板使用者）：替换成你项目的实际技术栈与目录说明，例如
- 前端：React 19 + TypeScript + Vite（/web）
- 后端：Hono + Drizzle（/server）
- 数据库：MySQL
-->

## 3. 构建与验证命令（代理必须严格使用以下命令）
```bash
# 安装依赖
pnpm install --frozen-lockfile

# 本地验证三件套——提交前必须全部通过
pnpm lint
pnpm typecheck
pnpm test

# 构建
pnpm build
```
<!-- 模板自带的示例项目让上述命令开箱可用。换成你的技术栈后，
     同步更新本节与 ci.yml 中的命令，两处必须一致。 -->

## 4. 代码规范
- 提交信息使用 Conventional Commits（feat/fix/chore/docs...）
- 新功能必须带测试；修复 bug 必须先补一个能复现的失败测试
- TODO：补充本项目的具体规范（命名、目录约定、禁止引入的库等）

## 5. 红线（任何代理违反即视为任务失败）
- 禁止删除、跳过、注释掉任何已有测试
- 禁止关闭或放宽 lint / typecheck 规则
- 禁止修改 `.github/workflows/` 下的文件（除非任务明确要求）
- 禁止提交密钥、.env、证书等敏感文件
- 禁止直接推送到 main——所有改动必须走 PR

## 6. PR 规范
- 标题格式：`[agent] <类型>: <一句话描述>`
- 正文必须包含：改了什么、为什么、本地验证结果（贴命令输出摘要）
- 单个 PR 只干一件事；发现顺手想改的其他问题，另开 issue 记录

## 7. 你会如何被触发（背景知识，无需操作）
- issue 打 `fix-me` 标签 → 实现该 issue，从 `claude/` 前缀分支开 PR
- issue/PR 评论 `@claude` → 响应评论；在 PR 上可直接推提交到源分支
- CI 红 + ci-auto-fix 呼叫 → 修复后三件套必须全绿再推送（同一 PR 最多被自动呼叫 3 次）
- PR 打 `review-this` → 审查代理介入，与你无关，不要抢审查的活
- 你的分支以 `claude/` 开头：其 CI 失败不会再次唤起自动修复，靠自己修绿
- 你被唤醒意味着已通过「AI 闸门」（策略见 `.github/ai-policy.yml`）；谷时运行的
  任务轮次上限更高（max_turns_offpeak），可以做得更完整
- 输入里出现 `ai-queue` / `ai-queue-review` / `urgent` 标签时它们是成本治理的
  排队/插队标记，属于仓库状态，不要增删
