import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthService, SignUpData, SignInData } from '../services/AuthService';
import { UserProfile } from '../services/DatabaseService';
import type { User, Session } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signIn: (data: SignInData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  needsProfileSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Simple cache interface
interface SimpleCache {
  userId: string;
  profile: UserProfile | null;
  timestamp: number;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true
  });

  // Simple cache
  const cacheRef = useRef<SimpleCache | null>(null);
  const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

  // Cache utility functions
  const isCacheValid = (userId: string): boolean => {
    const cache = cacheRef.current;
    if (!cache || cache.userId !== userId) return false;
    return (Date.now() - cache.timestamp) < CACHE_DURATION;
  };

  const getCachedProfile = (userId: string): UserProfile | null => {
    return isCacheValid(userId) ? cacheRef.current!.profile : null;
  };

  const setCacheProfile = (userId: string, profile: UserProfile | null): void => {
    cacheRef.current = { userId, profile, timestamp: Date.now() };
  };

  const clearCache = (): void => {
    cacheRef.current = null;
  };

  // Single auth state processor - the only source of truth
  const processAuthState = async (event: string, session: Session | null): Promise<void> => {
    logger.log(`[AuthContext] Processing event: ${event}, session: ${!!session}`);

    try {
      // Case 1: Sign out or no session
      if (event === 'SIGNED_OUT' || !session) {
        logger.log('[AuthContext] Clearing state (signed out or no session)');
        clearCache();
        setState({
          session: null,
          user: null,
          profile: null,
          loading: false
        });
        return;
      }

      // Case 2: Token refresh - silent update only
      if (event === 'TOKEN_REFRESHED') {
        logger.log('[AuthContext] Token refreshed, updating session silently');
        setState(prev => ({
          ...prev,
          session,
          user: session.user
        }));
        return;
      }

      // Case 3: Sign in or initial session - load everything
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const user = session.user;
        logger.log(`[AuthContext] Processing sign in for user: ${user.id}`);

        // Check email confirmation
        if (!user.email_confirmed_at) {
          logger.log('[AuthContext] Email not confirmed, staying in public area');
          setState({
            session: null,
            user: null,
            profile: null,
            loading: false
          });
          return;
        }

        // Load profile inline
        let profile: UserProfile | null = null;

        try {
          // Try cache first
          if (isCacheValid(user.id)) {
            profile = getCachedProfile(user.id);
            logger.log('[AuthContext] Using cached profile');
          } else {
            // Fetch from database
            logger.log('[AuthContext] Fetching profile from database');
            const result = await AuthService.getUserProfile(user.id);
            profile = result.profile || null;
            setCacheProfile(user.id, profile);
            logger.log(`[AuthContext] Profile fetched: ${!!profile}`);
          }
        } catch (error) {
          logger.error('[AuthContext] Profile fetch failed, continuing with null:', error);
          profile = null;
          setCacheProfile(user.id, null); // Cache null result to avoid repeated failures
        }

        // Update state atomically - everything in one setState
        setState({
          session,
          user,
          profile,
          loading: false
        });
        return;
      }

      // Unknown event - log and ignore
      logger.log(`[AuthContext] Ignoring unknown event: ${event}`);
    } catch (error) {
      // Critical: Always set loading to false on any error
      logger.error('[AuthContext] Error processing auth state:', error);
      setState(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  // Initialize auth - single useEffect with simple flow
  useEffect(() => {
    logger.log('[AuthContext] Initializing auth system...');

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('[AuthContext] Error getting initial session:', error);
        setState({
          session: null,
          user: null,
          profile: null,
          loading: false
        });
        return;
      }

      logger.log(`[AuthContext] Initial session found: ${!!session}`);
      processAuthState('INITIAL_SESSION', session);
    });

    // 2. Listen for auth changes - all events go through processAuthState
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      processAuthState(event, session);
    });

    return () => {
      logger.log('[AuthContext] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Auth actions - simplified
  const signUp = async (data: SignUpData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await AuthService.signUp(data);
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Sign up failed' };
    }
  };

  const signIn = async (data: SignInData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await AuthService.signIn(data);
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }

      // Let onAuthStateChange handle the state update
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Sign in failed' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await AuthService.signOut();
      // onAuthStateChange will handle the state clearing
    } catch (error) {
      logger.error('[AuthContext] Sign out failed:', error);
      // Force local cleanup if Supabase fails
      clearCache();
      setState({
        session: null,
        user: null,
        profile: null,
        loading: false
      });
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await AuthService.resetPassword(email);
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Password reset failed' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await AuthService.updatePassword(newPassword);
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Password update failed' };
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!state.user) return;

    try {
      logger.log('[AuthContext] Manually refreshing profile, clearing cache...');
      
      // Clear cache to force fresh fetch
      clearCache();
      
      // Fetch fresh profile
      const result = await AuthService.getUserProfile(state.user.id);
      const profile = result.profile || null;
      
      // Update cache and state
      setCacheProfile(state.user.id, profile);
      setState(prev => ({ ...prev, profile }));
      
      logger.log(`[AuthContext] Profile refreshed: ${!!profile}`);
    } catch (error) {
      logger.error('[AuthContext] Failed to refresh profile:', error);
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    isAuthenticated: !!state.session && !!state.user,
    needsProfileSetup: !!state.session && !!state.user && !state.profile
  };

  // Debug logging - essential info only
  logger.log('[AuthContext] Current state:', {
    session: !!state.session,
    user: !!state.user,
    profile: !!state.profile,
    loading: state.loading,
    isAuthenticated: !!state.session && !!state.user,
    needsProfileSetup: !!state.session && !!state.user && !state.profile
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600">
              Please sign in to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Hook for authentication guards
export const useAuthGuard = () => {
  const { isAuthenticated, loading, user } = useAuth();

  return {
    isAuthenticated,
    loading,
    user,
    canAccess: isAuthenticated && !loading,
    requiresAuth: !isAuthenticated && !loading
  };
};