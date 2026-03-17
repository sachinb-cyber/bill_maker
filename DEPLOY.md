# 🥛 Dairy Bill System — Vercel + Database Deployment

## What's Inside

```
dairy-vercel/
├── api/                    ← Backend (Vercel Serverless Functions)
│   ├── init.js             ← DB initialization
│   ├── dashboard.js        ← Admin stats
│   ├── auth/
│   │   ├── login.js        ← Login (admin, farmer, checker)
│   │   └── register.js     ← Farmer self-registration
│   ├── farmers/
│   │   ├── index.js        ← List / Add farmers
│   │   └── [id].js         ← Edit / Delete farmer
│   ├── bills/
│   │   ├── index.js        ← Generate / List bills
│   │   ├── [id].js         ← Get / Edit / Delete bill
│   │   └── verify.js       ← Bill verification
│   ├── requests/
│   │   ├── index.js        ← List / Submit requests
│   │   └── [id].js         ← Approve / Reject
│   └── payments/
│       └── index.js        ← List / Record payments
├── lib/                    ← Shared code
│   ├── db.js               ← Vercel Postgres connection + schema
│   ├── auth.js             ← JWT tokens
│   └── generate.js         ← Bill generation logic
├── public/
│   └── index.html          ← Full frontend (single file)
├── package.json
└── vercel.json
```

---

## STEP 1 — Create a Vercel Account

1. Go to **https://vercel.com** → Sign up free (use GitHub login)

---

## STEP 2 — Install Vercel CLI

Open your computer terminal (Command Prompt / Terminal) and run:

```bash
npm install -g vercel
```

---

## STEP 3 — Upload this project

1. Extract the `dairy-vercel.zip` file
2. Open terminal inside the `dairy-vercel` folder
3. Run:

```bash
vercel login
vercel
```

Answer the questions:
- Set up and deploy? → **Y**
- Which scope? → Select your account
- Link to existing project? → **N**
- Project name? → `dairy-bill-system` (or any name)
- In which directory is your code? → `.` (press Enter)
- Want to override settings? → **N**

✅ Vercel will give you a live URL like: `https://dairy-bill-system.vercel.app`

---

## STEP 4 — Add Database (Vercel Postgres)

This is the most important step. Your data will be stored here.

1. Go to **https://vercel.com/dashboard**
2. Click your project → **Storage** tab
3. Click **Create Database** → Select **Postgres** → Click **Create**
4. Name it `dairy-db` → Click **Create**
5. Click **Connect to Project** → select your project → Click **Connect**
6. This automatically adds these environment variables to your project:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`
   - `POSTGRES_HOST`

---

## STEP 5 — Add JWT Secret

1. In your Vercel project → **Settings** → **Environment Variables**
2. Add a new variable:
   - Name: `JWT_SECRET`
   - Value: `any-long-random-string-here-make-it-unique-123456`
3. Click **Save**

---

## STEP 6 — Redeploy

After adding environment variables, redeploy:

```bash
vercel --prod
```

Or in the Vercel dashboard: **Deployments** → Click the latest → **Redeploy**

---

## STEP 7 — Initialize Database

Visit this URL once to create all tables and seed admin/checker users:

```
https://YOUR-SITE.vercel.app/api/init
```

You should see: `{"ok":true,"message":"Database initialized"}`

✅ Your system is live!

---


---

## Custom Domain (Optional)

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your domain (e.g. `dairy.yourdomain.com`)
3. Follow DNS instructions

---

## Database Backup

To backup your data:
1. Vercel Dashboard → **Storage** → your database
2. Click **Query** tab
3. Run: `SELECT * FROM bills;` → export results

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | Visit `/api/init` again to reseed |
| 500 error | Check env variables in Vercel Settings |
| Bills not saving | Make sure Postgres is connected |
| PDF not generating | Use Chrome/Edge browser |
