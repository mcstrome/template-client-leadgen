-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp" with schema extensions;

-- Create submissions table
create table if not exists public.submissions (
  id uuid default extensions.uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text,
  message text,
  source text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.submissions enable row level security;

-- Create policies for RLS
create policy "Enable read access for all users" on public.submissions
  for select using (true);

create policy "Enable insert for all users" on public.submissions
  for insert with check (true);

-- Create index for better query performance
create index if not exists idx_submissions_created_at on public.submissions(created_at);
create index if not exists idx_submissions_email on public.submissions(email);
