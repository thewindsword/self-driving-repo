# 自维护仓库模板（Claude Code 版）

把一个空 GitHub 仓库改造成「自维护、自开发」的闭环系统：
**触发器（issue / PR / CI 失败 / 定时）→ 代理改代码 → CI 验证 → 分级合并**。

本版代理层使用 [claude-code-action](https://github.com/anthropics/claude-code-action)
（官方维护的 GitHub Action，完全跑在你自己的 runner 上）。
模型三选一：Anthropic 官方 API、Claude 订阅（Pro/Max）、
或任何 **Anthropic 兼容端点**——GLM、Kimi、DeepSeek 等均可，不锁定单一厂商。

> 模板自带一个最小示例项目（pnpm + TypeScript + vitest + eslint），
> 让 CI 门禁与自愈链路**开箱可验证**；接入真实项目时整体替换 `src/` 即可。

## 五层架构与文件对应

| 层 | 能力 | 文件 |
|---|---|---|
| 1. 地基 | CI 门禁 + 代理手册 | `ci.yml`、`AGENTS.md`、`CLAUDE.md` |
| 2. 被动维护 | 依赖/Action 自动升级，patch 级自动合并 | `dependabot.yml`、`dependabot-auto-merge.yml` |
| 3. 代理开发 | `fix-me` 标签 / `@claude` 交互 + 每周巡检 | `claude-agent.yml`、`weekly-maintenance.yml` |
| 4. 自愈 CI | CI 失败自动呼叫代理修复（防循环 + 熔断） | `ci-auto-fix.yml` |
| 5. 护栏 | 分支保护、CODEOWNERS 强制人工兜底 | `CODEOWNERS` + 下方启用清单 |
| 可选 | AI PR 审查（review-this 标签） | `pr-review.yml` |

**架构特点：所有代理入口收敛到 `claude-agent.yml` 一处。** 自愈和巡检不直接跑代理，
而是发评论/建 issue 唤起代理——触发逻辑（第 2、4 层）与代理执行（第 3 层）解耦，
日后换代理实现（OpenHands、Codex、自研 SDK……）只改这一个文件。

## 启用清单（按顺序执行，约 30 分钟）

### 1. 推入仓库
```bash
git init && git add . && git commit -m "chore: 自维护脚手架"
gh repo create <repo-name> --private --source=. --push
```

### 2. 安装 Claude GitHub App
打开 https://github.com/apps/claude ，对本仓库 Install。

### 3. 配置密钥（Settings → Secrets and variables → Actions）

| Secret | 必填 | 说明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 三选一 | Anthropic 官方 API key |
| `CLAUDE_CODE_OAUTH_TOKEN` | 三选一 | Claude 订阅（Pro/Max 本地执行 `claude setup-token` 生成） |
| `LLM_BASE_URL` + `LLM_API_KEY` | 三选一 | 第三方 Anthropic 兼容端点（GLM/Kimi/DeepSeek 等）；配好后按 `claude-agent.yml` 注释切到 `settings` 方式 |
| `PAT_TOKEN` | 强烈建议 | 个人访问令牌（contents / issues / pull requests 读写），见下方「关于 PAT」 |

### 4. 打开三个开关（Settings）
- General → Pull Requests → ✅ **Allow auto-merge**
- General → Actions → Workflow permissions → **Read and write** + ✅ **Allow GitHub Actions to create and approve pull requests**
- Code security → ✅ 启用 Dependabot alerts / security updates

### 5. 设置分支保护（main）
```bash
gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["verify"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f restrictions=null
```
（`verify` 是 `ci.yml` 的 job 名。建议同时在 UI 勾选
**Require review from code owners**，让 `CODEOWNERS` 生效。）

### 6. 替换占位内容
- `CODEOWNERS` 里的 `@your-github-username` → 你的用户名/团队
- 真实项目：替换 `src/` 与 `package.json`，并同步更新 `AGENTS.md` 第 3 节和 `ci.yml` 的命令
  （**这步直接决定代理产出质量**——代理上岗只读 `AGENTS.md`）

## 关于 PAT（为什么强烈建议）

GitHub 有递归保护：**GITHUB_TOKEN 产生的动作不会触发新的 workflow**。这会断掉三条链路：

1. 代理用 GITHUB_TOKEN 开的 PR → CI 不会自动跑 → 「CI 绿才合并」卡死
2. 自愈用 GITHUB_TOKEN 发的 `@claude` 评论 → 唤不醒代理
3. 巡检用 GITHUB_TOKEN 建的 issue → 打了 fix-me 也没反应

配置 `PAT_TOKEN`（权限：contents / issues / pull requests 读写）后，
以上环节都以你的身份行动，链路全通。没配 PAT 时模板会快速失败并给出明确提示，
而不是静默半残。

## 验证各环节（每项 5 分钟）

| 验证 | 操作 | 预期 |
|---|---|---|
| 代理交互 | 建 issue「给 README 加一段项目简介」并打 `fix-me` 标签 | 代理启动 → 开 `claude/` 分支 PR → issue 里报告结果 |
| 提及交互 | 在任意 PR 评论 `@claude 把函数名改成驼峰` | 代理响应该评论并推提交 |
| 自愈 | 在测试 PR 里故意写个 lint 错误 | CI 红 → 自动评论呼叫代理 → 代理推修复 |
| 自动合并 | 等 Dependabot 开一个 patch PR | 自动批准 + CI 绿后自动 squash 合并 |
| 巡检 | Actions 页手动触发「Weekly Maintenance」 | 创建巡检 issue → 打 fix-me → 代理产出 PR 或报告 |
| PR 审查 | 给任意 PR 打 `review-this` 标签 | 收到分级行内审查评论（🔴🟡🔵） |

## 分级合并策略（已内置）

| 改动类型 | 合并方式 | 由谁执行 |
|---|---|---|
| patch 依赖更新 | 自动批准 + CI 绿即合 | `dependabot-auto-merge.yml` |
| minor 依赖更新 | 自动批准，人工点合并 | `dependabot-auto-merge.yml` |
| major 依赖更新 | 全人工 | — |
| 代理生成的代码 PR | 一律人工 review（跑顺 2 周后再放宽文档类） | 分支保护 |
| `.github/`、手册、核心路径 | 永远人工 | CODEOWNERS 强制 |

## 安全边界（已内置）

- `main` 受保护（必需状态检查 `verify` + 1 个人工批准），代理无法直推
- `fix-me` 标签与 `@claude` 评论触发均要求写权限，防外部提示词注入
- `ci-auto-fix.yml` 三重防循环：跳过 `claude/` 分支、跳过 `dependabot/` 分支、
  同一 PR 自动呼叫满 3 次熔断转人工（`needs-human` 标签）
- 巡检去重：已有未完成巡检 issue 时不重复创建
- 各 workflow 的 permissions 按需最小化声明
- `AGENTS.md` 红线经 `CLAUDE.md` 注入到每次代理执行（Claude Code 原生读取）

## 进阶（跑顺后再加）

- **换代理实现**：只改 `claude-agent.yml`（OpenHands CLI、Codex、自研 worker 均可），
  其余四层不感知
- **审查代理闭环**：自愈修复后的 PR 自动打 `review-this`，让审查代理先 vet 一遍再交人工
- **成本控制**：调低 `claude-agent.yml` 的 `--max-turns`（简单任务 20 足够）
- **preview 环境**：接 Cloudflare Pages / Vercel，代理 PR 自动出预览链接
- **覆盖率门禁**：CI 加覆盖率阈值，让「不许降覆盖」成为机器强制
