# Google OAuth Setup for Supabase Auth

Career Ladder uses Supabase Auth for Google sign-in. Do not store the Google Client Secret in this Next.js app. The Google Client ID and Client Secret belong in the Supabase dashboard.

## Local Development URLs

Use these values when testing locally:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`

## Setup Steps

1. Open the Google Cloud Console.
2. Create or select a project.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID for a web application.
5. Add the authorized JavaScript origin:
   - `http://localhost:3000`
6. Add the authorized redirect URI:
   - `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
7. Copy the Google Client ID and Client Secret.
8. Open Supabase.
9. Go to Authentication > Providers > Google.
10. Enable the Google provider.
11. Paste the Google Client ID and Client Secret into the Supabase provider settings.
12. Confirm the Supabase project URL is configured in the app:
   - `NEXT_PUBLIC_SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_REF.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
13. Restart the Next.js app.
14. Test Google sign-in at `/auth`.

## Production Notes

For production, add the deployed app origin as an authorized JavaScript origin in Google Cloud, and keep the same Supabase callback URI format:

`https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
