# FLOW email templates

Branded replacements for Supabase's default auth emails (the plain
"Confirm Your Signup" ones sent from `noreply@mail.app.supabase.io`).

## How to apply

Supabase project dashboard → **Authentication → Emails → Templates**. Each
file below maps to one template tab. Paste the HTML into the template body,
and set the subject line as noted. Every `{{ .Variable }}` placeholder must
be left exactly as-is - Supabase's mailer (Go's `html/template`) fills
these in at send time.

| File | Template tab | Subject to set |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Confirm your email to start using FLOW` |
| `reset-password.html` | Reset password | `Reset your FLOW password` |
| `change-email.html` | Change Email Address | `Confirm your new FLOW email address` |
| `reauthentication.html` | Reauthentication | `{{ .Token }} is your FLOW verification code` |
| `password-changed.html` | Password Changed *(under Security notifications, if present in your plan)* | `Your FLOW password was changed` |
| `email-changed.html` | Email Address Changed *(same section)* | `Your FLOW email address was changed` |

Before pasting, search each file for `support@yourdomain.com` and replace
it with a real inbox you actually monitor - it's a placeholder, not a real
address.

## Two settings worth turning on while you're in there

Both live under **Authentication → Sign In / Providers → Email** (exact
location varies slightly by dashboard version - search "secure" in the
Auth settings if you don't see them immediately):

- **Secure email change** - without it, changing your email only confirms
  via the *new* address, so anyone who steals a session could redirect the
  account to an email you don't own. With it on, Supabase sends a
  confirmation link to *both* the old and new address, and requires both
  to be clicked - `change-email.html` above is written to make sense
  whichever inbox it lands in. Caveat: if `mailer_autoconfirm` is enabled
  anywhere in your project config (a dev convenience setting), it silently
  bypasses this - make sure it's off before relying on this for real users.
- **Secure password change** - required for the emailed verification-code
  step now built into Settings → Change Password (see
  `SecuritySection` in `SettingsScreen.tsx`). Without this toggle, the app
  still asks for the code, but Supabase won't actually require/validate it
  server-side - the toggle is what makes it load-bearing, not just cosmetic.

  One thing to verify yourself before trusting this as your only extra
  layer: there are unresolved community reports (multiple, as of early
  2026 - see supabase/supabase discussions #38361 and #34956) that
  `updateUser({ password, nonce })` can accept an incorrect code in some
  configurations. Test it: request a code, deliberately type a wrong one,
  and confirm the app shows "incorrect or expired" rather than succeeding.
  The current-password re-entry step stays in place either way as the
  primary guard, so this is defense-in-depth, not your only lock - but
  it's worth confirming it actually bites before you rely on it.
