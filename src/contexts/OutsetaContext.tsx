import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Define the Outseta interface based on the SDK
interface OutsetaAccount {
  credits_balance?: number;
  Name?: string;
  [key: string]: any;
}

interface OutsetaUser {
  Email: string;
  FirstName?: string;
  LastName?: string;
  Uid?: string;
  Account?: OutsetaAccount;
  [key: string]: any;
}

interface OutsetaSDK {
  getUser: () => Promise<OutsetaUser | null>;
  setAccessToken: (token: string) => void;
  getAccessToken: () => string | null;
  auth: {
    open: (options?: any) => void;
    close: () => void;
    logout: () => Promise<void>;
  };
  profile: {
    open: (options?: any) => void;
  };
  [key: string]: any;
}

declare global {
  interface Window {
    Outseta: OutsetaSDK;
    o_options?: any;
  }
}

interface OutsetaContextType {
  outseta: OutsetaSDK | null;
  user: OutsetaUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const OutsetaContext = createContext<OutsetaContextType>({
  outseta: null,
  user: null,
  isLoading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

export const useOutseta = () => {
  const context = useContext(OutsetaContext);
  if (!context) {
    throw new Error("useOutseta must be used within an OutsetaProvider");
  }
  return context;
};

interface OutsetaProviderProps {
  children: ReactNode;
}

export const OutsetaProvider = ({ children }: OutsetaProviderProps) => {
  const [outseta, setOutseta] = useState<OutsetaSDK | null>(null);
  const [user, setUser] = useState<OutsetaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    console.log("[OutsetaContext] refreshUser called");
    if (window.Outseta) {
      try {
        console.log("[OutsetaContext] Calling Outseta.getUser()");
        const currentUser = await window.Outseta.getUser();
        console.log("[OutsetaContext] getUser result:", currentUser);

        // Deep log the user object structure
        if (currentUser) {
          console.log("[OutsetaContext] User properties:", Object.keys(currentUser));
          console.log("[OutsetaContext] User.Account:", currentUser.Account);

          if (currentUser.Account) {
            console.log("[OutsetaContext] Account properties:", Object.keys(currentUser.Account));
            console.log("[OutsetaContext] Account full object:", JSON.stringify(currentUser.Account, null, 2));
          }
        }

        setUser(currentUser);
      } catch (error) {
        console.error("[OutsetaContext] Error fetching user:", error);
        setUser(null);
      }
    } else {
      console.log("[OutsetaContext] Outseta not available");
      setUser(null);
    }
  };

  const logout = async () => {
    console.log("[OutsetaContext] logout called");

    if (!window.Outseta) {
      console.error("[OutsetaContext] Outseta not available for logout");
      setUser(null);
      return;
    }

    try {
      // Try multiple logout methods
      const currentUser = await window.Outseta.getUser();

      if (currentUser && typeof currentUser.logout === 'function') {
        console.log("[OutsetaContext] Using user.logout()");
        await currentUser.logout();
      } else if (window.Outseta.auth && typeof window.Outseta.auth.logout === 'function') {
        console.log("[OutsetaContext] Using Outseta.auth.logout()");
        await window.Outseta.auth.logout();
      } else {
        console.log("[OutsetaContext] Manually clearing tokens");
        if (typeof window.Outseta.setAccessToken === 'function') {
          window.Outseta.setAccessToken(null);
        }
      }

      // Clear local storage
      localStorage.removeItem('outseta.auth.token');
      sessionStorage.removeItem('outseta.auth.token');

      console.log("[OutsetaContext] Clearing user state");
      setUser(null);
    } catch (error) {
      console.error("[OutsetaContext] Logout error:", error);
      // Force clear user state even on error
      setUser(null);
    }
  };

  useEffect(() => {
    // Wait for Outseta to load
    const initOutseta = async () => {
      console.log("[OutsetaContext] Starting Outseta initialization");

      const waitForOutseta = () => {
        return new Promise<void>((resolve) => {
          if (window.Outseta) {
            console.log("[OutsetaContext] Outseta already loaded");
            resolve();
          } else {
            console.log("[OutsetaContext] Waiting for Outseta to load...");
            const checkInterval = setInterval(() => {
              if (window.Outseta) {
                console.log("[OutsetaContext] Outseta loaded!");
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
              clearInterval(checkInterval);
              console.error("[OutsetaContext] Timeout waiting for Outseta");
              resolve();
            }, 5000);
          }
        });
      };

      await waitForOutseta();

      if (window.Outseta) {
        console.log("[OutsetaContext] Setting Outseta instance");
        setOutseta(window.Outseta);

        // Check for access token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');

        if (accessToken) {
          console.log("[OutsetaContext] Access token found in URL, setting it");
          window.Outseta.setAccessToken(accessToken);
          // Remove token from URL for security
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        await refreshUser();
      } else {
        console.error("[OutsetaContext] Outseta failed to load");
      }

      console.log("[OutsetaContext] Setting isLoading to false");
      setIsLoading(false);
    };

    initOutseta();
  }, []);

  const value = {
    outseta,
    user,
    isLoading,
    refreshUser,
    logout,
  };

  return (
    <OutsetaContext.Provider value={value}>
      {children}
    </OutsetaContext.Provider>
  );
};
