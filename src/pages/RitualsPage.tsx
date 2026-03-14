import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sun, Moon, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type RitualType = 'morning' | 'night';

interface RitualItem {
  id: string;
  text: string;
  sort_order: number;
}

interface Ritual {
  id: string;
  title: string;
  ritual_type: RitualType;
  is_active: boolean;
  items: RitualItem[];
}

export default function RitualsPage() {
  const { householdId, role } = useAuth();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RitualType>('morning');
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const isPlanner = role === 'planner';

  const loadRituals = useCallback(async () => {
    if (!householdId) return;
    const { data: rData } = await supabase
      .from('ritual_templates')
      .select('*')
      .eq('household_id', householdId);

    if (!rData || rData.length === 0) { setRituals([]); setLoading(false); return; }

    const ids = rData.map(r => r.id);
    const { data: iData } = await supabase
      .from('ritual_template_items')
      .select('*')
      .in('ritual_template_id', ids)
      .order('sort_order');

    setRituals(rData.map(r => ({
      id: r.id,
      title: r.title,
      ritual_type: r.ritual_type as RitualType,
      is_active: r.is_active,
      items: (iData ?? [])
        .filter(i => i.ritual_template_id === r.id)
        .map(i => ({ id: i.id, text: i.text, sort_order: i.sort_order })),
    })));
    setLoading(false);
  }, [householdId]);

  useEffect(() => { loadRituals(); }, [loadRituals]);

  // Reset checked items daily (stored in state only)
  const toggleCheck = (itemId: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const handleCreateRitual = async () => {
    if (!householdId) return;
    const title = activeTab === 'morning' ? 'Morning Routine' : 'Night Routine';
    await supabase.from('ritual_templates').insert({
      household_id: householdId,
      ritual_type: activeTab as any,
      title,
      is_active: true,
    });
    toast.success('Ritual created!');
    await loadRituals();
  };

  const handleAddItem = async (ritualId: string) => {
    const text = newItemText[ritualId]?.trim();
    if (!text) return;
    const ritual = rituals.find(r => r.id === ritualId);
    const maxOrder = ritual ? Math.max(0, ...ritual.items.map(i => i.sort_order)) + 1 : 0;
    await supabase.from('ritual_template_items').insert({
      ritual_template_id: ritualId,
      text,
      sort_order: maxOrder,
    });
    setNewItemText(prev => ({ ...prev, [ritualId]: '' }));
    await loadRituals();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('ritual_template_items').delete().eq('id', itemId);
    await loadRituals();
  };

  const handleDeleteRitual = async (ritualId: string) => {
    if (!confirm('Delete this ritual and all its items?')) return;
    // Delete items first
    await supabase.from('ritual_template_items').delete().eq('ritual_template_id', ritualId);
    await supabase.from('ritual_templates').delete().eq('id', ritualId);
    toast.success('Ritual deleted');
    await loadRituals();
  };

  const filtered = rituals.filter(r => r.ritual_type === activeTab);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Daily Rituals</h1>
        <p className="text-sm text-muted-foreground">Morning & night routines for the family</p>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'morning' ? 'default' : 'outline'}
            onClick={() => setActiveTab('morning')}
          >
            <Sun className="mr-1 h-4 w-4" /> Morning
          </Button>
          <Button
            variant={activeTab === 'night' ? 'default' : 'outline'}
            onClick={() => setActiveTab('night')}
          >
            <Moon className="mr-1 h-4 w-4" /> Night
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="card-warm p-8 text-center">
            <div className="text-4xl mb-3">{activeTab === 'morning' ? '🌅' : '🌙'}</div>
            <p className="text-muted-foreground mb-4">No {activeTab} ritual yet</p>
            {isPlanner && (
              <Button onClick={handleCreateRitual}>
                <Plus className="mr-1 h-4 w-4" /> Create {activeTab} ritual
              </Button>
            )}
          </Card>
        ) : (
          filtered.map(ritual => (
            <Card key={ritual.id} className="card-warm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ritual.ritual_type === 'morning' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-400" />}
                  <h3 className="font-semibold">{ritual.title}</h3>
                </div>
                {isPlanner && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRitual(ritual.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                {ritual.items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                      checkedItems.has(item.id) ? 'bg-primary/5' : 'bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={checkedItems.has(item.id)}
                      onCheckedChange={() => toggleCheck(item.id)}
                    />
                    <span className={`flex-1 text-sm ${checkedItems.has(item.id) ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    {isPlanner && (
                      <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add item */}
              {isPlanner && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a step..."
                    value={newItemText[ritual.id] ?? ''}
                    onChange={e => setNewItemText(prev => ({ ...prev, [ritual.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem(ritual.id)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleAddItem(ritual.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Progress */}
              {ritual.items.length > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{ritual.items.filter(i => checkedItems.has(i.id)).length}/{ritual.items.length}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${(ritual.items.filter(i => checkedItems.has(i.id)).length / ritual.items.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))
        )}

        {isPlanner && filtered.length > 0 && (
          <Button variant="outline" onClick={handleCreateRitual} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Add another {activeTab} ritual
          </Button>
        )}
      </motion.div>
    </AppLayout>
  );
}
