import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { FamilyMember, FoodType, SpiceLevel, MemberLabel, FOOD_TYPES, CUISINES } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Users, ArrowRight, UtensilsCrossed, KeyRound, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
  const { joinHousehold, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [step, setStep] = useState<'household' | 'members'>('household');
  const [householdName, setHouseholdName] = useState('');
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }]);
  const [saving, setSaving] = useState(false);

  // Join mode state
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');

  const handleHouseholdSubmit = async () => {
    if (!householdName.trim()) return;
    setSaving(true);
    try {
      await setupHousehold(householdName.trim());
      setStep('members');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create household');
    } finally {
      setSaving(false);
    }
  };

  const updateMember = (idx: number, updates: Partial<MemberForm>) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m));
  };

  const addMember = () => setMembers(prev => [...prev, { ...emptyMember }]);

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

  const handleFinish = async () => {
    setSaving(true);
    try {
      for (const m of members) {
        if (!m.name.trim()) continue;
        await addFamilyMember({
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to save family members');
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    setSaving(true);
    try {
      await joinHousehold(joinCode.trim(), joinName.trim());
      toast.success('Joined household!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.message || 'Invalid access code');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Family Meal Planner</h1>
          <p className="text-muted-foreground mt-2">Plan meals together, stress-free</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <Card className="card-warm p-6 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setMode('create')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Create a Household</h2>
                    <p className="text-sm text-muted-foreground">Start fresh — set up your family and recipes</p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
              <Card className="card-warm p-6 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setMode('join')}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Join with Access Code</h2>
                    <p className="text-sm text-muted-foreground">Someone shared a code? Join their household</p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="card-warm p-6 space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setMode('choose')} className="mb-2">← Back</Button>
                <h2 className="text-xl font-semibold">Join a Household</h2>
                <div>
                  <Label>Your Name</Label>
                  <Input placeholder="e.g. Priya" value={joinName} onChange={e => setJoinName(e.target.value)} />
                </div>
                <div>
                  <Label>Access Code</Label>
                  <Input placeholder="e.g. ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="text-lg tracking-widest text-center font-mono" maxLength={6} />
                </div>
                <Button onClick={handleJoin} className="w-full" disabled={!joinCode.trim() || !joinName.trim() || saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Join Household
                </Button>
              </Card>
            </motion.div>
          )}

          {mode === 'create' && step === 'household' && (
            <motion.div key="household" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="p-6 card-warm">
                <Button variant="ghost" size="sm" onClick={() => setMode('choose')} className="mb-2">← Back</Button>
                <h2 className="text-xl font-semibold mb-4">Name your household</h2>
                <Input
                  placeholder="e.g. The Sharma Family"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  className="text-lg"
                  onKeyDown={e => e.key === 'Enter' && handleHouseholdSubmit()}
                />
                <Button onClick={handleHouseholdSubmit} className="mt-4 w-full" disabled={!householdName.trim() || saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</> : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </Card>
            </motion.div>
          )}

          {mode === 'create' && step === 'members' && (
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
              <Button onClick={handleFinish} className="mt-4 w-full" disabled={!members.some(m => m.name.trim()) || saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <>Start Planning <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
