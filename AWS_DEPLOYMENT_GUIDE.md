# 🚀 AWS Hosting Guide for Appointly

This document provides complete instructions for deploying the **Appointly** full-stack web application on **Amazon Web Services (AWS)**.

---

## 🧭 Architecture Comparison

### Recommended Option: AWS EC2 / Lightsail (Ubuntu 22.04 or 24.04)
- **Best for:** Full control, lowest monthly cost (AWS Free Tier eligible: `t2.micro` or `t3.micro` free for 12 months; Lightsail starts at $3.50/mo).
- **Features:** Nginx serves the optimized React Vite build + handles WebSockets (`socket.io`) + proxies REST APIs to Node.js backend managed by PM2.

---

## 📋 Step-by-Step Deployment on AWS EC2 / Lightsail

### Step 1: Launch an EC2 Instance (or Lightsail Instance)
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **EC2** -> **Launch Instance**.
3. **Name:** `appointly-server`
4. **OS Image:** **Ubuntu 24.04 LTS (HVM)**
5. **Instance Type:** `t2.micro` or `t3.micro` (Free tier eligible) or `t3.small` (2GB RAM recommended).
6. **Key Pair:** Create a new key pair (e.g. `appointly-key.pem`) and download it.
7. **Network Settings (Security Group):**
   - Allow **SSH** (Port 22)
   - Allow **HTTP** (Port 80)
   - Allow **HTTPS** (Port 443)
8. Click **Launch Instance**.

---

### Step 2: Connect to your Server
Open your terminal (PowerShell, Command Prompt, or Git Bash) where your `.pem` key was downloaded:

```bash
# Set key permissions (on Linux/Mac: chmod 400 appointly-key.pem)
ssh -i "appointly-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

---

### Step 3: Install Node.js, Nginx, Git & PostgreSQL

Run the following commands on the server:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git

# Verify installations
node -v
npm -v
nginx -v

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

#### Install & Configure PostgreSQL:
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create Database and User
sudo -u postgres psql
```
Inside the PostgreSQL prompt (`postgres=#`):
```sql
CREATE DATABASE appointly;
CREATE USER appointly_user WITH ENCRYPTED PASSWORD 'YourStrongDbPassword123!';
GRANT ALL PRIVILEGES ON DATABASE appointly TO appointly_user;
ALTER DATABASE appointly OWNER TO appointly_user;
\q
```

---

### Step 4: Clone & Configure the Project

```bash
# Navigate to web root
sudo mkdir -p /var/www/appointly
sudo chown -R ubuntu:ubuntu /var/www/appointly
cd /var/www/appointly

# Clone your repository
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git .
```

#### Setup Backend:
```bash
cd /var/www/appointly/backend

# Create production .env file
nano .env
```
Paste your production environment variables:
```env
PORT=5000
DATABASE_URL="postgresql://appointly_user:YourStrongDbPassword123!@localhost:5432/appointly?schema=public"
JWT_SECRET="generate_a_random_64_character_string_here"
JWT_EXPIRES_IN=30d
ACCESS_TOKEN_EXPIRES_IN=30d
REFRESH_TOKEN_EXPIRES_IN=30d
FRONTEND_URL="http://YOUR_EC2_PUBLIC_IP" # Update to https://yourdomain.com once SSL is configured

# EmailJS & SMS (Optional / As needed)
EMAILJS_SERVICE_ID=your_id
EMAILJS_TEMPLATE_ID=your_id
EMAILJS_GENERIC_TEMPLATE_ID=your_id
EMAILJS_PUBLIC_KEY=your_key
EMAILJS_PRIVATE_KEY=your_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Save and exit nano (`Ctrl + O`, `Enter`, `Ctrl + X`).

Install backend dependencies and run database migrations:
```bash
npm install
npx prisma generate
npx prisma db push

# Optional: Seed initial data if needed
# npm run db:seed-bulk

# Start backend with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

### Step 5: Build the Frontend

```bash
cd /var/www/appointly/frontend

# Create frontend .env
nano .env
```
Paste:
```env
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP/api # Or https://yourdomain.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Build the production bundle:
```bash
npm install
npm run build
```

This creates the optimized bundle in `/var/www/appointly/frontend/dist`.

---

### Step 6: Configure Nginx Reverse Proxy

Copy the provided Nginx configuration:
```bash
sudo cp /var/www/appointly/nginx.conf /etc/nginx/sites-available/appointly
```

Edit the file to set your domain or server IP:
```bash
sudo nano /etc/nginx/sites-available/appointly
```
*(Replace `yourdomain.com` with your EC2 Public IP or actual domain name)*.

Enable the site and restart Nginx:
```bash
# Disable default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable Appointly site
sudo ln -sf /etc/nginx/sites-available/appointly /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl restart nginx
```

---

### Step 7: Configure Free SSL (HTTPS) with Certbot (When using a Domain)

Once you point your domain (e.g. `yourdomain.com`) to your EC2 Elastic IP in Route 53 or your DNS registrar:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically configure HTTPS, renew certificates every 90 days, and redirect HTTP to HTTPS!

---

## 🛡️ Elastic IP Setup (Important!)
By default, AWS EC2 public IPs can change when instances are stopped and restarted.
1. In the EC2 Console, go to **Network & Security** -> **Elastic IPs**.
2. Click **Allocate Elastic IP address**.
3. Select the IP -> **Actions** -> **Associate Elastic IP address**.
4. Choose your `appointly-server` instance.
5. Your IP is now static and permanent.

---

## 🔄 How to Deploy Updates in the Future

Whenever you push new code to GitHub, deploy updates on your server in 2 minutes:

```bash
cd /var/www/appointly

# 1. Pull latest code
git pull origin master

# 2. Update backend
cd backend
npm install
npx prisma generate
npx prisma db push
pm2 restart appointly-backend

# 3. Update frontend
cd ../frontend
npm install
npm run build

echo "Deployment complete!"
```
