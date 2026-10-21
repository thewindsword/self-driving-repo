import { describe, expect, it } from 'vitest'

import { multiply, sum } from './index.js'

describe('sum', () => {
  it('两数相加', () => {
    expect(sum(1, 2)).toBe(3)
    expect(sum(10, -4)).toBe(6)
  })

  it('处理零与负数', () => {
    expect(sum(0, 0)).toBe(0)
    expect(sum(-3, -9)).toBe(-12)
  })
})

describe('multiply', () => {
  it('两数相乘（正数）', () => {
    expect(multiply(2, 3)).toBe(6)
    expect(multiply(10, 4)).toBe(40)
  })

  it('处理负数', () => {
    expect(multiply(-3, 4)).toBe(-12)
    expect(multiply(-3, -9)).toBe(27)
  })

  it('处理零', () => {
    expect(multiply(0, 5)).toBe(0)
    expect(multiply(7, 0)).toBe(0)
    expect(multiply(0, 0)).toBe(0)
  })
})
