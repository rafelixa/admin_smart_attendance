# Deployment ke Vercel - Panduan

## Masalah yang Diperbaiki

### Masalah Utama yang Ditemukan:
1. **Frontend tidak di-build** - Vercel hanya serve raw source files, bukan hasil build Vite
2. **Tidak ada `vite.config.js`** - Vite tidak tahu cara build multi-page application
3. **Backend environment variables** belum di-set di Vercel Dashboard
4. **Routing salah** - Routes pointing ke `/frontend/src/` bukan `/frontend/dist/`

### Perbaikan yang Dilakukan:
1. ✅ Membuat `frontend/vite.config.js` untuk multi-page build
2. ✅ Update `vercel.json` dengan buildCommand dan proper routing
3. ✅ Test build locally - berhasil ✓

## Langkah-langkah Deployment

### 1. Setup Environment Variables di Vercel Dashboard

Buka: https://vercel.com/rafelixa/admin-smart-attendance/settings/environment-variables

Tambahkan environment variables berikut:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://cioxpsttwaltmiblakrg.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb3hwc3R0d2FsdG1pYmxha3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzU1MzIsImV4cCI6MjA3NTc1MTUzMn0.nvvRU_WCG_uC36EtFr-5aqGOlIRRBiwqC_7sYRMPL84` |
| `JWT_SECRET` | `bx7k9Fq2sL4zV8pYxN0rU6eH3tG1mC5v` |
| `PORT` | `3000` |

**PENTING**: Set semua environment variables untuk environment "Production", "Preview", dan "Development"

### 2. Deploy ke Vercel

Setelah environment variables sudah di-set:

```bash
# Commit perubahan
git add .
git commit -m "Fix Vercel deployment configuration"
git push origin main
```

Vercel akan otomatis rebuild dan redeploy.

### 3. Test Deployment

Buka: https://admin-smart-attendance.vercel.app/login

Test login dengan:
- Username: `admin_futufafa`
- Password: (password yang sesuai)

### 4. Troubleshooting

Jika masih error:
1. Check Vercel deployment logs: https://vercel.com/rafelixa/admin-smart-attendance/deployments
2. Pastikan semua environment variables sudah ter-set dengan benar
3. Pastikan tidak ada typo di environment variable keys

## Perubahan yang Dilakukan

1. **vercel.json**: 
   - Removed static builds (only backend serverless needed)
   - Added maxLambdaSize config
   - Added env reference

2. **.vercelignore**: 
   - Ignore node_modules, .env, dan files yang tidak perlu

3. **backend/server.js**: 
   - Already properly exports `app` for serverless
   - Has conditional `app.listen()` only when run directly

## Struktur Deployment

```
Production URL: admin-smart-attendance.vercel.app
├── /api/* → Backend Serverless Function (backend/server.js)
├── /login → Frontend static page
├── /dashboard → Frontend static page
├── /userlist → Frontend static page
└── ... (other frontend routes)
```

## Catatan Penting

- Backend di-deploy sebagai **Vercel Serverless Function** (bukan traditional server)
- Environment variables HARUS di-set di Vercel Dashboard (tidak bisa dari .env file)
- Setiap push ke `main` branch akan trigger auto-deployment
- Cold start pada serverless function bisa memakan waktu 1-2 detik pertama kali
