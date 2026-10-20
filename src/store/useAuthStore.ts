import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { loginOneSignalUser, logoutOneSignalUser } from '../lib/onesignal';

export type Role = 'admin' | 'merchant' | 'supplier' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  company_name?: string;
  address?: string;
  telegram_chat_id?: string;
  referred_by?: string;
  created_at: string;
  has_made_first_order?: boolean;
  loyalty_points?: number;
  has_successful_referral?: boolean;
  wallet_balance?: number;
  status?: string;
  has_accepted_tos?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const getCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem('jiibha_user_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.role) {
        return parsed as User;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached user:', e);
  }
  return null;
};

const initialCachedUser = getCachedUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialCachedUser,
  isAuthenticated: !!initialCachedUser,
  isLoading: !initialCachedUser,
  setUser: (user) => {
    if (user) {
      localStorage.setItem('jiibha_user_cache', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
      if (user.id) {
        loginOneSignalUser(user.id, user.role || undefined, user.name || undefined);
      }
    } else {
      localStorage.removeItem('jiibha_user_cache');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  checkSession: async () => {
    try {
      // 1. Live session check (generous 12s timeout for slow mobile networks, never kills cached auth)
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }; timeout: true }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, timeout: true }), 12000)
      );

      const res = await Promise.race([sessionPromise, timeoutPromise]);
      const session = (res as any)?.data?.session;
      const isTimeout = (res as any)?.timeout === true;

      // If network timed out or failed, NEVER log out if user is already cached!
      if (!session) {
        if (isTimeout) {
          console.warn('Supabase getSession network timeout - preserving cached auth state');
          set({ isLoading: false });
          return;
        }

        // Try silent refresh
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', refreshData.session.user.id)
              .single();
            if (profile) {
              get().setUser(profile as User);
              return;
            }
          }
        } catch (refErr) {
          console.warn('Silent refresh error:', refErr);
        }

        // Only clear if no cached user exists
        const existing = get().user || getCachedUser();
        if (!existing) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        } else {
          set({ isLoading: false });
        }
        return;
      }

      // 2. Fetch fresh user profile from DB
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && !profileError) {
        get().setUser(profile as User);
      } else {
        // If profile fetch had temporary network error, preserve cached user
        const existing = get().user || getCachedUser();
        if (existing) {
          set({ user: existing, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    } catch (error) {
      console.warn('Session check network warning:', error);
      const existing = get().user || getCachedUser();
      if (existing) {
        set({ user: existing, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },
  logout: async () => {
    try {
      localStorage.removeItem('jiibha_user_cache');
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    logoutOneSignalUser();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));

// Setup global Supabase auth listener to smoothly handle token refreshes in background
try {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Supabase Auth Event:', event);
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          useAuthStore.getState().setUser(profile as User);
        }
      }
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('jiibha_user_cache');
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
      logoutOneSignalUser();
    }
  });
} catch (e) {
  console.warn('Supabase onAuthStateChange setup warning:', e);
}
