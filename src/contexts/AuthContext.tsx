import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";
import { analytics } from "@/lib/analytics";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  country: string | null;
  currency: string;
  phone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  signUp: async () => ({ success: false, error: "Context not initialized" }),
  signIn: async () => ({ success: false, error: "Context not initialized" }),
  signInWithGoogle: async () => ({ success: false, error: "Context not initialized" }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from profiles table (non-blocking)
  const fetchProfile = async (userId: string) => {
    try {
      console.log("[Auth] Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[Auth] Error fetching profile:", error);
        return null;
      }

      console.log("[Auth] Profile fetched:", data?.id ? "[OK]" : "[EMPTY]");
      return data as Profile;
    } catch (err) {
      console.error("[Auth] Exception fetching profile:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Sign up new user
  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[Auth] Signing up user: [REDACTED]");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || "",
          },
        },
      });

      if (error) {
        console.error("[Auth] Signup error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log("[Auth] Signup successful:", data.user.id);
        return { success: true };
      }

      return { success: false, error: "Signup failed" };
    } catch (err: any) {
      console.error("[Auth] Signup exception:", err);
      return { success: false, error: err.message };
    }
  };

  // Sign in existing user
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[Auth] Signing in user: [REDACTED]");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Auth] Signin error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log("[Auth] Signin successful:", data.user.id);
        return { success: true };
      }

      return { success: false, error: "Signin failed" };
    } catch (err: any) {
      console.error("[Auth] Signin exception:", err);
      return { success: false, error: err.message };
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[Auth] Initiating Google OAuth");

      // Store the page the user was trying to reach so we can redirect after OAuth
      const intendedPath = window.location.pathname;
      if (intendedPath && intendedPath !== '/auth') {
        sessionStorage.setItem('oauth_redirect', intendedPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        console.error("[Auth] Google OAuth error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[Auth] Google OAuth exception:", err);
      return { success: false, error: err.message };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("[Auth] Signing out");
      analytics.reset();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      console.log("[Auth] Signed out successfully");
    } catch (err) {
      console.error("[Auth] Signout error:", err);
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log("[Auth] Initializing auth state");
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log("[Auth] Initial session:", session?.user?.id || "none");
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Fetch profile in background + identify for analytics
      if (session?.user) {
        analytics.identify(session.user.id, {
          email: session.user.email,
        });
        fetchProfile(session.user.id).then((profileData) => {
          if (mounted) setProfile(profileData);
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log("[Auth] Auth state changed:", event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Fetch profile in background + identify for analytics
      if (session?.user) {
        analytics.identify(session.user.id, {
          email: session.user.email,
        });
        fetchProfile(session.user.id).then((profileData) => {
          if (mounted) setProfile(profileData);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    session,
    isLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
