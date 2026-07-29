# NephroRounds Studio

NephroRounds Studio is a Supabase-backed nephrology morning report app with
role-based access for admins, presenters, and users.

## What Is Online Now

- Supabase Authentication handles sign in.
- Supabase Database stores schedules, presenters, guests, questions, answers,
  announcements, profiles, app settings, live messages, hand raises, media
  controls, and upload metadata.
- Supabase Storage stores hero images, profile photos, presenter photos, slide
  files, recording files, and shared uploads.
- Admin Console changes save to Supabase and appear for every signed-in user.
- Participant answers are locked after submission by a unique database rule.
- Presenters can upload or link slides without getting Admin Console access.

## Environment Variables

Create a local `.env` file with:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not put any elevated Supabase server key in this app. Browser code must use
only the anon key.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/migrations/0001_initial_schema.sql`.
4. In Authentication settings, enable Email/Password sign in.
5. Create each real user in Supabase Authentication.
6. For every Auth user, add a matching row in `public.profiles`.

Example `profiles` row:

```sql
insert into public.profiles (
  id,
  username,
  full_name,
  email,
  role,
  discipline,
  university,
  location
) values (
  'AUTH_USER_UUID_HERE',
  'amiradmin',
  'Program Admin',
  'admin@example.com',
  'admin',
  'Nephrology',
  'Loma Linda University',
  'Loma Linda, USA'
);
```

Allowed roles are `admin`, `presenter`, and `user`.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Build

```bash
npm run check
npm run build
```

## Deployment

This app can be deployed to GitHub Pages with a build pipeline, Vercel, Netlify,
or another static hosting service that supports build-time environment
variables.

Set these environment variables in the host:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Role Permissions

- Admins can edit settings, meeting details, schedules, people, questions,
  announcements, media permissions, and profiles.
- Presenters can view shared content and update schedule slide links/files
  through the restricted `update_schedule_slides` database function.
- Users can view shared content, update their own profile, send live messages,
  raise their hand, and submit each answer once.
- Unauthenticated visitors cannot modify application data.

## Demo-Only Features

The visual camera/microphone controls and video background selector are UI-level
demo controls. Real multi-user audio/video requires a live meeting provider such
as Zoom, Teams, Google Meet, Daily, Twilio, or WebRTC infrastructure.

The thank-you postcard email opens the user's mail app with a prepared message.
Automatic email sending requires an email provider or Supabase Edge Function.

Browser reminders depend on browser notification permission and are local to the
device.
