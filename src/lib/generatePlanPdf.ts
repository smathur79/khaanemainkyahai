import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS_OF_WEEK, MEAL_TYPES, DayOfWeek, MealType, Recipe, WeeklyMealSlot } from '@/types/models';

interface GeneratePdfOptions {
  weekLabel: string;
  householdName: string;
  slots: WeeklyMealSlot[];
  recipes: Recipe[];
}

export function generateWeeklyPlanPdf({ weekLabel, householdName, slots, recipes }: GeneratePdfOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const getRecipeTitles = (day: DayOfWeek, meal: MealType): string => {
    const slot = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
    if (!slot || slot.recipeIds.length === 0) return '—';
    return slot.recipeIds
      .map(id => recipes.find(r => r.id === id)?.title ?? '—')
      .map((title, i) => `• ${title}`)
      .join('\n');
  };

  // Header with warm accent bar
  doc.setFillColor(255, 183, 77);
  doc.rect(0, 0, 210, 4, 'F');

  // Title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(`${householdName} — Weekly Meal Plan`, 105, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(weekLabel, 105, 25, { align: 'center' });

  // Table
  const head = [['Day', 'Breakfast', 'Lunch', 'Dinner']];
  const body = DAYS_OF_WEEK.map(day => [
    day,
    ...MEAL_TYPES.map(meal => getRecipeTitles(day, meal)),
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
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    bodyStyles: {
      valign: 'top',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 24 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 55 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 12, right: 12 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text('Family Meal Planner', 105, pageHeight - 8, { align: 'center' });

  doc.save(`meal-plan-${weekLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}
