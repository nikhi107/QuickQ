# 🚀 Deployment Guide for QuickQ

Follow these steps precisely to get your entire QuickQ ecosystem deployed to the cloud for free using Vercel, Render, and Redis Cloud.

---

## Step 1: Push your project to GitHub
Before you can deploy using modern cloud platforms, your code MUST be in a GitHub repository.
1. Go to Github.com and create a new repository called `quickq` (or whatever you prefer).
2. Open your terminal in the root of your QuickQ folder and run:
   ```bash
   git init
   git add .
   git commit -m "First commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/quickq.git
   git push -u origin main
   ```

---

## Step 2: Create your Redis Cloud Database (Free)
Your backend needs a cloud database to store its queues because the default `localhost` won't work in the cloud.
1. Go to [Redis Cloud](https://redis.com/try-free/) and sign up for a free account.
2. Create a new "Free" subscription (30MB is plenty for QuickQ).
3. Once the database is created, look for the **Public Endpoint** and the **Default User Password**.
4. The endpoint usually looks like: `redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345`. Note the **Host** (everything before the colon) and the **Port** (everything after the colon) separately.

---

## Step 3: Deploy the Java Backend to Render (Free)
1. Go to [Render.com](https://render.com/) and sign in with GitHub.
2. Click **New** -> **Web Service**.
3. Select "Build and deploy from a Git repository" and select your `quickq` repository.
4. Render will ask for setup details:
   * **Name**: `quickq-backend`
   * **Root Directory**: `backend` *(⚠️ CRITICAL: Make sure to type 'backend' here!)*
   * **Environment**: `Docker` (Render will automatically detect the `Dockerfile` I created for you).
   * **Region**: Choose the one closest to you.
   * **Instance Type**: Free ($0/month).
5. Scroll down to **Environment Variables** and add the following keys:
   * `QUICKQ_REDIS_HOST`: (Enter the Redis host you got in Step 2, e.g., `redis-12345...redislabs.com`)
   * `QUICKQ_REDIS_PORT`: (Enter the Redis port, e.g., `12345`)
   * `spring.data.redis.password`: (Enter your Redis password)
   * `QUICKQ_CORS_ALLOWED_ORIGIN_PATTERNS`: `*` (This allows your frontends to connect. You can restrict this later).
6. Click **Create Web Service**. Wait 5-10 minutes for it to build and deploy.
7. Once deployed, note down your Render backend URL (e.g., `https://quickq-backend.onrender.com`).

---

## Step 4: Deploy the Frontends to Vercel (Free)

Now that your backend is alive, we deploy the two frontends and point them to your backend!

### Deploying the Admin Dashboard
1. Go to [Vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New** -> **Project**.
3. Import your `quickq` repository.
4. **⚠️ CRITICAL CONFIGURATION ⚠️**:
   * **Project Name**: `quickq-admin`
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click "Edit" and choose `admin-frontend`
5. Open the **Environment Variables** panel and add:
   * Name: `VITE_API_BASE_URL` | Value: `(Your Render Backend URL)` (e.g., `https://quickq-backend.onrender.com`)
   * Name: `VITE_WS_BASE_URL` | Value: `(Your Render Backend URL with wss:// instead of https://)` (e.g., `wss://quickq-backend.onrender.com`)
6. Click **Deploy**! Wait 1 minute.

### Deploying the Client App
1. Go back to your Vercel dashboard and click **Add New** -> **Project**.
2. Import your `quickq` repository again.
3. Configuration:
   * **Project Name**: `quickq-client`
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click "Edit" and choose `client-frontend`
4. Add the exact same **Environment Variables** you added for the admin dashboard:
   * `VITE_API_BASE_URL`
   * `VITE_WS_BASE_URL`
5. Click **Deploy**!

---

🎉 **Congratulations!** Your ecosystem is now live! Anyone with the Vercel Client Link can join the queue, and you can manage them from the Vercel Admin Link!
