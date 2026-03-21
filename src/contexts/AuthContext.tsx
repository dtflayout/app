import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

      console.log("[Auth] Profile fetched:", data?.email);
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
      console.log("[Auth] Signing up user:", email);

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
        console.log("[Auth] Signup successful:", data.user.email);
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
      console.log("[Auth] Signing in user:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Auth] Signin error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log("[Auth] Signin successful:", data.user.email);
        return { success: true };
      }

      return { success: false, error: "Signin failed" };
    } catch (err: any) {
      console.error("[Auth] Signin exception:", err);
      return { success: false, error: err.message };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("[Auth] Signing out");
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
      
      console.log("[Auth] Initial session:", session?.user?.email || "none");
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Fetch profile in background (non-blocking)
      if (session?.user) {
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
      
      console.log("[Auth] Auth state changed:", event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Fetch profile in background (non-blocking)
      if (session?.user) {
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
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};