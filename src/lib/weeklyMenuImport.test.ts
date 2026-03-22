import { describe, expect, it } from 'vitest';

import { parseWeeklyMenuText } from './weeklyMenuImport';

describe('parseWeeklyMenuText', () => {
  it('parses the compact planner format', () => {
    expect(parseWeeklyMenuText(`Monday
B: Poha, Chai
L: Dal tadka, Jeera rice
S: Fruit chaat
D: Chicken curry, Roti`)).toEqual([
      { day: 'Monday', meal: 'breakfast', dishes: ['Poha', 'Chai'] },
      { day: 'Monday', meal: 'lunch', dishes: ['Dal tadka', 'Jeera rice'] },
      { day: 'Monday', meal: 'snack', dishes: ['Fruit chaat'] },
      { day: 'Monday', meal: 'dinner', dishes: ['Chicken curry', 'Roti'] },
    ]);
  });

  it('accepts full meal labels and strips known suffixes', () => {
    expect(parseWeeklyMenuText(`Tuesday
Breakfast: Omelette, Toast
Lunch - Rajma chawal
Snack: Maggi (order in)
Dinner: Paneer bhurji, Roti (eat out)`)).toEqual([
      { day: 'Tuesday', meal: 'breakfast', dishes: ['Omelette', 'Toast'] },
      { day: 'Tuesday', meal: 'lunch', dishes: ['Rajma chawal'] },
      { day: 'Tuesday', meal: 'snack', dishes: ['Maggi'] },
      { day: 'Tuesday', meal: 'dinner', dishes: ['Paneer bhurji', 'Roti'] },
    ]);
  });
});
