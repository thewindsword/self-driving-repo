---
name: adopt-self-driving
description: 将一个现有的代码仓库改造成 self-driving 自维护仓库（issue / CI 失败 / 定时 → AI 代理改代码 → CI 验证 → 人工合并）。当用户要求「接入 self-driving」「让仓库自维护」「装上自动驾驶」「按 self-driving-repo 模板改造」时使用。
---

# 接入 Self-Driving（现有项目改造）

把当前仓库改造成七层自维护系统。你在目标仓库里执行；所有核心文件
**从模板仓库 main 分支实时拉取**（勿凭记忆重写——模板在持续修复演进）。

## 0. 心智模型（先给自己对齐）

```
触发器（issue fix-me / @claude 评论 / CI 失败 / 定时巡检）
  → AI 闸门（峰谷窗口 · 分触发放行 · 日预算）→ 排队或拒绝
  → claude-agent.yml（唯一代理入口：读 AGENTS.md → 改码 → 自验 → 开 PR）
  → CI verify 硬门槛 → 用户按合并键（唯一人工闸门）
```

三条铁律：所有代理入口收敛到一个 workflow 文件；AGENTS.md 决定产出质量；
人工闸门 = CI 硬门槛 + 合并按钮（单人仓库用 0 批准，别用 1）。

## 1. 前置检查（不通过就停下问用户，别硬来）

- 当前在目标仓库根目录，`git status` 干净，默认分支为 main
- 探测技术栈：包管理器是什么，lint / typecheck / test / build 四条命令分别是什么
  ——**逐条真实执行验证**，任何一条跑不通就向用户确认正确命令
- 用户已备好：GitHub 仓库管理员权限、模型 API key（DeepSeek / GLM / Kimi /
  Anthropic 兼容端点任一）、可创建 PAT 的权限

## 2. 拉取核心文件

基址（raw，取 main 最新）：
`https://raw.githubusercontent.com/thewindsword/self-driving-repo/main/`

必选（10 个，落到目标仓库相同路径）：

| 文件 | 说明 |
|---|---|
| `.github/workflows/ci.yml` | CI 门禁（需适配，见第 3 步） |
| `.github/workflows/claude-agent.yml` | 唯一代理入口（需适配） |
| `.github/workflows/ci-auto-fix.yml` | 自愈（免改） |
| `.github/workflows/ai-gate.yml` | 成本闸门（免改） |
| `.github/workflows/ai-dispatcher.yml` | 谷时调度（免改） |
| `.github/ai-policy.yml` | 成本策略（按需调窗口/预算） |
| `.github/ai-providers.yml` | 模型注册表（把 active 换成用户的厂商） |
| `AGENTS.md` | 代理手册骨架（需重写 §1–3，见第 4 步） |
| `CLAUDE.md` | 手册入口（免改，内容只是 @AGENTS.md） |
| `CODEOWNERS` | 护栏（占位符换用户名） |

可选：`weekly-maintenance.yml`、`pr-review.yml`、`model-ops.yml`、
`dependabot.yml`、`dependabot-auto-merge.yml`（全部免改，默认建议全要）。

## 3. 三个同步点适配（缺一处链路即断）

1. **ci.yml**：`pnpm lint/typecheck/test` 三件套与 `pnpm install` 换成第 1 步
   探测到的命令；job 名 `verify` 别改（分支保护按名引用）
2. **AGENTS.md 第 3 节**：与 ci.yml **逐字一致**——代理本地跑的就是手册这套命令
3. **claude-agent.yml** 两处：预装步骤（`pnpm/action-setup` + `pnpm install`
   换成目标栈的安装方式）；工具白名单里的 `Bash(pnpm ...)` 换成目标栈命令
   ——不放行就等于代理无法自验

## 4. 写项目手册（性价比最高的 20 分钟）

- AGENTS.md §1（概览一两句）、§2（技术栈+目录结构）必须读目标仓库实际代码后写实，
  禁止留 TODO；§4 起的规范/红线保留模板原文
- `CODEOWNERS`：`@your-github-username` → 用户 GitHub 用户名
- `ai-providers.yml`：`active:` → 用户厂商；若端点/模型名与预设不符，按文件内注释调整

## 5. 提交 + 输出人工操作清单

- 开分支（如 `chore/adopt-self-driving`）提交全部文件，按目标仓库的 PR 流程发起 PR
- **向用户输出以下人工清单**（网页操作你代劳不了，逐条给精确路径）：
  1. 安装 Claude GitHub App：https://github.com/apps/claude → 对本仓库 Install
  2. 配 Secret ×2：`LLM_API_KEY`（active 厂商的 key）、`PAT_TOKEN`
     （细粒度 PAT，仅本仓库，Contents/Issues/Pull requests 全 Read & write）
  3. 三开关：Allow auto-merge；Actions 读写下 + 允许创建/批准 PR；Dependabot alerts
  4. 分支保护（单人 0 批准）：
     `gh api repos/{owner}/{repo}/branches/main/protection -X PUT --input -` +
     `{"required_status_checks":{"strict":true,"contexts":["verify"]},"enforce_admins":true,"required_pull_request_reviews":{"required_approving_review_count":0,"require_code_owner_reviews":false},"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}`
  5. 预建标签：`fix-me`、`review-this`、`urgent`
  6. （可选）启用每周巡检：Settings → Secrets and variables → Actions →
     **Variables** → `SELF_DRIVING_MAINTENANCE` = `true`——不设则定时巡检
     静默（模板默认零定期 AI 调用），手动 dispatch 不受影响
- PR 合并后再进入第 6 步

## 6. 冒烟三连（每步通过再下一步；失败先查 references/pitfalls.md）

1. **dispatch**：Actions → Claude Agent → Run workflow，指令「新建 issue 汇报仓库现状」
   → 判定：仓库出现代理建的 issue
2. **fix-me**：建 issue「给 README 加一节」打 `fix-me`（峰时会排队属正常；加
   `urgent` 插队）→ 判定：出现 `claude/` 分支 PR 且 CI 绿
3. **自愈**：测试分支故意写个 lint 错误开 PR → 判定：CI 红 → 自动 `@claude` 评论 →
   修复提交 → CI 复绿（注意：代理提交的 CI 偶发 `action_required` 需人工批准）

## 7. 渐进启用建议（转告用户）

第 1 周只开 dispatch+@claude；第 2 周 fix-me+自愈（policy 暂全 always 方便测试）；
第 3 周巡检+审查；第 4 周起收紧成本（`policy_fix_me: offpeak`、按账单调预算）。

## 排障

任何环节失败，先查 [references/pitfalls.md](./references/pitfalls.md)
（11 条实战坑，含症状→原因→解法）。
