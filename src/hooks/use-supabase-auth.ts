'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import {
  getCurrentAuthUser,
  onAuthChange,
  roleToUserRole,
  roleToActivePanel,
  signOutFromSupabase,
  type CareLiviaRole,
} from '@/lib/supabaseAuth';
import type { User } from '@/lib/types';

/**
 * useSupabaseAuth
 * ───────────────
 * Restores the Supabase session on mount (so a refresh keeps the user logged in)
 * and subscribes to onAuthStateChange so login/logout anywhere in the app is
 * reflected in the Zustand store.
 *
 * Returns a `logout` action that signs out from Supabase + clears the store.
 */
export function useSupabaseAuth() {
  const { setCurrentUser, setActivePanel } = useStore();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    let unsub: (() => void) | undefined;

    (async () => {
      // 1) Restore existing session on page load
      const result = await getCurrentAuthUser();
      if (result.ok && result.user) {
        const storeUser = authUserToStoreUser(result.user);
        setCurrentUser(storeUser);
      }

      // 2) Subscribe to future auth changes
      unsub = onAuthChange((event, user) => {
        if (event === 'SIGNED_IN' && user) {
          setCurrentUser(authUserToStoreUser(user));
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setActivePanel('home');
        } else if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && user) {
          setCurrentUser(authUserToStoreUser(user));
        }
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const logout = async () => {
    await signOutFromSupabase();
    setCurrentUser(null);
    setActivePanel('home');
  };

  return { logout };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function authUserToStoreUser(u: {
  id: string;
  email: string;
  fullName: string;
  role: CareLiviaRole;
  phone?: string;
  profession?: string;
}): User {
  const now = new Date().toISOString();
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.fullName,
    role: roleToUserRole(u.role),
    avatar: '',
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    // store custom metadata on the user object for panels that need it
    ...(u.profession ? { profession: u.profession } : {}),
  } as User;
}

export { roleToActivePanel, roleToUserRole };
