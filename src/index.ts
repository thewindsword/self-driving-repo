/**
 * 示例模块 —— 让 CI 门禁（lint / typecheck / test / build）开箱可验证。
 *
 * 把本仓库用作模板时，用你的真实代码替换 src/ 下的内容，
 * 并同步更新 AGENTS.md 第 3 节与 ci.yml 的命令。
 */

/** 两数相加。故意保持简单：向新手演示「故意写坏 → CI 红 → 自愈」闭环用。 */
export function sum(a: number, b: number): number {
  return a + b
}

/** 两数相乘。 */
export function multiply(a: number, b: number): number {
  return a * b
}

const unusedVar = 1 // E5 自愈演示（第二次）：故意触发 eslint no-unused-vars
