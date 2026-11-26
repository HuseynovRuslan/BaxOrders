import { describe, expect, it } from 'vitest'
import { ordinal } from './format'

describe('ordinal', () => {
  it('follows the last word of the number said aloud', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(ordinal)).toEqual(['1-ci', '2-ci', '3-cü', '4-cü', '5-ci', '6-cı', '7-ci', '8-ci', '9-cu'])
    expect([10, 20, 30, 40, 50, 60, 70, 80, 90].map(ordinal)).toEqual(['10-cu', '20-ci', '30-cu', '40-cı', '50-ci', '60-cı', '70-ci', '80-ci', '90-cı'])
    expect([11, 23, 41, 56, 100, 103, 1000].map(ordinal)).toEqual(['11-ci', '23-cü', '41-ci', '56-cı', '100-cü', '103-cü', '1.000-ci'])
  })
})
