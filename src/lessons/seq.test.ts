import { expect, test } from 'vitest';
import { clocked } from './seq';

test('clocked는 주기마다 clk 0, 1 두 단계로 편다', () => {
  expect(clocked([{ d: 1 }, { d: 0 }])).toEqual([{ d: 1, clk: 0 }, { d: 1, clk: 1 }, { d: 0, clk: 0 }, { d: 0, clk: 1 }]);
});
