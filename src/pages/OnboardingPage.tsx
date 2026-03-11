import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { FamilyMember, FoodType, SpiceLevel, MemberLabel, FOOD_TYPES, CUISINES } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Users, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const LABELS: MemberLabel[] = ['Parent', 'Kid', 'Other'];
const SPICE_LEVELS: SpiceLevel[] = ['Low', 'Medium', 'High'];

interface MemberForm {
  name: string;
  label: MemberLabel;
  foodType: FoodType;
  likes: string;
  dislikes: string;
  exclusions: string;
  spiceLevel: SpiceLevel;
  preferredCuisines: string[];
  notes: string;
}

const emptyMember: MemberForm = {
  name: '', label: 'Parent', foodType: 'Non-Vegetarian', likes: '', dislikes: '', exclusions: '', spiceLevel: 'Medium', preferredCuisines: [], notes: '',
};

export default function OnboardingPage() {
  const { setupHousehold, addFamilyMember } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState<'household' | 'members'>('household');
  const [householdName, setHouseholdName] = useState('');
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }]);
  const [householdId, setHouseholdId] = useState('');

  const handleHouseholdSubmit = () => {
    if (!householdName.trim()) return;
    const hid = setupHousehold(householdName.trim());
    setHouseholdId(hid);
    setStep('members');
  };

  const updateMember = (idx: number, updates: Partial<MemberForm>) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m));
  };

  const addMember = () => {
    setMembers(prev => [...prev, { ...emptyMember }]);
  };

  const removeMember = (idx: number) => {
    if (members.length <= 1) return;
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleCuisine = (idx: number, cuisine: string) => {
    setMembers(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      const has = m.preferredCuisines.includes(cuisine);
      return { ...m, preferredCuisines: has ? m.preferredCuisines.filter(c => c !== cuisine) : [...m.preferredCuisines, cuisine] };
    }));
  };

  const handleFinish = () => {
    for (const m of members) {
      if (!m.name.trim()) continue;
      addFamilyMember({
        name: m.name.trim(),
        label: m.label,
        foodType: m.foodType,
        likes: m.likes.split(',').map(s => s.trim()).filter(Boolean),
        dislikes: m.dislikes.split(',').map(s => s.trim()).filter(Boolean),
        exclusions: m.exclusions.split(',').map(s => s.trim()).filter(Boolean),
        spiceLevel: m.spiceLevel,
        preferredCuisines: m.preferredCuisines,
        notes: m.notes,
      });
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Family Meal Planner</h1>
          <p className="text-muted-foreground mt-2">Set up your household to get started</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'household' ? (
            <motion.div key="household" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="p-6 card-warm">
                <h2 className="text-xl font-semibold mb-4">Name your household</h2>
                <Input
                  placeholder="e.g. The Sharma Family"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  className="text-lg"
                  onKeyDown={e => e.key === 'Enter' && handleHouseholdSubmit()}
                />
                <Button onClick={handleHouseholdSubmit} className="mt-4 w-full" disabled={!householdName.trim()}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="members" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Add family members</h2>
              </div>
              <div className="space-y-4">
                {members.map((member, idx) => (
                  <Card key={idx} className="p-4 card-warm relative">
                    {members.length > 1 && (
                      <button onClick={() => removeMember(idx)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input placeholder="Name" value={member.name} onChange={e => updateMember(idx, { name: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Select value={member.label} onValueChange={v => updateMember(idx, { label: v as MemberLabel })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Food Type</Label>
                        <Select value={member.foodType} onValueChange={v => updateMember(idx, { foodType: v as FoodType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{FOOD_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Spice Tolerance</Label>
                        <Select value={member.spiceLevel} onValueChange={v => updateMember(idx, { spiceLevel: v as SpiceLevel })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{SPICE_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Likes (comma separated)</Label>
                        <Input placeholder="e.g. paneer, pasta, rice" value={member.likes} onChange={e => updateMember(idx, { likes: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Dislikes</Label>
                        <Input placeholder="e.g. bitter gourd" value={member.dislikes} onChange={e => updateMember(idx, { dislikes: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Allergies/Exclusions</Label>
                        <Input placeholder="e.g. peanuts, gluten" value={member.exclusions} onChange={e => updateMember(idx, { exclusions: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs mb-1 block">Preferred Cuisines</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {CUISINES.map(c => (
                            <Badge
                              key={c}
                              variant={member.preferredCuisines.includes(c) ? 'default' : 'outline'}
                              className="cursor-pointer text-xs"
                              onClick={() => toggleCuisine(idx, c)}
                            >
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Button variant="outline" onClick={addMember} className="mt-3 w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Another Member
              </Button>
              <Button onClick={handleFinish} className="mt-4 w-full" disabled={!members.some(m => m.name.trim())}>
                Start Planning <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
