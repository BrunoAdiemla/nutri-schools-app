/**
 * AuthService Unit Tests
 * Tests authentication service functionality
 * Requirements: 3.6, 3.7, 3.8, 3.9, 3.11
 */

// Mock Supabase client with proper typing
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      refreshSession: jest.fn()
    }
  }
}));

// Mock DatabaseService
jest.mock('./DatabaseService', () => ({
  DatabaseService: {
    createUserProfile: jest.fn(),
    getUserProfile: jest.fn()
  }
}));

import { AuthService, SignUpData, SignInData } from './AuthService';
import { supabase } from '../lib/supabase';
import { DatabaseService } from './DatabaseService';

// Create properly typed mocks
const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
  onAuthStateChange: jest.fn(),
  refreshSession: jest.fn()
};

// Override the mocked supabase auth with our typed version
(supabase.auth as any) = mockAuth;

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sign Up', () => {
    const mockSignUpData: SignUpData = {
      email: 'test@example.com',
      password: 'TestPass123!'
    };

    it('should sign up user successfully', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { 
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: mockUser
      };
      const mockProfile = { id: 'user-123', nome: 'Test User' };

      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockDatabaseService.createUserProfile.mockResolvedValue(mockProfile as any);

      const result = await AuthService.signUp(mockSignUpData);

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: mockSignUpData.email,
        password: mockSignUpData.password
      });
    });

    it('should handle sign up auth errors', async () => {
      const authError = { message: 'Email already registered' };

      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authError as any
      });

      const result = await AuthService.signUp(mockSignUpData);

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(authError);
    });

    it('should handle profile creation failure', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { 
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: mockUser
      };

      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockDatabaseService.createUserProfile.mockResolvedValue(null);

      const result = await AuthService.signUp(mockSignUpData);

      // Should still return success even if profile creation fails
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });
  });

  describe('Sign In', () => {
    const mockSignInData: SignInData = {
      email: 'test@example.com',
      password: 'TestPass123!'
    };

    it('should sign in user successfully', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { 
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: mockUser
      };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const result = await AuthService.signIn(mockSignInData);

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: mockSignInData.email,
        password: mockSignInData.password
      });
    });

    it('should handle sign in errors', async () => {
      const authError = { message: 'Invalid credentials' };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError as any
      });

      const result = await AuthService.signIn(mockSignInData);

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(authError);
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      const result = await AuthService.signOut();

      expect(result.error).toBeNull();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const authError = { message: 'Sign out failed' };

      mockAuth.signOut.mockResolvedValue({ error: authError as any });

      const result = await AuthService.signOut();

      expect(result.error).toEqual(authError);
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email successfully', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ 
        data: {}, 
        error: null 
      });

      const result = await AuthService.resetPassword('test@example.com');

      expect(result.error).toBeNull();
      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });

    it('should handle password reset errors', async () => {
      const authError = { message: 'Email not found' };

      mockAuth.resetPasswordForEmail.mockResolvedValue({ 
        data: null, 
        error: authError as any 
      });

      const result = await AuthService.resetPassword('test@example.com');

      expect(result.error).toEqual(authError);
    });
  });

  describe('Password Update', () => {
    it('should update password successfully', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockAuth.updateUser.mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      });

      const result = await AuthService.updatePassword('NewPass123!');

      expect(result.error).toBeNull();
      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: 'NewPass123!'
      });
    });

    it('should handle password update errors', async () => {
      const authError = { message: 'Password update failed' };

      mockAuth.updateUser.mockResolvedValue({ 
        data: { user: null }, 
        error: authError as any 
      });

      const result = await AuthService.updatePassword('NewPass123!');

      expect(result.error).toEqual(authError);
    });
  });

  describe('Session Management', () => {
    it('should get current session successfully', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { 
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: mockUser
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const result = await AuthService.getCurrentSession();

      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should get current user successfully', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await AuthService.getCurrentUser();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should refresh session successfully', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { 
        access_token: 'new-token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-123',
        user: mockUser
      };

      mockAuth.refreshSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const result = await AuthService.refreshSession();

      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });
  });

  describe('User Profile', () => {
    it('should get user profile successfully', async () => {
      const mockProfile = { id: 'user-123', nome: 'Test User' };

      mockDatabaseService.getUserProfile.mockResolvedValue(mockProfile as any);

      const result = await AuthService.getUserProfile('user-123');

      expect(result.profile).toEqual(mockProfile);
      expect(result.error).toBeNull();
      expect(mockDatabaseService.getUserProfile).toHaveBeenCalledWith('user-123');
    });

    it('should handle profile not found', async () => {
      mockDatabaseService.getUserProfile.mockResolvedValue(null);

      const result = await AuthService.getUserProfile('user-123');

      expect(result.profile).toBeNull();
      expect(result.error).toBe('Profile not found');
    });
  });

  describe('Validation', () => {
    describe('Email Validation', () => {
      it('should validate correct email formats', () => {
        expect(AuthService.validateEmail('test@example.com')).toBe(true);
        expect(AuthService.validateEmail('user.name@domain.co.uk')).toBe(true);
        expect(AuthService.validateEmail('test+tag@example.org')).toBe(true);
      });

      it('should reject invalid email formats', () => {
        expect(AuthService.validateEmail('invalid-email')).toBe(false);
        expect(AuthService.validateEmail('test@')).toBe(false);
        expect(AuthService.validateEmail('@example.com')).toBe(false);
        expect(AuthService.validateEmail('test.example.com')).toBe(false);
      });
    });

    describe('Password Validation', () => {
      it('should validate strong passwords', () => {
        const result = AuthService.validatePassword('StrongPass123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject weak passwords', () => {
        const result = AuthService.validatePassword('weak');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should validate individual password requirements', () => {
        // Too short
        let result = AuthService.validatePassword('Short1!');
        expect(result.errors).toContain('Password must be at least 8 characters long');

        // No uppercase
        result = AuthService.validatePassword('lowercase123!');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');

        // No lowercase
        result = AuthService.validatePassword('UPPERCASE123!');
        expect(result.errors).toContain('Password must contain at least one lowercase letter');

        // No number
        result = AuthService.validatePassword('NoNumbers!');
        expect(result.errors).toContain('Password must contain at least one number');
      });
    });
  });

  describe('Authentication Status', () => {
    it('should return true when user is authenticated', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { 
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-123',
        user: mockUser
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);
    });
  });
});