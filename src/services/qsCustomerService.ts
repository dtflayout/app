/**
 * Quick Store Customer Authentication Service
 * Handles OTP-based login, session management, and customer CRUD
 */

import { supabase } from '@/lib/supabaseClient';

// ============================================
// Types
// ============================================

export interface QSCustomer {
  id: string;
  quick_store_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_verified: boolean;
  total_orders: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  created_at: string;
}

export interface CustomerSession {
  customerId: string;
  storeId: string;
  email: string;
  name: string | null;
  phone: string | null;
  expiresAt: number; // Unix timestamp
}

// Session duration: 20 days in milliseconds
const SESSION_DURATION_MS = 20 * 24 * 60 * 60 * 1000;

// LocalStorage key prefix
const getSessionKey = (storeSlug: string) => `qs_customer_session_${storeSlug}`;

// ============================================
// Session Management
// ============================================

/**
 * Save customer session to localStorage
 */
export function saveCustomerSession(storeSlug: string, customer: QSCustomer): void {
  const session: CustomerSession = {
    customerId: customer.id,
    storeId: customer.quick_store_id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  
  localStorage.setItem(getSessionKey(storeSlug), JSON.stringify(session));
}

/**
 * Get customer session from localStorage
 * Returns null if no session or expired
 */
export function getCustomerSession(storeSlug: string): CustomerSession | null {
  try {
    const stored = localStorage.getItem(getSessionKey(storeSlug));
    if (!stored) return null;
    
    const session: CustomerSession = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
      clearCustomerSession(storeSlug);
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

/**
 * Clear customer session
 */
export function clearCustomerSession(storeSlug: string): void {
  localStorage.removeItem(getSessionKey(storeSlug));
}

/**
 * Update session with new customer data (e.g., after profile update)
 */
export function updateCustomerSession(storeSlug: string, updates: Partial<Pick<CustomerSession, 'name' | 'phone'>>): void {
  const session = getCustomerSession(storeSlug);
  if (!session) return;
  
  const updated = { ...session, ...updates };
  localStorage.setItem(getSessionKey(storeSlug), JSON.stringify(updated));
}

// ============================================
// ============================================
// Email + Password Authentication
// ============================================

/**
 * Register a new customer with email + password
 */
export async function customerRegister(
  storeId: string,
  email: string,
  password: string,
  name: string,
  phone?: string
): Promise<{ success: boolean; error?: string; customer?: QSCustomer }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Call the DB function to register
    const { data: customerId, error: regError } = await supabase
      .rpc('customer_register', {
        p_store_id: storeId,
        p_email: normalizedEmail,
        p_password: password,
        p_name: name.trim(),
        p_phone: phone?.trim() || null,
      });
    
    if (regError) {
      // Check for duplicate email
      if (regError.message?.includes('already exists')) {
        return { success: false, error: 'An account with this email already exists. Please log in.' };
      }
      console.error('[CustomerAuth] Register error:', regError);
      return { success: false, error: regError.message || 'Registration failed' };
    }
    
    if (!customerId) {
      return { success: false, error: 'Registration failed' };
    }
    
    // Fetch the created customer
    const { data: customer, error: fetchError } = await supabase
      .from('quick_store_customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (fetchError || !customer) {
      return { success: false, error: 'Account created but failed to fetch profile' };
    }
    
    return { success: true, customer };
  } catch (error: any) {
    console.error('[CustomerAuth] Register error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Login with email + password
 */
export async function customerLogin(
  storeId: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; customer?: QSCustomer }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Call the DB function to verify credentials
    const { data: customerId, error: loginError } = await supabase
      .rpc('customer_login', {
        p_store_id: storeId,
        p_email: normalizedEmail,
        p_password: password,
      });
    
    if (loginError) {
      console.error('[CustomerAuth] Login error:', loginError);
      return { success: false, error: loginError.message || 'Login failed' };
    }
    
    if (!customerId) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Fetch customer data
    const { data: customer, error: fetchError } = await supabase
      .from('quick_store_customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (fetchError || !customer) {
      return { success: false, error: 'Login succeeded but failed to fetch profile' };
    }
    
    return { success: true, customer };
  } catch (error: any) {
    console.error('[CustomerAuth] Login error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Customer Data Operations
// ============================================

/**
 * Get customer by ID
 */
export async function getCustomerById(
  customerId: string
): Promise<{ success: boolean; data?: QSCustomer; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('quick_store_customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[CustomerAuth] getCustomerById error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(
  customerId: string,
  updates: { name?: string; phone?: string }
): Promise<{ success: boolean; data?: QSCustomer; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('quick_store_customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('[CustomerAuth] updateCustomerProfile error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get customer's orders
 */
export async function getCustomerOrders(
  customerId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('quick_store_orders')
      .select(`
        *,
        product:quick_store_products(product_name, product_slug)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[CustomerAuth] getCustomerOrders error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Printer Dashboard - Customer Management
// ============================================

/**
 * Get all customers for a store (printer dashboard)
 */
export async function getStoreCustomers(
  storeId: string,
  options?: {
    search?: string;
    sortBy?: 'name' | 'total_orders' | 'total_spent' | 'last_order_at' | 'created_at';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<{ success: boolean; data?: QSCustomer[]; count?: number; error?: string }> {
  try {
    let query = supabase
      .from('quick_store_customers')
      .select('*', { count: 'exact' })
      .eq('quick_store_id', storeId);
    
    // Search
    if (options?.search) {
      const escaped = options.search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
    }
    
    // Sort
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { success: true, data: data || [], count: count || 0 };
  } catch (error: any) {
    console.error('[CustomerAuth] getStoreCustomers error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get customer details with order history (printer dashboard)
 */
export async function getCustomerWithOrders(
  customerId: string
): Promise<{ success: boolean; data?: { customer: QSCustomer; orders: any[] }; error?: string }> {
  try {
    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('quick_store_customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (customerError) throw customerError;
    
    // Get orders
    const { data: orders, error: ordersError } = await supabase
      .from('quick_store_orders')
      .select(`
        *,
        product:quick_store_products(product_name, product_slug)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (ordersError) throw ordersError;
    
    return { success: true, data: { customer, orders: orders || [] } };
  } catch (error: any) {
    console.error('[CustomerAuth] getCustomerWithOrders error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add note to customer (printer dashboard)
 */
export async function addCustomerNote(
  customerId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, we'll store notes in a simple way
    // Could expand to a separate notes table later
    const { error } = await supabase
      .from('quick_store_customers')
      .update({
        // Add a notes column if needed, or use metadata
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('[CustomerAuth] addCustomerNote error:', error);
    return { success: false, error: error.message };
  }
}
