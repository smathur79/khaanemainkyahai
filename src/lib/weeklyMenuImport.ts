import { DAYS_OF_WEEK, DayOfWeek, MealType } from '@/types/models';

export type ParsedSlotEntry = {
  day: DayOfWeek;
  meal: MealType;
  dishes: string[];
};

const MEAL_PREFIX_MAP: Record<string, MealType> = {
  b: 'breakfast',
  breakfast: 'breakfast',
  l: 'lunch',
  lunch: 'lunch',
  s: 'snack',
  snack: 'snack',
  d: 'dinner',
  dinner: 'dinner',
};

const ENTRY_TYPE_SUFFIXES = [
  /\(order\s*in\)/gi,
  /\(eat\s*out\)/gi,
  /\(leftovers?\)/gi,
];

export function parseWeeklyMenuText(input: string): ParsedSlotEntry[] {
  const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
  const slotEntries: ParsedSlotEntry[] = [];
  let currentDay: DayOfWeek | null = null;

  for (const line of lines) {
    const normalized = line.toLowerCase();
    const dayMatch = DAYS_OF_WEEK.find(day => normalized.startsWith(day.toLowerCase()));
    if (dayMatch) {
      currentDay = dayMatch;
      continue;
    }

    if (!currentDay) continue;

    const mealMatch = line.match(/^([A-Za-z]+)\s*[:\-]\s*(.+)$/);
    if (!mealMatch) continue;

    const mealType = MEAL_PREFIX_MAP[mealMatch[1].toLowerCase()];
    if (!mealType) continue;

    const dishes = mealMatch[2]
      .split(',')
      .map(dish => ENTRY_TYPE_SUFFIXES.reduce((value, pattern) => value.replace(pattern, ''), dish).trim())
      .filter(Boolean);

    if (dishes.length > 0) {
      slotEntries.push({ day: currentDay, meal: mealType, dishes });
    }
  }

  return slotEntries;
}
