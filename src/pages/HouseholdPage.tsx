import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { FamilyMember, FoodType, SpiceLevel, MemberLabel, FOOD_TYPES, CUISINES } from '@/types/models';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, RefreshCw, Users, LogOut, Shield, Eye, Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const LABELS: MemberLabel[] = ['Parent', 'Kid', 'Other'];
const SPICE_LEVELS: SpiceLevel[] = ['Low', 'Medium', 'High'];

interface MemberFormData {
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

const emptyForm: MemberFormData = {
  name: '', label: 'Parent', foodType: 'Non-Vegetarian', likes: '', dislikes: '',
  exclusions: '', spiceLevel: 'Medium', preferredCuisines: [], notes: '',
};

function memberToForm(m: FamilyMember): MemberFormData {
  return {
    name: m.name,
    label: m.label,
    foodType: m.foodType,
    likes: m.likes.join(', '),
    dislikes: m.dislikes.join(', '),
    exclusions: m.exclusions.join(', '),
    spiceLevel: m.spiceLevel,
    preferredCuisines: m.preferredCuisines,
    notes: m.notes,
  };
}

export default function HouseholdPage() {
  const { householdName, accessCode, plannerCode, role, regenerateAccessCode, regeneratePlannerCode, leaveHousehold } = useAuth();
  const { familyMembers, addFamilyMember, updateFamilyMember, removeFamilyMember } = useAppContext();

  const [regenerating, setRegenerating] = useState<'access' | 'planner' | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const handleCopy = (code: string | null, label: string) => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success(`${label} code copied!`);
    }
  };

  const handleRegenerateAccess = async () => {
    setRegenerating('access');
    try {
      const newCode = await regenerateAccessCode();
      toast.success(`New requestor code: ${newCode}`);
    } catch { toast.error('Failed'); } finally { setRegenerating(null); }
  };

  const handleRegeneratePlanner = async () => {
    setRegenerating('planner');
    try {
      const newCode = await regeneratePlannerCode();
      toast.success(`New planner code: ${newCode}`);
    } catch { toast.error('Failed'); } finally { setRegenerating(null); }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this household?')) return;
    await leaveHousehold();
    toast.success('Left household');
    window.location.href = '/';
  };

  // Member form helpers
  const openAddMember = () => {
    setEditingMemberId(null);
    setForm({ ...emptyForm });
    setShowMemberForm(true);
  };

  const openEditMember = (member: FamilyMember) => {
    setEditingMemberId(member.id);
    setForm(memberToForm(member));
    setShowMemberForm(true);
  };

  const toggleCuisine = (cuisine: string) => {
    setForm(prev => ({
      ...prev,
      preferredCuisines: prev.preferredCuisines.includes(cuisine)
        ? prev.preferredCuisines.filter(c => c !== cuisine)
        : [...prev.preferredCuisines, cuisine],
    }));
  };

  const handleSaveMember = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSaving(true);
    try {
      const memberData = {
        name: form.name.trim(),
        label: form.label,
        foodType: form.foodType,
        likes: form.likes.split(',').map(s => s.trim()).filter(Boolean),
        dislikes: form.dislikes.split(',').map(s => s.trim()).filter(Boolean),
        exclusions: form.exclusions.split(',').map(s => s.trim()).filter(Boolean),
        spiceLevel: form.spiceLevel,
        preferredCuisines: form.preferredCuisines,
        notes: form.notes,
      };

      if (editingMemberId) {
        await updateFamilyMember(editingMemberId, memberData);
        toast.success(`${form.name} updated!`);
      } else {
        await addFamilyMember(memberData);
        toast.success(`${form.name} added!`);
      }
      setShowMemberForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: FamilyMember) => {
    if (!confirm(`Remove ${member.name} from the household?`)) return;
    try {
      await removeFamilyMember(member.id);
      toast.success(`${member.name} removed`);
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Household Settings</h1>

        {/* Household Info & Codes */}
        <Card className="card-warm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">{householdName}</h2>
              <Badge variant="outline" className="mt-1">
                {role === 'planner' ? (
                  <><Shield className="h-3 w-3 mr-1" /> Planner</>
                ) : (
                  <><Eye className="h-3 w-3 mr-1" /> Viewer / Requestor</>
                )}
              </Badge>
            </div>
          </div>

          {/* Requestor Access Code */}
          <div>
            <Label className="text-sm text-muted-foreground">Requestor Access Code</Label>
            <p className="text-xs text-muted-foreground mb-1">Share this to invite family members as viewers/requestors</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] font-bold">
                {accessCode ?? '------'}
              </div>
              <Button variant="outline" size="icon" onClick={() => handleCopy(accessCode, 'Requestor')}>
                <Copy className="h-4 w-4" />
              </Button>
              {role === 'planner' && (
                <Button variant="outline" size="icon" onClick={handleRegenerateAccess} disabled={regenerating !== null}>
                  <RefreshCw className={`h-4 w-4 ${regenerating === 'access' ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          {/* Planner Access Code */}
          {role === 'planner' && (
            <div>
              <Label className="text-sm text-muted-foreground">Planner Access Code</Label>
              <p className="text-xs text-muted-foreground mb-1">Share this to invite someone as a co-planner (full access)</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] font-bold text-primary">
                  {plannerCode ?? '------'}
                </div>
                <Button variant="outline" size="icon" onClick={() => handleCopy(plannerCode, 'Planner')}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleRegeneratePlanner} disabled={regenerating !== null}>
                  <RefreshCw className={`h-4 w-4 ${regenerating === 'planner' ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Family Members — now editable */}
        <Card className="card-warm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Family Members</h3>
            {role === 'planner' && (
              <Button size="sm" onClick={openAddMember}>
                <Plus className="h-4 w-4 mr-1" /> Add Member
              </Button>
            )}
          </div>

          {familyMembers.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {familyMembers.map(m => {
                  const isExpanded = expandedMember === m.id;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-muted rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                      >
                        <Badge variant="outline" className="text-xs flex-shrink-0">{m.label}</Badge>
                        <span className="font-medium text-sm flex-1">{m.name}</span>
                        <span className="text-xs text-muted-foreground">{m.foodType}</span>
                        {role === 'planner' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); openEditMember(m); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleRemoveMember(m); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-3 pb-3 space-y-2 border-t border-border/50"
                        >
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Spice tolerance:</span>
                              <span className="ml-1 font-medium">{m.spiceLevel}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Food type:</span>
                              <span className="ml-1 font-medium">{m.foodType}</span>
                            </div>
                            {m.likes.length > 0 && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Likes:</span>
                                <span className="ml-1">{m.likes.join(', ')}</span>
                              </div>
                            )}
                            {m.dislikes.length > 0 && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Dislikes:</span>
                                <span className="ml-1">{m.dislikes.join(', ')}</span>
                              </div>
                            )}
                            {m.exclusions.length > 0 && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Allergies/Exclusions:</span>
                                <span className="ml-1 text-destructive">{m.exclusions.join(', ')}</span>
                              </div>
                            )}
                            {m.preferredCuisines.length > 0 && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Cuisines:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {m.preferredCuisines.map(c => (
                                    <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {m.notes && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Notes:</span>
                                <span className="ml-1">{m.notes}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No family members added yet.</p>
              {role === 'planner' && (
                <Button size="sm" onClick={openAddMember}>
                  <Plus className="h-4 w-4 mr-1" /> Add Your First Member
                </Button>
              )}
            </div>
          )}
        </Card>

        <Button variant="destructive" onClick={handleLeave} className="w-full">
          <LogOut className="mr-2 h-4 w-4" /> Leave Household
        </Button>
      </motion.div>

      {/* Add / Edit Member Dialog */}
      <Dialog open={showMemberForm} onOpenChange={setShowMemberForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMemberId ? 'Edit Family Member' : 'Add Family Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input placeholder="e.g. Kavita" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={form.label} onValueChange={v => setForm(prev => ({ ...prev, label: v as MemberLabel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Food Type</Label>
                <Select value={form.foodType} onValueChange={v => setForm(prev => ({ ...prev, foodType: v as FoodType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOOD_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Spice Tolerance</Label>
              <Select value={form.spiceLevel} onValueChange={v => setForm(prev => ({ ...prev, spiceLevel: v as SpiceLevel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SPICE_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Likes (comma separated)</Label>
              <Input placeholder="e.g. paneer, pasta, rice" value={form.likes} onChange={e => setForm(prev => ({ ...prev, likes: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Dislikes (comma separated)</Label>
              <Input placeholder="e.g. bitter gourd, mushroom" value={form.dislikes} onChange={e => setForm(prev => ({ ...prev, dislikes: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Allergies / Exclusions (comma separated)</Label>
              <Input placeholder="e.g. peanuts, shellfish" value={form.exclusions} onChange={e => setForm(prev => ({ ...prev, exclusions: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Preferred Cuisines</Label>
              <div className="flex flex-wrap gap-1.5">
                {CUISINES.map(c => (
                  <Badge
                    key={c}
                    variant={form.preferredCuisines.includes(c) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleCuisine(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input placeholder="Any other notes" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSaveMember} className="w-full" disabled={!form.name.trim() || saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                editingMemberId ? 'Update Member' : 'Add Member'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
