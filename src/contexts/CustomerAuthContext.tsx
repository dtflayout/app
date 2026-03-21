/**
 * Customer Auth Context
 * Manages customer authentication state for Quick Store storefront
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  QSCustomer,
  CustomerSession,
  getCustomerSession,
  saveCustomerSession,
  clearCustomerSession,
  updateCustomerSession,
  getCustomerById,
} from '@/services/qsCustomerService';

interface CustomerAuthContextType {
  // State
  customer: QSCustomer | null;
  session: CustomerSession | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  
  // Actions
  login: (customer: QSCustomer) => void;
  logout: () => void;
  updateProfile: (updates: { name?: string; phone?: string }) => void;
  refreshCustomer: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

interface CustomerAuthProviderProps {
  children: React.ReactNode;
  storeSlug: string;
}

export const CustomerAuthProvider: React.FC<CustomerAuthProviderProps> = ({
  children,
  storeSlug,
}) => {
  const [customer, setCustomer] = useState<QSCustomer | null>(null);
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize - check for existing session
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      
      const existingSession = getCustomerSession(storeSlug);
      
      if (existingSession) {
        // Fetch fresh customer data
        const result = await getCustomerById(existingSession.customerId);
        
        if (result.success && result.data) {
          setCustomer(result.data);
          setSession(existingSession);
        } else {
          // Session invalid, clear it
          clearCustomerSession(storeSlug);
        }
      }
      
      setIsLoading(false);
    };

    initSession();
  }, [storeSlug]);

  // Login - save session and set state
  const login = useCallback((customerData: QSCustomer) => {
    saveCustomerSession(storeSlug, customerData);
    setCustomer(customerData);
    setSession(getCustomerSession(storeSlug));
  }, [storeSlug]);

  // Logout - clear session and state
  const logout = useCallback(() => {
    clearCustomerSession(storeSlug);
    setCustomer(null);
    setSession(null);
  }, [storeSlug]);

  // Update profile in local state and session
  const updateProfile = useCallback((updates: { name?: string; phone?: string }) => {
    if (customer) {
      setCustomer(prev => prev ? { ...prev, ...updates } : null);
      updateCustomerSession(storeSlug, updates);
    }
  }, [customer, storeSlug]);

  // Refresh customer data from server
  const refreshCustomer = useCallback(async () => {
    if (!session?.customerId) return;
    
    const result = await getCustomerById(session.customerId);
    
    if (result.success && result.data) {
      setCustomer(result.data);
    }
  }, [session?.customerId]);

  const value: CustomerAuthContextType = {
    customer,
    session,
    isLoading,
    isLoggedIn: !!customer && !!session,
    login,
    logout,
    updateProfile,
    refreshCustomer,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

// Hook for consuming the context
export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  
  return context;
};

// Optional: Hook that doesn't throw if used outside provider (for optional auth)
export const useCustomerAuthOptional = () => {
  return useContext(CustomerAuthContext);
};
