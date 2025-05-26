# Lead Generation Template

A modern, lightweight lead generation template built with Astro, Supabase, and Resend. Deploy to Cloudflare Pages with ease.

## Features

- 📝 Contact form with validation
- 💾 Store submissions in Supabase
- ✉️ Email notifications via Resend (with Postmark/SMTP fallback)
- ⚡ Fast static site generation
- 🔒 Secure form submissions
- 📱 Responsive design
- 📊 Easy to customize

## Tech Stack

- [Astro](https://astro.build/) - Static site generator
- [Supabase](https://supabase.com/) - Backend & database
- [Resend](https://resend.com/) - Transactional emails (with Postmark/SMTP fallback)
- [Cloudflare Pages](https://pages.cloudflare.com/) - Hosting
- [Tailwind CSS](https://tailwindcss.com/) - Styling (via CDN)

## Prerequisites

- Node.js 18+
- pnpm
- Supabase account
- Resend account (or Postmark/SMTP)
- Cloudflare account

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/windsurf-leadgen-template.git
   cd windsurf-leadgen-template
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. **Set up Supabase**
   - Create a new project at [Supabase](https://app.supabase.com/)
   - Run the SQL migration from `supabase/migrations/20240101000000_initial_schema.sql` in the SQL editor
   - Get your project URL and anon key from Project Settings > API

5. **Set up Resend**
   - Create an account at [Resend](https://resend.com/)
   - Create an API key and add it to your `.env` file

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test
```

## Deployment

### 1. Deploy to Cloudflare Pages

1. Push your code to a GitHub/GitLab repository
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Go to Pages > Create a project
4. Connect your repository
5. Configure build settings:
   - Framework preset: Astro
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Environment variables: Add all variables from your `.env` file

### 2. Deploy Supabase Functions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Log in to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=your-resend-key \
     ADMIN_EMAIL=your-email@example.com \
     NOTIFICATION_EMAIL=notifications@example.com
   ```

5. Deploy the function:
   ```bash
   supabase functions deploy submit-lead
   ```

## Environment Variables

### Required Variables
Set these in your Cloudflare Pages project settings under **Settings** > **Environment variables**:

| Variable | Description |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL (find in Project Settings > API) |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key (find in Project Settings > API) |
| `RESEND_API_KEY` | Resend API key (or configure another email provider) |
| `ADMIN_EMAIL` | Admin email for notifications |
| `NOTIFICATION_EMAIL` | Email to receive form submissions |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `SITE_NAME` | Your site name (used in emails) | 'Lead Generation' |
| `SITE` | Your site URL (used for email links) | 'https://example.com' |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in milliseconds | 3600000 (1 hour) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per rate limit window | 100 |

### Local Development
For local development, create a `.env` file in the project root with the same variables. Never commit this file to version control.

Example `.env` file:
```bash
# Local development only - not for production
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
RESEND_API_KEY=your-resend-key
ADMIN_EMAIL=your-email@example.com
NOTIFICATION_EMAIL=notifications@example.com
```

## Customization

### Styling

This template uses Tailwind CSS via CDN. For production, you might want to:

1. Install Tailwind as a dev dependency
2. Configure PostCSS
3. Set up PurgeCSS to remove unused styles

### Form Fields

To add or modify form fields:

1. Update the form schema in `src/pages/api/submit.ts`
2. Update the `LeadForm` component in `src/components/LeadForm.astro`
3. Update the database schema if needed

## Testing

Run the test suite:

```bash
pnpm test
```

## License

MIT

## Changelog

### 0.1.0 (2025-05-23)
- Initial release
