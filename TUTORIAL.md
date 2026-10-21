# 接入教程：把「自驾驶核心」装进你已有的项目

> 目标读者：**已有代码仓库**，想获得 issue → 代理 → CI → 分级合并的自开发/自维护能力。
> 你不需要搬走整个模板——需要的是 **11 个文件 + 4 项平台配置 + 冒烟三连**。
> 本教程的每一条「坑」都来自真实踩坑记录，不是理论推演。

## 0. 核心心智模型

```
触发器（issue fix-me / @claude 评论 / CI 失败 / 定时巡检）
   ↓
AI 闸门（峰谷窗口 · 分触发放行 · 日预算）—— 排队或拒绝
   ↓
claude-agent.yml（全仓库唯一代理入口：读 AGENTS.md → 改代码 → 自验 → 开 PR）
   ↓
CI verify 硬门槛（lint / typecheck / test）
   ↓
你：看 diff → 按合并键（这是唯一的人工闸门）
```

三条铁律：
1. **所有代理入口收敛到一个 workflow 文件**（`claude-agent.yml`）——换代理只改它
2. **AGENTS.md 决定产出质量**——代理上岗只读这份手册，命令必须真实可跑
3. **人工闸门 = CI 硬门槛 + 合并按钮**——不指望批准数（单人仓库会死锁，见 §3）

## 1. 最小文件集（从本模板拷贝）

| # | 文件 | 作用 | 必改点 |
|---|---|---|---|
| 1 | `.github/workflows/ci.yml` | CI 门禁 | 三件套命令换成你的栈；job 名 `verify`（或同步改分支保护 context） |
| 2 | `.github/workflows/claude-agent.yml` | 唯一代理入口 | 工具白名单里的 `pnpm:*` 换成你的包管理器 |
| 3 | `AGENTS.md` + `CLAUDE.md` | 代理手册 | **全部重写第 1–3 节**（概览/结构/命令） |
| 4 | `CODEOWNERS` | 护栏 | 占位符换成你的用户名 |
| 5 | `.github/workflows/ci-auto-fix.yml` | 自愈 | 无需改（防循环/熔断逻辑通用） |
| 6–8 | `.github/ai-policy.yml` + `ai-gate.yml` + `ai-dispatcher.yml` | 成本治理 | 调窗口/预算即可 |
| 9–10 | `.github/ai-providers.yml` + `model-ops.yml` | 模型运维 | `active` 换成你的厂商 |
| 11（可选） | `pr-review.yml` / `weekly-maintenance.yml` / `dependabot*.yml` | 审查/巡检/被动维护 | 无需改 |

## 2. 适配你的技术栈（最重要的 20 分钟）

**三个地方必须同步改，缺一处链路就断：**

1. `ci.yml`：`pnpm lint/typecheck/test` → 你的命令（Java? `mvn verify`。Python? `ruff && pytest`。）
2. `AGENTS.md` 第 3 节：与 ci.yml **逐字一致**——代理在本地跑的就是手册里这套命令
3. `claude-agent.yml` 两处：
   - 预装步骤（`pnpm/action-setup` + `pnpm install`）→ 你的包管理器与安装命令
   - 工具白名单 `Bash(pnpm ...)` → 你的三件套命令（**不放行就等于代理无法自验**）

另外把 AGENTS.md 第 1、2 节写实：这个项目是什么、目录怎么组织、有什么禁令。
手册质量 = 代理产出质量，这是全系统性价比最高的 20 分钟。

## 3. 四项平台配置（约 15 分钟）

**① Secrets ×2**（Settings → Secrets and variables → Actions）
- `LLM_API_KEY`：active 厂商的 key（注册表默认 DeepSeek）
- `PAT_TOKEN`：细粒度 PAT，**仅本仓库**，Contents / Issues / Pull requests 全 Read & write
  ——没有它：代理 PR 不跑 CI、自愈评论唤不醒代理、巡检/调度器全部空转（workflow 会 fail-fast 提示）

**② 安装 Claude GitHub App**：https://github.com/apps/claude → 对本仓库 Install

**③ 三个开关**（Settings）
- General → Pull Requests → ✅ Allow auto-merge
- Actions → General → Workflow permissions → **Read and write** + ✅ 允许创建和批准 PR
- Code security → ✅ Dependabot alerts / security updates

**④ 分支保护（main）——单人仓库必须 0 批准**

GitHub 禁止 PR 作者批准自己：单人 + 1 批准 = 你开的 PR 永远死锁。
单人形态下「你点合并」就是人工审查本身：

