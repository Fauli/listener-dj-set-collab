#!/bin/bash
set -e

# Listener Production Setup Script for Hetzner Cloud
# This script sets up a production-ready deployment on Ubuntu 22.04/24.04

# Usage information
usage() {
  cat << EOF
🎧 Listener Production Setup for Hetzner Cloud

Usage: $0 [OPTIONS]

Required Options:
  -d, --domain DOMAIN              Domain name (e.g., listener.example.com)
  -e, --email EMAIL               Email for SSL certificate
  -p, --db-password PASSWORD      PostgreSQL database password
  -s, --session-secret SECRET     Session secret (min 32 characters)
  -i, --github-client-id ID       GitHub OAuth Client ID
  -k, --github-client-secret KEY  GitHub OAuth Client Secret
  -r, --git-repo URL              Git repository URL (SSH or HTTPS)

Optional:
  -h, --help                      Show this help message

Example:
  $0 \\
    --domain listener.example.com \\
    --email admin@example.com \\
    --db-password "super-secret-password" \\
    --session-secret "\$(openssl rand -base64 32)" \\
    --github-client-id "abc123..." \\
    --github-client-secret "xyz789..." \\
    --git-repo "https://github.com/username/listener.git"

Generate a random session secret:
  openssl rand -base64 32

EOF
  exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Parse command line arguments
DOMAIN=""
SSL_EMAIL=""
DB_PASSWORD=""
SESSION_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GIT_REPO=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--domain)
      DOMAIN="$2"
      shift 2
      ;;
    -e|--email)
      SSL_EMAIL="$2"
      shift 2
      ;;
    -p|--db-password)
      DB_PASSWORD="$2"
      shift 2
      ;;
    -s|--session-secret)
      SESSION_SECRET="$2"
      shift 2
      ;;
    -i|--github-client-id)
      GITHUB_CLIENT_ID="$2"
      shift 2
      ;;
    -k|--github-client-secret)
      GITHUB_CLIENT_SECRET="$2"
      shift 2
      ;;
    -r|--git-repo)
      GIT_REPO="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "❌ Unknown option: $1"
      echo ""
      usage
      ;;
  esac
done

# Validate required arguments
if [ -z "$DOMAIN" ] || [ -z "$SSL_EMAIL" ] || [ -z "$DB_PASSWORD" ] || \
   [ -z "$SESSION_SECRET" ] || [ -z "$GITHUB_CLIENT_ID" ] || \
   [ -z "$GITHUB_CLIENT_SECRET" ] || [ -z "$GIT_REPO" ]; then
  echo "❌ Error: Missing required arguments"
  echo ""
  usage
fi

