# Àbáké Olófì · Orders

The working prototype of Abake's order tracker. It has two sides:

- **Admin (Abake and the team):** orders from first chat to delivery, weaver calls with a next-call date, photos and videos, payments, invoices, money owed, and monthly numbers. It works on phone, tablet and laptop, in light or dark mode.
- **Client tracking page (`/t/<code>`):** a private link Abake sends on WhatsApp. It shows the stage, the ready date, the photos and videos she chose to share, the balance and bank details, and asks for feedback after delivery. Clients never need an account.

Built with Next.js 14 (App Router), Supabase (database, sign-in, file storage) and Vercel (hosting).

---

## 1. Run it on your Mac

You need Node.js 18.18 or newer (`node -v`).

```bash
cd ~/Documents/abake-olofi-app
npm install
cp .env.example .env.local     # then fill it in (step 2)
npm run dev
```

Open http://localhost:3000.

## 2. Set up Supabase (about 10 minutes, free plan is fine)

1. Go to https://supabase.com, create a project (any name, e.g. `abake-olofi`, region close to Nigeria such as `eu-west`).
2. **Database:** open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**.
3. **Keys:** open **Project Settings → API** and copy into `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret; it is only used on the server)
4. **Accounts:** open **Authentication → Users → Add user → Create new user**, with an email and password for Abake and one for you. Tick "Auto confirm user".
5. **Make them staff:** back in the SQL Editor, run (with your real emails):

   ```sql
   insert into public.staff (user_id, name, role)
   select id, 'Abake', 'owner' from auth.users where email = 'abake@example.com';
   insert into public.staff (user_id, name, role)
   select id, 'Timilehin', 'admin' from auth.users where email = 'you@example.com';
   ```

6. Restart `npm run dev` and sign in.

Then, in the app's **Settings**, add the bank details that go on invoices.

## 3. Put it online (Vercel)

1. Push this folder to a GitHub repository.
2. On https://vercel.com, choose **Add New → Project**, then import the repository.
3. Add the same four environment variables. Set `NEXT_PUBLIC_SITE_URL` to the Vercel address (e.g. `https://abake-olofi.vercel.app`) so client links point to the live site.
4. Deploy. On Abake's phone, open the site and choose **Add to Home Screen**.

---

## How the app is laid out

```
app/
  login/                 sign in
  (admin)/               everything behind sign-in
    orders/              list + order page side by side on tablet/laptop
      [id]/              order page: status, next step, updates, money, invoice
      new/               new order (from a template, or "Repeat this order")
      actions.ts         all order changes (server actions)
    money/               clients owe you / you owe weavers
    numbers/             month stats, month-by-month table, CSV download
    templates/           orders she makes again and again
    settings/            business and bank details, reminders, dark mode, team
  t/[token]/             the client's tracking page (public, read-only + feedback)
components/              shared UI (sheets, media upload, invoice lines, …)
lib/                     data access, formatting, stage logic, Supabase clients
supabase/schema.sql      tables, security rules and the photo/video bucket
```

### The flow it follows

New order → invoice sent → deposit received (the order is official) → handed to the weaver (the client's date is the weaver's date + 7 days by default) → weaver calls, each logging the next call date → received from the weaver → delivered → client feedback.

### Privacy

- Every table is locked to signed-in staff (row-level security).
- Photos and videos are in a private bucket and are shown through links that expire after an hour.
- The client page reads only that order's client-safe fields, and only updates marked **Show on client's page**. Weaver names, costs and private notes never reach it.

### Design

- Headings: **Bright** (the brand typeface by Dharmas Studio, in `app/fonts`). It has no ₦ sign, so amounts use the body font.
- Body: **Manrope**.
- Colours and dark mode are CSS variables at the top of `app/globals.css`.
- The logo is a placeholder (`.logo-mark`). Swap in the designer's SVG when it's ready.
