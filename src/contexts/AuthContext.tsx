import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { AppRole } from '@/types/database';

export type AccountStatus = 'pending' | 'approved' | 'suspended';

export interface ProfileWithStatus {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileWithStatus | null;
  roles: AppRole[];
  isLoading: boolean;
  isAuthReady: boolean;
  isAdmin: boolean;
  isConsultor: boolean;
  isBackoffice: boolean;
  isStaff: boolean;
  isMentor: boolean;
  isFounder: boolean;
  isAccountApproved: boolean;
  isAccountPending: boolean;
  isAccountSuspended: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, selectedRole?: 'founder' | 'mentor_externo') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithStatus | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const fetchUserData = useCallback(async (userId: string): Promise<void> => {
    try {
      // Fetch profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
      ]);
      
      if (profileResult.data) {
        // Handle case where account_status column may not exist yet
        const profileData = profileResult.data as Record<string, unknown>;
        setProfile({
          id: profileData.id as string,
          email: profileData.email as string,
          full_name: profileData.full_name as string | null,
          avatar_url: profileData.avatar_url as string | null,
          account_status: (profileData.account_status as AccountStatus) || 'approved', // Default to approved for existing users
          created_at: profileData.created_at as string,
          updated_at: profileData.updated_at as string,
        });
      }
      
      if (rolesResult.data) {
        setRoles(rolesResult.data.map(r => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsAuthReady(true); // P1: Only set ready after everything is loaded
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setIsAuthReady(true);
        } else if (newSession?.user) {
          // P1: Set loading while fetching data to prevent flash of wrong content
          setIsAuthReady(false);
          
          // Defer to avoid Supabase deadlock
          setTimeout(async () => {
            if (isMounted) {
              await fetchUserData(newSession.user.id);
              setIsAuthReady(true);
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsAuthReady(true);
        }
      }
    );

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    setIsAuthReady(false); // P1: Mark as loading during sign in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsAuthReady(true); // Restore ready state on error
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole?: 'founder' | 'mentor_externo') => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          full_name: fullName,
          selected_role: selectedRole 
        }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setIsAuthReady(false);
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setIsAuthReady(true);
  };

  const isAdmin = roles.includes('admin');
  const isConsultor = roles.includes('consultor');
  const isBackoffice = roles.includes('backoffice');
  const isStaff = isAdmin || isConsultor || isBackoffice;
  const isMentor = roles.includes('mentor_externo') || isConsultor || isAdmin;
  const isFounder = roles.includes('founder');
  
  // Account approval status
  const isAccountApproved = profile?.account_status === 'approved';
  const isAccountPending = profile?.account_status === 'pending';
  const isAccountSuspended = profile?.account_status === 'suspended';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      isLoading,
      isAuthReady,
      isAdmin,
      isConsultor,
      isBackoffice,
      isStaff,
      isMentor,
      isFounder,
      isAccountApproved,
      isAccountPending,
      isAccountSuspended,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
