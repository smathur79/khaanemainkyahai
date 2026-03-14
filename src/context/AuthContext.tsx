import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { HouseholdRole } from '@/types/models';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  householdId: string | null;
  householdName: string | null;
  role: HouseholdRole | null;
  accessCode: string | null;
  plannerCode: string | null;
  createHousehold: (name: string) => Promise<string>;
  joinHousehold: (code: string, displayName: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  regenerateAccessCode: () => Promise<string>;
  regeneratePlannerCode: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [role, setRole] = useState<HouseholdRole | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [plannerCode, setPlannerCode] = useState<string | null>(null);

  const loadMembership = useCallback(async (userId: string) => {
    const { data: membership } = await supabase
      .from('household_memberships')
      .select('household_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership) {
      setHouseholdId(membership.household_id);
      setRole(membership.role as HouseholdRole);

      const { data: household } = await supabase
        .from('households')
        .select('access_code, name, planner_code')
        .eq('id', membership.household_id)
        .single();

      setAccessCode(household?.access_code ?? null);
      setPlannerCode((household as any)?.planner_code ?? null);
      setHouseholdName(household?.name ?? null);
    } else {
      setHouseholdId(null);
      setRole(null);
      setAccessCode(null);
      setPlannerCode(null);
      setHouseholdName(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadMembership(session.user.id);
        setLoading(false);
      } else {
        const { data } = await supabase.auth.signInAnonymously();
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: 'Family Member',
          });
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadMembership]);

  useEffect(() => {
    if (user) loadMembership(user.id);
  }, [user, loadMembership]);

  const createHousehold = useCallback(async (name: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    const { data: household, error } = await supabase
      .from('households')
      .insert({ name })
      .select()
      .single();

    if (error || !household) throw new Error(error?.message || 'Failed to create household');

    await supabase.from('household_memberships').insert({
      household_id: household.id,
      user_id: user.id,
      role: 'planner' as const,
    });

    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: name,
    });

    setHouseholdId(household.id);
    setHouseholdName(household.name);
    setRole('planner');
    setAccessCode(household.access_code);
    setPlannerCode((household as any).planner_code ?? null);

    return household.id;
  }, [user]);

  const joinHousehold = useCallback(async (code: string, displayName: string) => {
    if (!user) throw new Error('Not authenticated');
    const upperCode = code.toUpperCase().trim();

    // Check if it's a planner code first
    const { data: plannerHousehold } = await supabase
      .from('households')
      .select('id, name, access_code, planner_code')
      .eq('planner_code', upperCode)
      .maybeSingle();

    if (plannerHousehold) {
      await supabase.from('profiles').upsert({ id: user.id, display_name: displayName });
      await supabase.from('household_memberships').insert({
        household_id: plannerHousehold.id,
        user_id: user.id,
        role: 'planner' as const,
      });
      setHouseholdId(plannerHousehold.id);
      setHouseholdName(plannerHousehold.name);
      setRole('planner');
      setAccessCode(plannerHousehold.access_code);
      setPlannerCode((plannerHousehold as any).planner_code ?? null);
      return;
    }

    // Otherwise check requestor access code
    const { data: household, error } = await supabase
      .from('households')
      .select('id, name, access_code, planner_code')
      .eq('access_code', upperCode)
      .single();

    if (error || !household) throw new Error('Invalid access code');

    await supabase.from('profiles').upsert({ id: user.id, display_name: displayName });
    await supabase.from('household_memberships').insert({
      household_id: household.id,
      user_id: user.id,
      role: 'requestor_viewer' as const,
    });

    setHouseholdId(household.id);
    setHouseholdName(household.name);
    setRole('requestor_viewer');
    setAccessCode(household.access_code);
    setPlannerCode((household as any).planner_code ?? null);
  }, [user]);

  const leaveHousehold = useCallback(async () => {
    if (!user || !householdId) return;
    await supabase
      .from('household_memberships')
      .delete()
      .eq('user_id', user.id)
      .eq('household_id', householdId);
    setHouseholdId(null);
    setHouseholdName(null);
    setRole(null);
    setAccessCode(null);
    setPlannerCode(null);
  }, [user, householdId]);

  const regenerateAccessCode = useCallback(async () => {
    if (!householdId) throw new Error('No household');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('households').update({ access_code: newCode }).eq('id', householdId);
    setAccessCode(newCode);
    return newCode;
  }, [householdId]);

  const regeneratePlannerCode = useCallback(async () => {
    if (!householdId) throw new Error('No household');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('households').update({ planner_code: newCode } as any).eq('id', householdId);
    setPlannerCode(newCode);
    return newCode;
  }, [householdId]);

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, householdId, householdName, role,
        accessCode, plannerCode,
        createHousehold, joinHousehold, leaveHousehold,
        regenerateAccessCode, regeneratePlannerCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
