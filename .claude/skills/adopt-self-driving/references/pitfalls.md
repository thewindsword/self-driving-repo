# 踩坑速查表（11 条，全部来自 self-driving-repo 模板仓库的真实事故）

> 与 TUTORIAL.md §5 同步维护——修坑时两处一起改。

| 症状 | 原因 | 解法 |
|---|---|---|
| `Either ANTHROPIC_API_KEY... is required` | 兼容端点模式下没传 action 认得的凭据 | 保持「三件套」：`anthropic_api_key` + 环境注入 `ANTHROPIC_BASE_URL`/`AUTH_TOKEN`（模板已内置） |
| run 成功但代理没干活 | headless 下未白名单的 Bash 一律拒绝（日志 `permission_denials_count`） | 扩 `--allowedTools` 白名单 |
| 代理说「无法执行 pnpm」 | runner 不预装你的包管理器 | workflow 里预装 + 预装依赖（模板已内置） |
| 修复提交的 CI 卡在 `action_required` | GitHub 对自动推送的偶发人工批准要求 | Actions 页 Approve run（或 `gh api repos/<repo>/actions/runs/<id>/approve -X POST`） |
| CI 失败但代码看起来没问题 | runner 环境瞬时故障（registry 抖动等） | 重跑；自愈第二轮会自动兜 |
| 你自己的 PR 没人能批准 | GitHub 禁止作者自批 × 单人仓库 | 分支保护用 0 批准形态 |
| 代理 PR 不跑 CI / 自愈评论无反应 | 缺 `PAT_TOKEN`（GITHUB_TOKEN 递归保护） | 配 PAT；相关 workflow 本会 fail-fast 提示 |
| gate 显示 `预算耗尽` | 当日代理运行数达上限 | 次日恢复；或调 `ai-policy.yml` 的 `budget_runs_per_day` |
| `unknown flag: --argjson` | gh api 不支持 jq 的传参 flag | 用 ISO 字符串比较（模板已内置） |
| 定时 workflow 从未运行、每次 push 反而失败 | cron 星期字段写了 `7`——GitHub 只认 **0-6**（周日=0），一个非法 cron 让整个文件解析失败 | 写 `6,0`；上线后手动 dispatch 一次即可验证文件可解析 |
| 审查评论已发出但 run 判负 `exceeding the configured maximum` | 轮次上限过紧（带行内评论的审查实测 16+ 轮） | 调大 `--max-turns`（模板审查用 25） |
| 谷时排发总在半夜报「预算耗尽」跳过 | `date -d 'today 00:00' --utc` 的 `--utc` 会连 `-d` 的**解析**一起切到 UTC——cutoff 变成 UTC 零点，夜间把前一天的全部运行计入今日 | 两步法：先取策略时区零点的 epoch（与时区无关），再 `date -u -d @epoch` 转 UTC ISO（模板已内置） |
