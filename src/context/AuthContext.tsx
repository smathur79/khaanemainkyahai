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
  createHousehold: (name: string) => Promise<string>;
  joinHousehold: (accessCode: string, displayName: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  regenerateAccessCode: () => Promise<string>;
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
        .select('access_code, name')
        .eq('id', membership.household_id)
        .single();

      setAccessCode(household?.access_code ?? null);
      setHouseholdName(household?.name ?? null);
    } else {
      setHouseholdId(null);
      setRole(null);
      setAccessCode(null);
      setHouseholdName(null);
    }
  }, []);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Then get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadMembership(session.user.id);
        setLoading(false);
      } else {
        // Sign in anonymously
        const { data } = await supabase.auth.signInAnonymously();
        if (data?.user) {
          // Create a profile for the anonymous user
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

  // Load membership when user changes
  useEffect(() => {
    if (user) {
      loadMembership(user.id);
    }
  }, [user, loadMembership]);

  const createHousehold = useCallback(async (name: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    // Create household
    const { data: household, error } = await supabase
      .from('households')
      .insert({ name })
      .select()
      .single();

    if (error || !household) throw new Error(error?.message || 'Failed to create household');

    // Create membership as planner
    await supabase.from('household_memberships').insert({
      household_id: household.id,
      user_id: user.id,
      role: 'planner' as const,
    });

    // Update profile
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: name,
    });

    setHouseholdId(household.id);
    setHouseholdName(household.name);
    setRole('planner');
    setAccessCode(household.access_code);

    return household.id;
  }, [user]);

  const joinHousehold = useCallback(async (code: string, displayName: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data: household, error } = await supabase
      .from('households')
      .select('id, name, access_code')
      .eq('access_code', code.toUpperCase())
      .single();

    if (error || !household) throw new Error('Invalid access code');

    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
    });

    await supabase.from('household_memberships').insert({
      household_id: household.id,
      user_id: user.id,
      role: 'requestor_viewer' as const,
    });

    setHouseholdId(household.id);
    setHouseholdName(household.name);
    setRole('requestor_viewer');
    setAccessCode(household.access_code);
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
  }, [user, householdId]);

  const regenerateAccessCode = useCallback(async () => {
    if (!householdId) throw new Error('No household');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase
      .from('households')
      .update({ access_code: newCode })
      .eq('id', householdId);
    setAccessCode(newCode);
    return newCode;
  }, [householdId]);

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, householdId, householdName, role, accessCode,
        createHousehold, joinHousehold, leaveHousehold, regenerateAccessCode,
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
