# Deployment Guide - Forsara Lead Extractor

## Overview
This is a full-stack application with:
- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: Node.js + Express (deployed to Render)

---

## 1. Deploy Backend to Render

### Prerequisites
- Render account (https://render.com)
- GitHub repository connected to your Render account

### Steps

1. **Go to Render Dashboard**
   - Visit https://render.com
   - Sign in or create an account
   - Click "New +" → "Web Service"

2. **Connect GitHub Repository**
   - Select "Build and deploy from a Git repository"
   - Click "Connect account" and authorize GitHub
   - Select repository: `mdArfath456/Forsara_Lead`
   - Select branch: `main`

3. **Configure Service**
   - **Name**: `forsara-lead-extractor`
   - **Environment**: `Node`
   - **Region**: `Oregon` (or your preferred region)
   - **Branch**: `main`
   - **Build Command**: `npm install` (leave default)
   - **Start Command**: `npm start` (leave default)
   - **Plan**: Choose "Standard" or higher (free tier won't work with databases)

4. **Set Environment Variables**
   Add all of these in the "Environment Variables" section:
   
   ```
   NODE_ENV = production
   PORT = 5000
   MONGO_URI = mongodb+srv://[your_user]:[your_password]@[your_cluster].mongodb.net/forsara-leads
   REDIS_URL = (optional for production, can be left empty)
   SESSION_SECRET = (generate a secure random string)
   GOOGLE_PLACES_API_KEY = (from Google Cloud Console)
   FOURSQUARE_API_KEY = (from Foursquare Developer)
   APOLLO_API_KEY = (from Apollo API)
   EXPLORIUM_API_KEY = (from Explorium API)
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Wait for deployment to complete (5-10 minutes)
   - Note your Render URL (e.g., `https://forsara-lead-extractor.onrender.com`)

6. **Update Vercel Configuration**
   - If your Render URL is different, update `frontend/vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "YOUR_RENDER_URL/api/$1"
       }
     ]
   }
   ```

---

## 2. Deploy Frontend to Vercel

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel

### Steps

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign in or create an account
   - Click "Add New..." → "Project"

2. **Import GitHub Repository**
   - Click "Import Git Repository"
   - Search for `mdArfath456/Forsara_Lead`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**
   - No environment variables needed for frontend (API calls are proxied)

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy (2-5 minutes)
   - You'll get a production URL

---

## 3. Post-Deployment Setup

### Seed Admin User (Backend only)

After backend deployment, create an admin user:

**Option A: Using Render Shell**
1. Go to Render dashboard → Your service
2. Click "Shell" tab
3. Run: `npm run seed:admin admin-username admin-password`

**Option B: Local script with production database**
```bash
MONGO_URI="your_production_mongodb_uri" node src/scripts/seedAdmin.js username password
```

### Test the Deployment

1. **Frontend**: Visit your Vercel URL
2. **Login**: Use credentials from admin seeding
3. **Check Console**: Open DevTools to verify API calls go to Render backend
4. **Test Features**: Try search, enrichment, analytics

---

## 4. Environment Variables Reference

### Backend (.env)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| NODE_ENV | Yes | `production` | |
| PORT | Yes | `5000` | Render sets this automatically |
| MONGO_URI | Yes | `mongodb+srv://...` | MongoDB Atlas connection string |
| REDIS_URL | No | `redis://...` | Optional, improves caching |
| SESSION_SECRET | Yes | `<random-64-char-string>` | Generate secure random value |
| GOOGLE_PLACES_API_KEY | Yes | | Google Cloud Console |
| FOURSQUARE_API_KEY | Yes | | Foursquare Developer Console |
| APOLLO_API_KEY | Yes | | Apollo API website |
| EXPLORIUM_API_KEY | Yes | | Explorium API website |

### Frontend (vercel.json)

The frontend proxies API requests to the backend URL. Update the `vercel.json` file if your Render URL changes.

---

## 5. Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Verify all required API keys are set
- Check Render logs: Dashboard → Service → Logs

### Frontend API calls failing
- Verify Render URL in `vercel.json`
- Check CORS configuration in backend (should be enabled)
- Check browser console for specific error messages

### Database connection issues
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas (add Render IPs)
- Test connection locally first

### Slow deployments
- First deployment takes longer (cold start)
- Render free tier is limited; upgrade for better performance
- Check build logs for bottlenecks

---

## 6. Monitoring & Logs

### Render Backend Logs
- Dashboard → Service → Logs
- Check for errors, crashes, or warnings

### Vercel Frontend Logs
- Dashboard → Project → Deployments
- Click on specific deployment to see build logs

### Production Debugging
- Monitor error logs in both services
- Check database query performance
- Monitor API response times

---

## 7. Updates & Redeployment

Both services auto-redeploy when you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel and Render will automatically build and deploy within 2-5 minutes.

---

## Contact & Support

For issues:
1. Check Render/Vercel logs first
2. Verify all environment variables are set
3. Test locally before pushing
4. Check GitHub Issues for similar problems
