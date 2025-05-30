/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/users/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn()
    }
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(() => ({
          order: jest.fn(() => ({
            order: jest.fn()
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      in: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      or: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
};

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@test.com'
};

const mockAdminProfile = {
  id: 'admin-1',
  role: 'admin',
  organization_id: 'org-1'
};

const mockSuperAdminProfile = {
  id: 'superadmin-1',
  role: 'superadmin',
  organization_id: 'org-1'
};

const mockUsers = [
  {
    id: 'user-1',
    email: 'doctor@test.com',
    first_name: 'Dr. John',
    last_name: 'Doe',
    role: 'doctor',
    organization_id: 'org-1',
    created_at: '2024-01-01T00:00:00Z',
    phone: '+1234567890',
    is_active: true,
    last_sign_in_at: '2024-01-15T10:00:00Z',
    organizations: {
      name: 'Test Organization',
      slug: 'test-org'
    }
  }
];

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('GET /api/users', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null
      });
    });

    describe('Admin Access', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockAdminProfile,
          error: null
        });
        
        mockSupabase.from().select().eq().order().limit.mockResolvedValue({
          data: mockUsers,
          error: null
        });
      });

      it('fetches users for admin with organization filter', async () => {
        const request = new NextRequest('http://localhost/api/users?organizationId=org-1');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].email).toBe('doctor@test.com');
      });

      it('applies role filter', async () => {
        const request = new NextRequest('http://localhost/api/users?role=doctor');
        const response = await GET(request);

        expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('role', 'doctor');
      });

      it('applies status filter for active users', async () => {
        const request = new NextRequest('http://localhost/api/users?status=active');
        const response = await GET(request);

        expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('is_active', true);
      });

      it('applies search filter', async () => {
        const request = new NextRequest('http://localhost/api/users?search=John');
        const response = await GET(request);

        expect(mockSupabase.from().select().or).toHaveBeenCalledWith(
          'first_name.ilike.%John%,last_name.ilike.%John%,email.ilike.%John%'
        );
      });

      it('restricts admin to their organization only', async () => {
        const request = new NextRequest('http://localhost/api/users');
        await GET(request);

        expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('organization_id', 'org-1');
      });
    });

    describe('SuperAdmin Access', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockSuperAdminProfile,
          error: null
        });
        
        mockSupabase.from().select().order().limit.mockResolvedValue({
          data: mockUsers,
          error: null
        });
      });

      it('allows superadmin to access all organizations', async () => {
        const request = new NextRequest('http://localhost/api/users');
        const response = await GET(request);

        expect(response.status).toBe(200);
        // Should not filter by organization for superadmin
        expect(mockSupabase.from().select().eq).not.toHaveBeenCalledWith('organization_id', expect.any(String));
      });

      it('allows superadmin to filter by specific organization', async () => {
        const request = new NextRequest('http://localhost/api/users?organizationId=org-2');
        await GET(request);

        expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('organization_id', 'org-2');
      });
    });

    describe('Authorization', () => {
      it('returns 401 for unauthenticated requests', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        });

        const request = new NextRequest('http://localhost/api/users');
        const response = await GET(request);

        expect(response.status).toBe(401);
      });

      it('returns 403 for insufficient permissions', async () => {
        const patientProfile = { id: 'patient-1', role: 'patient', organization_id: 'org-1' };
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: patientProfile,
          error: null
        });

        const request = new NextRequest('http://localhost/api/users');
        const response = await GET(request);

        expect(response.status).toBe(403);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockAdminProfile,
          error: null
        });
      });

      it('handles database errors gracefully', async () => {
        mockSupabase.from().select().eq().order().limit.mockResolvedValue({
          data: null,
          error: new Error('Database error')
        });

        const request = new NextRequest('http://localhost/api/users');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Failed to fetch users');
      });
    });
  });

  describe('POST /api/users', () => {
    const newUserData = {
      email: 'newuser@test.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
      role: 'doctor',
      organization_id: 'org-1',
      phone: '+1234567890'
    };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null
      });
    });

    describe('Admin User Creation', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockAdminProfile,
          error: null
        });

        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-user-id' } },
          error: null
        });

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: { id: 'new-user-id' },
          error: null
        });
      });

      it('creates a new user successfully', async () => {
        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.email).toBe('newuser@test.com');
      });

      it('creates auth user with correct data', async () => {
        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        await POST(request);

        expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
          email: 'newuser@test.com',
          password: 'password123',
          email_confirm: true
        });
      });

      it('creates profile with correct data', async () => {
        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        await POST(request);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
          id: 'new-user-id',
          email: 'newuser@test.com',
          first_name: 'New',
          last_name: 'User',
          role: 'doctor',
          organization_id: 'org-1',
          phone: '+1234567890',
          is_active: true
        });
      });

      it('prevents admin from creating users in other organizations', async () => {
        const crossOrgData = { ...newUserData, organization_id: 'other-org' };
        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(crossOrgData)
        });

        const response = await POST(request);

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBe('Cannot create users for other organizations');
      });
    });

    describe('SuperAdmin User Creation', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockSuperAdminProfile,
          error: null
        });

        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-user-id' } },
          error: null
        });

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: { id: 'new-user-id' },
          error: null
        });
      });

      it('allows superadmin to create users in any organization', async () => {
        const crossOrgData = { ...newUserData, organization_id: 'other-org' };
        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(crossOrgData)
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockAdminProfile,
          error: null
        });
      });

      it('handles auth user creation failure', async () => {
        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: null,
          error: new Error('Email already exists')
        });

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Email already exists');
      });

      it('cleans up auth user when profile creation fails', async () => {
        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-user-id' } },
          error: null
        });

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: null,
          error: new Error('Profile creation failed')
        });

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id');
      });
    });

    describe('Authorization', () => {
      it('returns 401 for unauthenticated requests', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        });

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
      });

      it('returns 403 for insufficient permissions', async () => {
        const patientProfile = { id: 'patient-1', role: 'patient', organization_id: 'org-1' };
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: patientProfile,
          error: null
        });

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserData)
        });

        const response = await POST(request);

        expect(response.status).toBe(403);
      });
    });
  });
});
