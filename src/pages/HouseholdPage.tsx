import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw, Users, LogOut, Shield, Eye } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function HouseholdPage() {
  const { householdName, accessCode, role, regenerateAccessCode, leaveHousehold } = useAuth();
  const { familyMembers } = useAppContext();
  const [regenerating, setRegenerating] = useState(false);

  const handleCopyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      toast.success('Access code copied!');
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newCode = await regenerateAccessCode();
      toast.success(`New access code: ${newCode}`);
    } catch {
      toast.error('Failed to regenerate code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this household?')) return;
    await leaveHousehold();
    toast.success('Left household');
    window.location.href = '/';
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Household Settings</h1>

        <Card className="card-warm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">{householdName}</h2>
              <Badge variant="outline" className="mt-1">
                {role === 'planner' ? (
                  <><Shield className="h-3 w-3 mr-1" /> Planner</>
                ) : (
                  <><Eye className="h-3 w-3 mr-1" /> Viewer</>
                )}
              </Badge>
            </div>
          </div>

          {/* Access Code */}
          <div>
            <Label className="text-sm text-muted-foreground">Access Code</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] font-bold">
                {accessCode ?? '------'}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
              {role === 'planner' && (
                <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={regenerating}>
                  <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this code with family members so they can join your household.
            </p>
          </div>
        </Card>

        {/* Family Members */}
        <Card className="card-warm p-6">
          <h3 className="font-semibold mb-3">Family Members</h3>
          {familyMembers.length > 0 ? (
            <div className="space-y-2">
              {familyMembers.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm bg-muted rounded-lg p-3">
                  <Badge variant="outline" className="text-xs">{m.label}</Badge>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground ml-auto">{m.foodType}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No family members added yet.</p>
          )}
        </Card>

        <Button variant="destructive" onClick={handleLeave} className="w-full">
          <LogOut className="mr-2 h-4 w-4" /> Leave Household
        </Button>
      </motion.div>
    </AppLayout>
  );
}
