import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { post } from './submit';

// Mock environment variables
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://mock-supabase-url.com');
vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'mock-anon-key');
vi.stubEnv('RESEND_API_KEY', 'mock-resend-key');
vi.stubEnv('ADMIN_EMAIL', 'admin@example.com');
vi.stubEnv('SITE_NAME', 'Test Site');
vi.stubEnv('SITE', 'https://example.com');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockInsert = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockResolvedValue({ data: [{}], error: null });
  
  return {
    createClient: vi.fn(() => ({
      from: () => ({
        insert: mockInsert.mockReturnThis(),
        select: mockSelect,
      }),
    })),
  };
});

describe('POST /api/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'email-123' }),
    });
  });

  test('should validate required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    // @ts-ignore - type mismatch between node-mocks-http and Astro's API route
    const response = await post({ request: req });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors.fieldErrors).toHaveProperty('name');
    expect(data.errors.fieldErrors).toHaveProperty('email');
    expect(data.errors.fieldErrors).toHaveProperty('message');
  });

  test('should validate email format', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        name: 'Test User',
        email: 'invalid-email',
        message: 'Test message',
      },
    });

    // @ts-ignore
    const response = await post({ request: req });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors.fieldErrors).toHaveProperty('email');
  });

  test('should submit valid form data', async () => {
    const formData = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message',
      phone: '123-456-7890',
    };

    const { req } = createMocks({
      method: 'POST',
      body: formData,
    });

    // @ts-ignore
    const response = await post({ request: req });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // Verify Supabase was called with the right data
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient('', '');
    expect(supabase.from('submissions').insert).toHaveBeenCalledWith([{
      ...formData,
      source: 'website', // default value
    }]);
    
    // Verify email was sent
    expect(mockFetch).toHaveBeenCalled();
  });

  test('should handle database errors', async () => {
    // Mock Supabase error
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient('', '');
    supabase.from('submissions').insert = vi.fn().mockReturnThis();
    supabase.from('submissions').select = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    });

    const { req } = createMocks({
      method: 'POST',
      body: {
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a test message',
      },
    });

    // @ts-ignore
    const response = await post({ request: req });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
