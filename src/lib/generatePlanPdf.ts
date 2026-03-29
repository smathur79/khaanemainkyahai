import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek, MealType, Recipe, WeeklyMealSlot } from '@/types/models';

interface RitualForPdf {
  title: string;
  ritual_type: 'morning' | 'night';
  items: { text: string }[];
}

interface GeneratePdfOptions {
  weekLabel: string;
  householdName: string;
  slots: WeeklyMealSlot[];
  recipes: Recipe[];
  rituals?: RitualForPdf[];
}

export function generateWeeklyPlanPdf({ weekLabel, householdName, slots, recipes, rituals }: GeneratePdfOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const getSlotText = (day: DayOfWeek, meal: MealType): string => {
    const slot = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
    if (!slot) return '—';

    // Use items if available (includes free-text items)
    if (slot.items && slot.items.length > 0) {
      const titles = slot.items.map(item => item.title || (item.recipeId ? recipes.find(r => r.id === item.recipeId)?.title : null)).filter(Boolean);
      if (titles.length === 0) return '—';
      return titles.map(t => `• ${t}`).join('\n');
    }

    // Fallback to recipeIds
    if (slot.recipeIds.length === 0) return '—';
    return slot.recipeIds
      .map(id => recipes.find(r => r.id === id)?.title ?? '—')
      .map(title => `• ${title}`)
      .join('\n');
  };

  // Warm header bar
  doc.setFillColor(255, 183, 77);
  doc.rect(0, 0, 210, 4, 'F');

  // Title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(`${householdName} — Weekly Meal Plan`, 105, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(weekLabel, 105, 25, { align: 'center' });

  // Meal plan table with snack column
  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  };

  const head = [['Day', ...PLANNER_MEAL_TYPES.map(m => mealLabels[m] || m)]];
  const body = DAYS_OF_WEEK.map(day => [
    day,
    ...PLANNER_MEAL_TYPES.map(meal => getSlotText(day, meal)),
  ]);

  autoTable(doc, {
    startY: 32,
    head,
    body,
    theme: 'grid',
    styles: {
      textColor: [30, 30, 30],
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      valign: 'top',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      1: { cellWidth: 44 },
      2: { cellWidth: 44 },
      3: { cellWidth: 36 },
      4: { cellWidth: 44 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 10, right: 10 },
  });

  // Get the Y position after the table
  let currentY = (doc as any).lastAutoTable?.finalY ?? 200;

  // Add rituals section if present
  if (rituals && rituals.length > 0) {
    currentY += 8;

    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Daily Rituals', 105, currentY, { align: 'center' });
    currentY += 6;

    const morningRituals = rituals.filter(r => r.ritual_type === 'morning');
    const nightRituals = rituals.filter(r => r.ritual_type === 'night');

    const ritualRows: string[][] = [];

    // Build rows with morning and night side by side
    const maxRows = Math.max(
      morningRituals.reduce((sum, r) => sum + r.items.length + 1, 0),
      nightRituals.reduce((sum, r) => sum + r.items.length + 1, 0),
    );

    const morningLines: string[] = [];
    for (const r of morningRituals) {
      morningLines.push(`☀️ ${r.title}`);
      r.items.forEach(i => morningLines.push(`  □ ${i.text}`));
    }

    const nightLines: string[] = [];
    for (const r of nightRituals) {
      nightLines.push(`🌙 ${r.title}`);
      r.items.forEach(i => nightLines.push(`  □ ${i.text}`));
    }

    const morningText = morningLines.join('\n') || '—';
    const nightText = nightLines.join('\n') || '—';

    autoTable(doc, {
      startY: currentY,
      head: [['Morning', 'Night']],
      body: [[morningText, nightText]],
      theme: 'grid',
      styles: {
        textColor: [30, 30, 30],
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [245, 240, 230],
        textColor: [60, 60, 60],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: { valign: 'top' },
      columnStyles: {
        0: { cellWidth: 92 },
        1: { cellWidth: 92 },
      },
      margin: { left: 10, right: 10 },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text('Family Planner', 105, pageHeight - 8, { align: 'center' });

  doc.save(`meal-plan-${weekLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}
