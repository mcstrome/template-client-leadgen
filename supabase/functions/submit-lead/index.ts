// @ts-ignore
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Deno type declaration
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// Environment variables
const env = {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
  SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
  RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'),
  ADMIN_EMAIL: Deno.env.get('ADMIN_EMAIL'),
  NOTIFICATION_EMAIL: Deno.env.get('NOTIFICATION_EMAIL'),
  SITE_NAME: Deno.env.get('SITE_NAME'),
  SITE: Deno.env.get('SITE')
};

// Validate environment variables
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration');
}

// Assert non-null after validation
const supabaseUrl = env.SUPABASE_URL as string;
const supabaseKey = env.SUPABASE_ANON_KEY as string;

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  source: z.string().default('website')
});

Deno.serve(async (req) => {
  const formData = await req.json();

  // Validate form data
  const validation = formSchema.safeParse(formData);
  if (!validation.success) {
    return new Response(JSON.stringify({ success: false, errors: validation.error.flatten() }), { status: 400 });
  }

  // Save to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('submissions').insert([validation.data]).select();

  if (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
  }

  // Send email notification
  await sendEmailNotification(validation.data);

  return new Response(JSON.stringify({ success: true, message: 'Form submitted successfully' }), { status: 200 });
});

async function sendEmailNotification(data) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return; // Skip if no API key

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `"${env.SITE_NAME || 'Lead Form'}" <noreply@${new URL(env.SITE || 'https://example.com').hostname}>`,
        to: env.NOTIFICATION_EMAIL || env.ADMIN_EMAIL,
        subject: `New Lead: ${data.name}`,
        text: formatEmailText(data, 'notification')
      })
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
}

function formatEmailText(data, type) {
  if (type === 'notification') {
    return `New lead submission:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Source: ${data.source}

Message:
${data.message}

---
Sent from ${env.SITE_NAME || 'Lead Form'}`;
  }
  return '';
} 