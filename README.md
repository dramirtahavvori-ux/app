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
4. Run `supabase/migrations/0002_signup_approval.sql`.
5. Run `supabase/migrations/0003_updates_training_access.sql`.
6. Run `supabase/migrations/0004_projects_activity_protection.sql`, then set the owner:
   `update public.profiles set is_owner = true where username = 'YOUR_USERNAME';`
7. In Authentication settings, enable Email/Password sign in.

## Features

- **Morning report**: schedule, next-session countdown, presenters and guests,
  locked audience questions, live Q&A and hand raise, slides and recordings.
- **Reminders**: every session can be added to Google Calendar or Apple /
  Outlook (.ics) with alerts the day before and 15 minutes before. All
  upcoming sessions can be added at once.
- **Updates**: admins post updates, reminders, events and training news.
  Pinned posts appear on the morning report; users see an unread badge.
- **Training programs**: courses with lessons (text, YouTube/Vimeo video,
  files), per-user progress, printable certificate of completion, and an admin
  progress report.

- **Ongoing projects**: research/QI projects with status, progress, team and
  an "I'm interested" button.
- **Activity log** (owner only): sign-ins, page views, answers, lessons and
  screenshot/print/copy attempts, with live alerts and CSV export.
- **Content protection** for speakers and attendees: name + copyright
  watermark, copyright footer, screenshot-key detection, print/copy blocking.
  No website can fully block operating-system or phone screenshots; the
  watermark makes every capture traceable.
- **Languages**: English, Español, Français, فارسی (right-to-left), Türkçe.
- **Sample content**: `supabase/seed/ckm_morning_report.sql` (CKM syndrome round).

## Accounts and Access

- Anyone can create an account from the home page (**Create account**).
- New accounts start as **Waiting for approval** and cannot use the app yet.
- An admin opens **Admin console → Users / Access**, chooses the access level
  and presses **Approve** (or **Reject**).
- Access levels: `admin` (panelist, full control), `presenter` (speaker),
  `user` (clinician / attendee).
- Admins can change any user's access level or block them later from the same page.

The first admin must be set once in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin', status = 'approved'
where email = 'you@example.com';
```

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