```bash
gh api repos/{owner}/{repo}/branches/main/protection -X PUT --input - <<'EOF'
{"required_status_checks":{"strict":true,"contexts":["verify"]},"enforce_admins":true,"required_pull_request_reviews":{"required_approving_review_count":0,"require_code_owner_reviews":false},"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
EOF
```

（团队协作时改回 1 批准 + UI 勾 Require review from code owners。）

最后预建标签：`fix-me`、`review-this`、`urgent`（其余 workflow 会自建）。

## 4. 冒烟三连（按序，每步通过再下一步）

| 步 | 操作 | 通过标准 |
|---|---|---|
| ① dispatch | Actions → Claude Agent → Run workflow，指令「新建 issue 汇报仓库现状」 | 仓库出现代理创建的 issue |
| ② fix-me | 建 issue「给 README 加一节」打 `fix-me`（峰时会排队——加 `urgent` 可插队） | 出现 `claude/` 分支的 PR，CI 绿 |
| ③ 自愈 | 测试分支故意写个 lint 错误开 PR | CI 红 → 自动 `@claude` 评论 → 修复提交 → CI 复绿 |

## 5. 踩坑速查表（全部来自实战）

| 症状 | 原因 | 解法 |
|---|---|---|
| `Either ANTHROPIC_API_KEY... is required` | 兼容端点模式下没传 action 认得的凭据 | 保持「三件套」：`anthropic_api_key` + 环境注入 `ANTHROPIC_BASE_URL`/`AUTH_TOKEN`（本模板已内置） |
| run 成功但代理没干活 | headless 下未白名单的 Bash 一律拒绝（日志见 `permission_denials_count`） | 扩 `--allowedTools` 白名单 |
| 代理说「无法执行 pnpm」 | runner 不预装你的包管理器 | workflow 里预装 + 预装依赖（模板已内置） |
| 修复提交的 CI 卡在 `action_required` | GitHub 对自动推送的偶发人工批准要求 | Actions 页 Approve run（或 approve API） |
| CI 失败但代码看起来没问题 | runner 环境瞬时故障（registry 抖动等） | 重跑；自愈第二轮会自动兜 |
| 你自己的 PR 没人能批准 | GitHub 禁止作者自批 × 单人仓库 | 分支保护用 0 批准形态（§3④） |
| 代理 PR 不跑 CI / 自愈评论无反应 | 缺 `PAT_TOKEN`（GITHUB_TOKEN 递归保护） | 配 PAT；相关 workflow 本会 fail-fast 提示 |
| gate 显示 `预算耗尽` | 当日代理运行数达上限 | 次日恢复；或调 `ai-policy.yml` 的 `budget_runs_per_day` |
| `unknown flag: --argjson` | gh api 不支持 jq 的传参 flag | 用 ISO 字符串比较（模板已内置） |
| 定时 workflow 从未运行、每次 push 反而失败 | cron 星期字段写了 `7`——GitHub 只认 **0-6**（周日=0），一个非法 cron 让整个文件解析失败 | 写 `6,0`；上线后手动 dispatch 一次即可验证文件可解析 |
| 审查评论已发出但 run 判负 `exceeding the configured maximum` | 轮次上限过紧（带行内评论的审查实测 16+ 轮） | 调大 `--max-turns`（本模板审查用 25） |

## 6. 日常工作流（自开发与自维护）

| 你想做什么 | 怎么做 |
|---|---|
| 加功能 / 修 bug | 开 issue 写清需求与验收标准 → 打 `fix-me`（非紧急让它谷时跑；`urgent` 插队） |
| 对某个 PR 提要求 | PR 下评论 `@claude <指令>`（它直接推提交到该分支） |
| 一次性杂务 | Actions → Claude Agent → dispatch 带指令 |
| 切模型 / 换厂商 | Actions → Model Ops：`list` 实时看列表 → `set-model` 选择生效 |
| 看花了多少钱 | Actions 里数 Claude Agent 的日运行数 vs `budget_runs_per_day` |
| 每周例行 | 周一自动巡检（谷时）；你有空时收割 `needs-human`（自愈熔断转人工的 PR） |
| 换代理实现 | 只改 `claude-agent.yml`，其余六层不感知 |

## 7. 渐进式启用建议（别一步到位）

- **第 1 周**：只开 dispatch + @claude（人工在环，观察产出质量，随时补 AGENTS.md）
- **第 2 周**：放开 fix-me + 自愈（`policy_fix_me: always` 方便测试）
- **第 3 周**：开巡检 + AI 审查（`review-this`）
- **第 4 周起**：收紧成本——`policy_fix_me: offpeak`、按账单调预算与峰谷窗口

每阶段跑一周再进下一阶段；出问题回退一格比全量排障便宜得多。
