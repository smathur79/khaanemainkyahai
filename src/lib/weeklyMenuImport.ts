import { DAYS_OF_WEEK, DayOfWeek, MealType } from '@/types/models';

export type ParsedSlotEntry = {
  day: DayOfWeek;
  meal: MealType;
  dishes: string[];
};

const MEAL_PREFIX_MAP: Record<string, MealType> = {
  pw: 'smoothie',
  'post-workout': 'smoothie',
  postworkout: 'smoothie',
  'post workout': 'smoothie',
  b: 'breakfast',
  breakfast: 'breakfast',
  mid: 'snack',
  'mid-morning': 'snack',
  'mid morning': 'snack',
  midmorning: 'snack',
  l: 'lunch',
  lunch: 'lunch',
  s: 'dessert',
  snack: 'dessert',
  'evening snack': 'dessert',
  'evening-snack': 'dessert',
  d: 'dinner',
  dinner: 'dinner',
};

const ENTRY_TYPE_SUFFIXES = [
  /\(order\s*in\)/gi,
  /\(eat\s*out\)/gi,
  /\(leftovers?\)/gi,
];

export function parseWeeklyMenuText(input: string): ParsedSlotEntry[] {
  const tableEntries = parseMarkdownTable(input);
  if (tableEntries.length > 0) return tableEntries;

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

function parseMarkdownTable(input: string): ParsedSlotEntry[] {
  const rows = input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|') && line.endsWith('|'))
    .map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));

  if (rows.length < 3) return [];

  const header = rows[0].map(normalizeHeader);
  const dayIndex = header.findIndex(cell => cell === 'day');
  if (dayIndex < 0) return [];

  const mealColumns = header
    .map((cell, index) => ({ index, meal: MEAL_PREFIX_MAP[cell] }))
    .filter((column): column is { index: number; meal: MealType } => Boolean(column.meal));

  if (mealColumns.length === 0) return [];

  const entries: ParsedSlotEntry[] = [];

  for (const row of rows.slice(2)) {
    const day = parseDay(row[dayIndex] ?? '');
    if (!day) continue;

    for (const { index, meal } of mealColumns) {
      const dishes = splitDishes(row[index] ?? '');
      if (dishes.length > 0) entries.push({ day, meal, dishes });
    }
  }

  return entries;
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\\\|/g, '|')
    .trim();
}

function parseDay(value: string): DayOfWeek | null {
  const normalized = value.toLowerCase().slice(0, 3);
  return DAYS_OF_WEEK.find(day => day.toLowerCase().startsWith(normalized)) ?? null;
}

function splitDishes(value: string): string[] {
  return value
    .split(',')
    .map(dish => ENTRY_TYPE_SUFFIXES.reduce((current, pattern) => current.replace(pattern, ''), dish).trim())
    .filter(Boolean);
}
