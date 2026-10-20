import { describe, expect, it } from 'vitest'

import { sum } from './index.js'

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
