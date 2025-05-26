import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  NOTIFICATION_EMAIL: string;
  SITE_NAME: string;
  SITE: string;
  KV: KVNamespace;
}

interface EventContext<Env, Params extends string, Data> {
  request: Request;
  env: Env;
  params: Record<Params, string>;
  data: Data;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: Record<string, unknown>;
}

function log(level: LogEntry['level'], message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && { data })
  };
  console.log(JSON.stringify(entry));
}

const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const RATE_LIMIT_MAX = 100;

export async function onRequest(context: EventContext<Env, string, unknown>) {
  // Validate required environment variables
  const requiredEnvVars = [
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'RESEND_API_KEY',
    'ADMIN_EMAIL',
    'NOTIFICATION_EMAIL',
    'SITE_NAME',
    'SITE'
  ] as const;

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !context.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    log('error', 'Missing required environment variables', { missingEnvVars });
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Server configuration error' 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': context.env.SITE || '*'
        }
      }
    );
  }

  // CORS headers
  const allowedOrigin = context.env.SITE || 'https://example.com';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Handle preflight requests
  if (context.request.method === 'OPTIONS') {
    log('info', 'Handling OPTIONS request');
    return new Response(null, { headers });
  }

  // Validate origin
  const origin = context.request.headers.get('Origin');
  if (origin && origin !== allowedOrigin) {
    log('warn', 'Invalid origin', { origin, allowedOrigin });
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Invalid origin' 
      }),
      { 
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  }

  // Rate limiting
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `rate_limit:${ip}`;
  
  try {
    const currentCount = await context.env.KV.get(rateLimitKey);
    if (currentCount && parseInt(currentCount) >= RATE_LIMIT_MAX) {
      log('warn', 'Rate limit exceeded', { ip });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Too many requests. Please try again later.' 
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        }
      );
    }

    await context.env.KV.put(
      rateLimitKey,
      (parseInt(currentCount || '0') + 1).toString(),
      { expirationTtl: RATE_LIMIT_WINDOW / 1000 }
    );
  } catch (error) {
    log('error', 'Rate limit check failed', { error });
    // Continue processing if rate limiting fails
  }

  // Validate form data
  const formData = await context.request.json();
  const { name, email, phone, message, source_url } = formData;

  if (!name || !email || !phone) {
    log('warn', 'Missing required fields', { formData });
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Missing required fields' 
      }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  }

  // Save to Supabase
  const supabase = createClient(
    context.env.PUBLIC_SUPABASE_URL,
    context.env.PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          email,
          phone,
          message,
          source_url
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        log('warn', 'Duplicate submission', { email });
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'You have already submitted this form' 
          }),
          { 
            status: 409,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }
        );
      }
      throw error;
    }

    log('info', 'Lead saved successfully', { leadId: data.id });

    // Send email notification
    try {
      const resend = new Resend(context.env.RESEND_API_KEY);
      await resend.emails.send({
        from: context.env.ADMIN_EMAIL,
        to: context.env.NOTIFICATION_EMAIL,
        subject: `New Lead from ${context.env.SITE_NAME}`,
        html: `
          <h2>New Lead Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          ${source_url ? `<p><strong>Source URL:</strong> ${source_url}</p>` : ''}
        `
      });
      log('info', 'Notification email sent successfully', { leadId: data.id });
    } catch (emailError) {
      log('error', 'Failed to send notification email', { 
        leadId: data.id,
        error: emailError 
      });
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully' 
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  } catch (error) {
    log('error', 'Failed to save lead', { error });
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to submit form' 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  }
} 