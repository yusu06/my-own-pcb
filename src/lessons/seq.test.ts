import { expect, test } from 'vitest';
import { clocked } from './seq';

test('clocked는 주기마다 clk 0, 1 두 단계로 편다', () => {
  expect(clocked([{ d: 1 }, { d: 0 }])).toEqual([{ d: 1, clk: 0 }, { d: 1, clk: 1 }, { d: 0, clk: 0 }, { d: 0, clk: 1 }]);
});

test("late 신호는 clk가 올라가는 단계에서만 바뀐다(clk=0 단계는 앞 주기 값)", () => {
  expect(clocked([{ rst: 1, d: 1 }, { rst: 0, d: 0 }], ["rst"])).toEqual([
    { rst: 0, d: 1, clk: 0 },
    { rst: 1, d: 1, clk: 1 },
    { rst: 1, d: 0, clk: 0 },
    { rst: 0, d: 0, clk: 1 },
  ]);
});
