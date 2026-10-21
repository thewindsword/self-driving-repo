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
| 6. 成本治理 | 峰谷窗口 + 分触发策略 + 日预算 + 谷时排队 | `ai-policy.yml`、`ai-gate.yml`、`ai-dispatcher.yml` |
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
| `LLM_API_KEY` | 三选一 | 当前 `active` 厂商（见 `.github/ai-providers.yml`，默认 deepseek）的 API key；换厂商时同步换 key |
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
| 成本排队 | 峰时（如工作日白天）建 issue 打 `fix-me` | 被换成 `ai-queue` + 排队评论；等谷时或手动触发 AI Dispatcher 后自动处理 |

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

## 成本治理：AI 何时允许花钱（第 6 层）

所有消耗 AI 的入口（fix-me / @claude / 自愈 / 审查 / 巡检）先过
**ai-gate** 再到代理。策略集中在 `.github/ai-policy.yml`，改完即时生效：

```yaml
timezone: Asia/Shanghai     # 时区
offpeak_start: "22:00"      # 谷时窗口起点（跨零点写 22:00 / 08:00 即可）
offpeak_end:   "08:00"
offpeak_weekend_all_day: true

policy_mention: always      # @claude 交互：有人在等 → 永远放行
policy_fix_me: offpeak      # issue 实现：非紧急 → 排队到谷时
policy_ci_autofix: always   # CI 自愈：主干被阻塞 → 立即修
policy_review: always       # AI 审查
policy_dispatch: always     # 手动入口

budget_runs_per_day: 20     # 每日运行上限（两入口合计，保守计数）
max_turns_peak: 50          # 峰时单次轮次上限
max_turns_offpeak: 80       # 谷时单价低 → 允许跑更久
dispatch_batch: 3           # 谷时调度器每 30 分钟放行几个排队任务
```

**运行时行为**：

| 场景 | 闸门动作 |
|---|---|
| 谷时窗口外的 `fix-me` / `review-this` | 自动换成排队标签（`ai-queue` / `ai-queue-review`）+ 评论告知，谷时批量唤醒 |
| 排队期间需要插队 | 给目标加 `urgent` 标签 → 直通闸门立即处理 |
| 每日运行数达上限 | 拒绝并评论原因（预算、调整入口都写在评论里） |
| 谷时（工作日夜里 + 周末全天，`ai-dispatcher` 定时） | 按剩余预算小批量放行队列——平滑支出，避免成本尖峰 |

排队的本质是**换标签**：谷时调度器用 PAT 把 `ai-queue` 换回 `fix-me`，
复用同一条 labeled 触发链路——不引入队列服务，成本治理零基础设施。

想完全关掉治理（例如刚开荒想随时测试）：把全部 `policy_*` 改成 `always` 即可。

## 模型端点：多厂商与动态切换

厂商注册表集中在 `.github/ai-providers.yml`（DeepSeek / GLM / Kimi / 自建网关预设，
含各自的 Anthropic 兼容端点与默认模型）。两个 AI 入口在运行时按 `active` 厂商
动态注入端点、主模型与小模型环境变量——**换厂商零改代码**。

日常通过 **Model Ops** workflow（Actions → Model Ops → Run workflow）运维：

| action | 做什么 | 说明 |
|---|---|---|
| `list` | **实时拉取**当前厂商的可用模型列表 → run summary | 厂商上新模型后先刷新再看，注册表里的默认名可能滞后 |
| `set-model` | 把当前厂商默认模型设为你选的名字 | 先实时校验该名字确在列表中，再开 PR 应用 |
| `switch` | 切换 `active` 厂商 | 开 PR 应用；⚠️ 合并后必须手动把 `LLM_API_KEY` 换成新厂商的 key |

所有变更都走 PR + CI（`verify`）生效——连切模型也不直改 main，与仓库其他改动同一套闸门。

## 进阶（跑顺后再加）

- **换代理实现**：只改 `claude-agent.yml`（OpenHands CLI、Codex、自研 worker 均可），
  其余四层不感知
- **审查代理闭环**：自愈修复后的 PR 自动打 `review-this`，让审查代理先 vet 一遍再交人工
- **成本控制**：调策略集中在 `.github/ai-policy.yml`——峰谷窗口、每日预算、
  分触发放行、谷时排队，详见「成本治理」一节
- **preview 环境**：接 Cloudflare Pages / Vercel，代理 PR 自动出预览链接
- **覆盖率门禁**：CI 加覆盖率阈值，让「不许降覆盖」成为机器强制