# Validate session secret length
if [ ${#SESSION_SECRET} -lt 32 ]; then
  echo "❌ Error: Session secret must be at least 32 characters long"
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

echo "🎧 Listener Production Setup for Hetzner Cloud"
echo "================================================"
echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Email: $SSL_EMAIL"
echo "  Database: listener (PostgreSQL 17)"
echo "  Repository: $GIT_REPO"
echo ""
echo "Starting installation..."
echo ""

# Update system
echo ""
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
echo ""
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL 17
echo ""
echo "📦 Installing PostgreSQL 17..."
apt-get install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
apt-get install -y postgresql-17

# Install other dependencies
echo ""
echo "📦 Installing additional packages..."
apt-get install -y git nginx certbot python3-certbot-nginx ufw ffmpeg

# Install PM2 globally
echo ""
echo "📦 Installing PM2 process manager..."
npm install -g pm2

# Configure PostgreSQL
echo ""
echo "🗄️  Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE USER listener WITH PASSWORD '$DB_PASSWORD';" || true
sudo -u postgres psql -c "CREATE DATABASE listener OWNER listener;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE listener TO listener;" || true

# Configure firewall
echo ""
echo "🔥 Configuring UFW firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw reload

# Create app user
echo ""
echo "👤 Creating application user..."
useradd -m -s /bin/bash listener || true
usermod -aG sudo listener || true

# Setup application directory
echo ""
echo "📁 Setting up application directory..."
APP_DIR="/home/listener/app"
mkdir -p $APP_DIR
chown -R listener:listener $APP_DIR
cd $APP_DIR

# Clone repository
echo ""
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
  echo "Repository already exists, pulling latest changes..."
  sudo -u listener git pull
else
  sudo -u listener git clone $GIT_REPO .
fi

# Create production .env file
echo ""
echo "📝 Creating production environment file..."

# Preserve existing JWT_SECRET if .env already exists
EXISTING_JWT_SECRET=""
if [ -f "$APP_DIR/.env" ]; then
  EXISTING_JWT_SECRET=$(grep "^JWT_SECRET=" "$APP_DIR/.env" | cut -d'=' -f2)
fi

# Use existing JWT_SECRET or generate new one
if [ -z "$EXISTING_JWT_SECRET" ]; then
  JWT_SECRET_VALUE=$(openssl rand -base64 32)
  echo "Generating new JWT_SECRET"
else
  JWT_SECRET_VALUE="$EXISTING_JWT_SECRET"
  echo "Preserving existing JWT_SECRET"
fi

cat > $APP_DIR/.env <<EOF
# Production Configuration
NODE_ENV=production
PORT=3000

# Database (PostgreSQL 17)
DATABASE_URL=postgresql://listener:$DB_PASSWORD@localhost:5432/listener

# Authentication
JWT_SECRET=$JWT_SECRET_VALUE
JWT_EXPIRES_IN=7d

# Session (for OAuth)
SESSION_SECRET=$SESSION_SECRET

# OAuth2 - GitHub
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
GITHUB_CALLBACK_URL=https://$DOMAIN/auth/github/callback

# Client URL (for OAuth redirects)
CLIENT_URL=https://$DOMAIN

# CORS
ALLOWED_ORIGINS=https://$DOMAIN

# Socket.io
SOCKET_PORT=3000
EOF

chown listener:listener $APP_DIR/.env
chmod 600 $APP_DIR/.env

# Install dependencies
echo ""
echo "📦 Installing application dependencies..."
if ! sudo -u listener npm install; then
  echo "❌ npm install failed"
  exit 1
fi

# Generate Prisma Client (required before build)
echo ""
echo "🗄️  Generating Prisma Client..."
sudo -u listener npx prisma generate

# Build application
echo ""
echo "🔨 Building application..."
echo "Running TypeScript compilation..."
if ! sudo -u listener npm run build:server; then
  echo "❌ Server build failed - TypeScript compilation errors"
  echo "Check the errors above and fix TypeScript issues in src/server/"
  exit 1
fi

echo ""
echo "Running client build..."
if ! sudo -u listener npm run build:client; then
  echo "❌ Client build failed"
  exit 1
fi

echo "✅ Both builds completed"

# Verify build succeeded
if [ ! -d "$APP_DIR/dist" ]; then
  echo "❌ Build failed: dist directory not created"
  echo "Check build logs above for errors"
  exit 1
fi

echo "📋 Checking build output..."
echo "Contents of dist/:"
ls -la "$APP_DIR/dist/"

if [ -d "$APP_DIR/dist/server" ]; then
  echo ""
  echo "Contents of dist/server/:"
  ls -laR "$APP_DIR/dist/server/" | head -50
else
  echo "❌ dist/server/ directory not found"
  exit 1
fi

if [ ! -f "$APP_DIR/dist/server/server/index.js" ]; then
  echo ""
  echo "❌ Build failed: dist/server/server/index.js not found"
  echo ""
  echo "Searching for index.js in dist/:"
  find "$APP_DIR/dist" -name "index.js" -type f 2>/dev/null || echo "No index.js found"
  echo ""
  echo "This usually means TypeScript compilation failed."
  echo "Check for TypeScript errors in the build output above."
  exit 1
fi

echo ""
echo "✅ Build successful - dist/server/server/index.js found"

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
if [ -d "$APP_DIR/prisma/migrations" ] && [ "$(ls -A $APP_DIR/prisma/migrations)" ]; then
  sudo -u listener npx prisma migrate deploy
else
  echo "⚠️  No migrations found in prisma/migrations directory"
  echo "This might be expected for a fresh database"
  echo "Pushing schema to database instead..."
  sudo -u listener npx prisma db push --accept-data-loss
fi

# Configure PM2
echo ""
echo "🚀 Configuring PM2..."
cat > $APP_DIR/ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [{
    name: 'listener',
    script: './dist/server/server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

chown listener:listener $APP_DIR/ecosystem.config.cjs

# Create logs directory
mkdir -p $APP_DIR/logs
chown listener:listener $APP_DIR/logs

# Start application with PM2
echo ""
echo "🚀 Starting application..."

# Check if app is already running in PM2
if sudo -u listener pm2 describe listener > /dev/null 2>&1; then
  echo "App is already running, restarting..."
  sudo -u listener pm2 restart listener
else
  echo "Starting app for the first time..."
  sudo -u listener pm2 start $APP_DIR/ecosystem.config.cjs
fi

sudo -u listener pm2 save

# Setup PM2 startup script (idempotent - safe to run multiple times)
pm2 startup systemd -u listener --hp /home/listener

# Configure Nginx
echo ""
echo "🌐 Configuring Nginx..."

# Check if SSL certificate already exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "SSL certificate found - configuring HTTPS"
  HAS_SSL=true
else
  echo "No SSL certificate - configuring HTTP only (will be upgraded by certbot)"
  HAS_SSL=false
fi

# Create initial HTTP-only configuration
cat > /etc/nginx/sites-available/listener <<EOF
# HTTP server
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Let's Encrypt challenge directory
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Client max body size (for file uploads)
    client_max_body_size 100M;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # WebSocket support
        proxy_read_timeout 86400;
    }

    # Socket.io endpoint
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/listener /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
if ! nginx -t; then
  echo "❌ Nginx configuration test failed"
  exit 1
fi

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx

# Obtain SSL certificate
echo ""
echo "🔒 Setting up SSL certificate..."
mkdir -p /var/www/certbot

# Only run certbot if certificate doesn't exist
if [ "$HAS_SSL" = false ]; then
  echo "Obtaining SSL certificate with certbot..."
  echo "This will automatically update Nginx config to add HTTPS"

  # Wait a moment for Nginx to be fully ready
  sleep 2

  # Run certbot with verbose output
  if certbot --nginx -d $DOMAIN --email $SSL_EMAIL --agree-tos --non-interactive --redirect 2>&1 | tee /tmp/certbot-output.log; then
    echo ""
    echo "✅ SSL certificate obtained successfully"

    # Verify certificate was actually created
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
      echo "✅ Certificate files verified at /etc/letsencrypt/live/$DOMAIN/"

      # Verify Nginx config was updated with SSL
      if grep -q "ssl_certificate" /etc/nginx/sites-enabled/listener; then
        echo "✅ Nginx configuration updated with SSL settings"
      else
        echo "⚠️  Warning: Nginx config may not have been updated by certbot"
        echo "Run manually: sudo certbot --nginx -d $DOMAIN"
      fi
    else
      echo "❌ Certificate files not found after certbot run"
      echo "Check /tmp/certbot-output.log for details"
    fi
  else
    echo ""
    echo "❌ Failed to obtain SSL certificate"
    echo "Common causes:"
    echo "  - DNS not pointing to this server yet (check: dig +short $DOMAIN)"
    echo "  - Firewall blocking port 80/443"
    echo "  - Domain already has rate-limited certificate attempts"
    echo ""
    echo "The application is accessible via HTTP at: http://$DOMAIN"
    echo "Once DNS is correct, run: sudo certbot --nginx -d $DOMAIN --email $SSL_EMAIL"
    echo ""
    echo "Certbot output saved to: /tmp/certbot-output.log"
  fi
else
  echo "SSL certificate already exists"

  # Verify Nginx is configured for SSL
  if grep -q "ssl_certificate" /etc/nginx/sites-enabled/listener; then
    echo "✅ Nginx already configured for HTTPS"
  else
    echo "⚠️  SSL certificate exists but Nginx not configured for HTTPS"
    echo "Running certbot to update Nginx configuration..."
    if certbot --nginx -d $DOMAIN --email $SSL_EMAIL --agree-tos --non-interactive --redirect; then
      echo "✅ Nginx configuration updated for HTTPS"
    else
      echo "❌ Failed to update Nginx configuration"
      echo "Run manually: sudo certbot --nginx -d $DOMAIN"
    fi
  fi
fi

# Final verification
echo ""
echo "🔍 Final SSL verification..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "✅ SSL certificate: PRESENT"

  if grep -q "listen 443 ssl" /etc/nginx/sites-enabled/listener; then
    echo "✅ Nginx HTTPS: CONFIGURED"
    echo "✅ Your site should be accessible at: https://$DOMAIN"
  else
    echo "⚠️  Nginx HTTPS: NOT CONFIGURED"
    echo "Certificate exists but Nginx config needs updating"
    echo "Run: sudo certbot --nginx -d $DOMAIN"
  fi
else
  echo "⚠️  SSL certificate: NOT PRESENT"
  echo "Site accessible via HTTP: http://$DOMAIN"
fi

# Setup automatic certificate renewal
echo ""
echo "🔄 Setting up automatic SSL renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Final checks
echo ""
echo "✅ Installation complete!"
echo ""
echo "================================================"
echo "🎧 Listener is now running!"
echo "================================================"
echo ""
echo "🌐 URL: https://$DOMAIN"
echo "📊 PM2 status: pm2 status"
echo "📋 PM2 logs: pm2 logs listener"
echo "🔄 Restart app: pm2 restart listener"
echo ""
echo "Important commands:"
echo "  - View logs: pm2 logs listener"
echo "  - Restart: pm2 restart listener"
echo "  - Stop: pm2 stop listener"
echo "  - Check status: pm2 status"
echo "  - Update app: cd $APP_DIR && git pull && npm install && npm run build && pm2 restart listener"
echo ""
echo "Don't forget to:"
echo "  1. Update GitHub OAuth callback URL to: https://$DOMAIN/auth/github/callback"
echo "  2. Test the application at: https://$DOMAIN"
echo "  3. Monitor logs for any issues"
echo ""
