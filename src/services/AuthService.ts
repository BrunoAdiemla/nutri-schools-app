import { supabase } from '../lib/supabase';
import { DatabaseService, UserProfile } from './DatabaseService';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export class AuthService {
  // Sign up new user with profile creation
  static async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const { email, password } = data;

      // Create auth user only - profile will be created later in ProfileSetupPage
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        logger.error('Auth signup error:', authError);
        return { user: null, session: null, error: authError };
      }

      if (!authData.user) {
        const error = new Error('User creation failed') as AuthError;
        return { user: null, session: null, error };
      }

      // Don't create profile here - it will be created in ProfileSetupPage after email confirmation
      logger.log('User created in auth, profile will be created after email confirmation');

      return {
        user: authData.user,
        session: authData.session,
        error: null
      };
    } catch (error) {
      logger.error('SignUp error:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError
      };
    }
  }

  // Sign in existing user
  static async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const { email, password } = data;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        logger.error('Auth signin error:', authError);
        return { user: null, session: null, error: authError };
      }

      return {
        user: authData.user,
        session: authData.session,
        error: null
      };
    } catch (error) {
      logger.error('SignIn error:', error);
      return {
        user: null,
        session: null,
        error: error as AuthError
      };
    }
  }

  // Sign out current user
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('SignOut error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      logger.error('SignOut error:', error);
      return { error: error as AuthError };
    }
  }

  // Password recovery
  static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        logger.error('Password reset error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      logger.error('Password reset error:', error);
      return { error: error as AuthError };
    }
  }

  // Update password
  static async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Password update error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      logger.error('Password update error:', error);
      return { error: error as AuthError };
    }
  }

  // Get current session
  static async getCurrentSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('Get session error:', error);
        return { session: null, error };
      }

      return { session, error: null };
    } catch (error) {
      logger.error('Get session error:', error);
      return { session: null, error: error as AuthError };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        logger.error('Get user error:', error);
        return { user: null, error };
      }

      return { user, error: null };
    } catch (error) {
      logger.error('Get user error:', error);
      return { user: null, error: error as AuthError };
    }
  }

  // Get user profile
  static async getUserProfile(userId: string): Promise<{ profile: UserProfile | null; error: string | null }> {
    try {
      logger.log('🔍 AuthService.getUserProfile - Starting for userId:', userId);
      
      const profile = await DatabaseService.getUserProfile(userId);
      
      logger.log('🔍 AuthService.getUserProfile - DatabaseService returned:', {
        profileExists: !!profile,
        profileData: profile ? 'FOUND' : 'NULL'
      });
      
      if (!profile) {
        logger.log('📝 AuthService.getUserProfile - Returning null profile (user needs setup)');
        return { profile: null, error: 'Profile not found' };
      }

      logger.log('✅ AuthService.getUserProfile - Returning profile successfully');
      return { profile, error: null };
    } catch (error) {
      logger.error('💥 AuthService.getUserProfile - Exception:', error);
      return { profile: null, error: 'Failed to fetch profile' };
    }
  }

  // Session state management
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const { session } = await this.getCurrentSession();
    return !!session;
  }

  // Refresh session
  static async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error('Refresh session error:', error);
        return { session: null, error };
      }

      return { session: data.session, error: null };
    } catch (error) {
      logger.error('Refresh session error:', error);
      return { session: null, error: error as AuthError };
    }
  }
}