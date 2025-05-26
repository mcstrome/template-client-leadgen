import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { APIRoute } from 'astro';

// Define types for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PUBLIC_SUPABASE_URL: string;
      PUBLIC_SUPABASE_ANON_KEY: string;
      RESEND_API_KEY?: string;
      ADMIN_EMAIL: string;
      NOTIFICATION_EMAIL?: string;
      SITE_NAME?: string;
      SITE?: string;
    }
  }
}

// For Vite/ESM environment variables
const env = {
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  RESEND_API_KEY: import.meta.env.RESEND_API_KEY,
  ADMIN_EMAIL: import.meta.env.ADMIN_EMAIL,
  NOTIFICATION_EMAIL: import.meta.env.NOTIFICATION_EMAIL,
  SITE_NAME: import.meta.env.SITE_NAME,
  SITE: import.meta.env.SITE
};

// Schema for form validation
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  source: z.string().default('website')
});

export const post: APIRoute = async ({ request }) => {
  try {
    if (!request.body) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No form data provided' 
        }),
        { status: 400 }
      );
    }
    
    let formData;
    try {
      formData = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid JSON data' 
        }),
        { status: 400 }
      );
    }
    
    // Validate form data
    const validation = formSchema.safeParse(formData);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: validation.error.flatten() 
        }),
        { status: 400 }
      );
    }

    const { data, error } = await saveSubmission(validation.data);

    if (error) throw error;

    // Send email notification
    await sendEmailNotification(validation.data);
    
    // Send autoresponder if email is provided
    if (validation.data.email) {
      await sendAutoresponder(validation.data);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully' 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Form submission error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An error occurred while processing your submission' 
      }),
      { status: 500 }
    );
  }
};

async function saveSubmission(data: z.infer<typeof formSchema>): Promise<{ data: any; error: null | { message: string; } }> {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  return await supabase
    .from('submissions')
    .insert([data])
    .select();
}

async function sendEmailNotification(data: z.infer<typeof formSchema>) {
  // Try Resend first, fall back to Postmark or SMTP
  try {
    await sendWithResend(data);
    return;
  } catch (error) {
    console.warn('Failed to send with Resend, trying fallback...', error);
  }

  // Add fallback email sending logic here if needed
  console.warn('No email sent - no working email provider configured');
}

async function sendWithResend(data: z.infer<typeof formSchema>) {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Resend API key not configured');

  const response = await fetch('https://api.resend.com/emails', {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }
}

async function sendAutoresponder(data: { email: string; name: string }) {
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
        from: `"${env.SITE_NAME || 'Support'}" <noreply@${new URL(env.SITE || 'https://example.com').hostname}>`,
        to: data.email,
        subject: 'Thank you for contacting us!',
        text: `Hi ${data.name},\n\nThank you for reaching out. We've received your message and will get back to you as soon as possible.\n\nBest regards,\nThe ${env.SITE_NAME || 'Team'}`
      })
    });
  } catch (error) {
    console.error('Failed to send autoresponder:', error);
  }
}

function formatEmailText(data: z.infer<typeof formSchema>, type: 'notification' | 'autoresponder'): string {
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
  
  return `Hi ${data.name},

Thank you for reaching out. We've received your message and will get back to you as soon as possible.

Best regards,
The ${env.SITE_NAME || 'Team'}`;
}
