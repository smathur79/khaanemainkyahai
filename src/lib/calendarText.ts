import type { FamilyEvent } from '@/types/models';

interface PrepMealEntry {
  meal: string;
  label: string;
  emoji: string;
  recipes: { title: string; prepTimeMinutes: number }[];
  entryType?: string | null;
}

interface BuildPrepPlanMessageArgs {
  dayLabel: string;
  dateLabel: string;
  nightPrep: string[];
  morningPrep: string[];
  meals: PrepMealEntry[];
  notes?: string;
}

export function buildPrepPlanMessage({
  dayLabel,
  dateLabel,
  nightPrep,
  morningPrep,
  meals,
  notes = '',
}: BuildPrepPlanMessageArgs): string {
  const lines: string[] = [];
  lines.push(`📋 *${dayLabel}'s Plan* (${dateLabel})`);
  lines.push('');

  if (nightPrep.length > 0) {
    lines.push('🌙 *Night Prep*');
    lines.push(...nightPrep.map(item => `• ${item}`));
    lines.push('');
  }

  if (morningPrep.length > 0) {
    lines.push('☀️ *Morning*');
    lines.push(...morningPrep.map(item => `• ${item}`));
    lines.push('');
  }

  for (const meal of meals) {
    lines.push(`${meal.emoji} *${meal.label}*`);
    if (meal.recipes.length > 0) {
      meal.recipes.forEach(recipe => {
        lines.push(`• ${recipe.title} (${recipe.prepTimeMinutes}m)`);
      });
    } else if (meal.entryType && meal.entryType !== 'cooked') {
      lines.push(`• ${meal.entryType.replace('_', ' ')}`);
    } else {
      lines.push('• Not planned');
    }
    lines.push('');
  }

  if (notes.trim()) {
    lines.push('📝 *Notes*');
    lines.push(notes.trim());
    lines.push('');
  }

  return lines.join('\n');
}

export function toCalendarDetailsText(text: string): string {
  return text.replace(/\*/g, '').trim();
}

export function buildFamilyEventCalendarDetails(event: FamilyEvent, memberName?: string): string {
  const lines: string[] = [];

  if (event.startTime || event.endTime) {
    lines.push(
      `Time: ${event.startTime ?? 'TBD'}${event.endTime ? ` - ${event.endTime}` : ''}`
    );
  }

  if (memberName) lines.push(`Family member: ${memberName}`);
  if (event.location) lines.push(`Location: ${event.location}`);
  if (event.travelTimeMinutes) lines.push(`Travel time: ${event.travelTimeMinutes} min`);

  if (event.notes?.trim()) {
    if (lines.length > 0) lines.push('');
    lines.push(event.notes.trim());
  }

  return lines.join('\n').trim();
}
