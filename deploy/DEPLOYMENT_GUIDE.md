# Listener - Production Deployment Guide for Hetzner Cloud

This guide will help you deploy Listener to a Hetzner Cloud server.

## Prerequisites

### 1. Hetzner Cloud Setup
- Ubuntu 22.04 or 24.04 server (2 vCPU, 4GB RAM minimum)
- Root SSH access
- Domain name pointing to your server's IP

### 2. Domain Configuration
Point your domain's A record to your Hetzner server IP:
```
Type: A
Name: @ (or subdomain like 'listener')
Value: YOUR_SERVER_IP
TTL: 300
```

### 3. GitHub OAuth App (Production)
Create a **separate** GitHub OAuth App for production:

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Listener (Production)
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/auth/github/callback`
4. Click "Register application"
5. Save your Client ID and generate a Client Secret

**Important**: Keep these credentials secure!

## Deployment Steps

### Step 1: Prepare Your Local Repository

1. **Push your code to a Git repository** (GitHub, GitLab, etc.)
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Make the deployment script executable**:
   ```bash
   chmod +x deploy/hetzner-setup.sh
   ```

### Step 2: Copy Script to Server

```bash
# SSH into your Hetzner server
ssh root@YOUR_SERVER_IP

# Create deployment directory
mkdir -p /root/deploy

# Exit SSH
exit

# Copy the deployment script from your local machine
scp deploy/hetzner-setup.sh root@YOUR_SERVER_IP:/root/deploy/
```

### Step 3: Run Deployment Script

```bash
# SSH back into your server
ssh root@YOUR_SERVER_IP

# Make script executable
chmod +x /root/deploy/hetzner-setup.sh

# Run the deployment script with all required arguments
/root/deploy/hetzner-setup.sh \
  --domain your-domain.com \
  --email your-email@example.com \
  --db-password "$(openssl rand -base64 32)" \
  --session-secret "$(openssl rand -base64 32)" \
  --github-client-id "YOUR_GITHUB_CLIENT_ID" \
  --github-client-secret "YOUR_GITHUB_CLIENT_SECRET" \
  --git-repo "https://github.com/YOUR_USERNAME/listener.git"
```

**Required Arguments:**
- `--domain` - Your domain name (e.g., `listener.example.com`)
- `--email` - Email for SSL certificate notifications
- `--db-password` - PostgreSQL database password (use strong random password)
- `--session-secret` - Session secret (minimum 32 characters, auto-generated above)
- `--github-client-id` - GitHub OAuth Client ID (from prerequisites)
- `--github-client-secret` - GitHub OAuth Client Secret (from prerequisites)
- `--git-repo` - Your Git repository URL (HTTPS or SSH)

**Tip:** Use `openssl rand -base64 32` to generate secure random secrets for passwords and session secrets.

### Step 4: Verify Installation

1. **Check application status**:
   ```bash
   pm2 status
   ```

2. **View application logs**:
   ```bash
   pm2 logs listener
   ```

3. **Test in browser**:
   Navigate to `https://your-domain.com`

## What the Script Installs

- ✅ Node.js 20.x
- ✅ PostgreSQL 17
- ✅ Nginx (reverse proxy)
- ✅ PM2 (process manager)
- ✅ Certbot (SSL certificates)
- ✅ UFW firewall (configured)
- ✅ Application dependencies
- ✅ Database migrations
- ✅ SSL certificate (Let's Encrypt)

## Post-Deployment

### Update GitHub OAuth Callback

Don't forget to update your GitHub OAuth App's callback URL to your production domain!

### Monitoring

```bash
# View real-time logs
pm2 logs listener

# Check application status
pm2 status

# Monitor server resources
htop
```

### Updating the Application

When you push updates to your repository:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update application
cd /home/listener/app
sudo -u listener git pull
sudo -u listener npm install
sudo -u listener npm run build
sudo -u listener npx prisma migrate deploy
pm2 restart listener
```

Or use the shortcut:
```bash
cd /home/listener/app && git pull && npm install && npm run build && npx prisma migrate deploy && pm2 restart listener
```

### Database Backups

Set up automatic PostgreSQL backups:

```bash
# Create backup directory
mkdir -p /home/listener/backups

# Add to crontab (runs daily at 2 AM)
crontab -e
```

Add this line:
```
0 2 * * * sudo -u postgres pg_dump listener > /home/listener/backups/listener_$(date +\%Y\%m\%d).sql
```

### Security Recommendations

1. **Change default SSH port** (optional but recommended):
   ```bash
   # Edit SSH config
   nano /etc/ssh/sshd_config
   # Change: Port 22 → Port 2222
   systemctl restart sshd
   ufw allow 2222/tcp
   ufw delete allow 22/tcp
   ```

2. **Setup SSH key authentication** and disable password auth

3. **Regular updates**:
   ```bash
   apt-get update && apt-get upgrade -y
   ```

4. **Monitor logs regularly**:
   ```bash
   pm2 logs listener --lines 100
   ```

## Useful Commands

### PM2 Process Management
```bash
pm2 status                 # View all processes
pm2 logs listener          # View logs
pm2 restart listener       # Restart application
pm2 stop listener          # Stop application
pm2 start listener         # Start application
pm2 reload listener        # Zero-downtime reload
pm2 monit                  # Monitor CPU/Memory
```

### Nginx
```bash
nginx -t                   # Test configuration
systemctl reload nginx     # Reload config
systemctl restart nginx    # Restart Nginx
systemctl status nginx     # Check status
```

### PostgreSQL
```bash
# Access database
sudo -u postgres psql listener

# Common queries
\dt                        # List tables
\d users                   # Describe users table
SELECT * FROM "Room";      # Query rooms
```

### SSL Certificate Renewal
```bash
# Certbot auto-renews, but you can test:
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal
```

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs listener --err

# Check environment variables
cat /home/listener/app/.env

# Verify database connection
sudo -u postgres psql -c "SELECT version();"
```

### SSL certificate issues
```bash
# Check certificate status
certbot certificates

# Test Nginx config
nginx -t

# Check DNS
dig your-domain.com
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process if needed
kill -9 PID
```

### Database connection errors
```bash
# Check PostgreSQL status
systemctl status postgresql

# Verify listener user exists
sudo -u postgres psql -c "\du"

# Test connection
sudo -u listener psql -h localhost -U listener -d listener
```

## Scaling

### Horizontal Scaling (Multiple Servers)

For high traffic, you can:

1. **Setup PostgreSQL on separate server**
2. **Use Redis for session storage**
3. **Setup load balancer**
4. **Use Socket.io Redis adapter for multi-server**

### Vertical Scaling (Bigger Server)

PM2 is configured to use all available CPU cores automatically (cluster mode).
If you upgrade your server, just restart the app:

```bash
pm2 restart listener
```

## Cost Estimate (Hetzner Cloud)

- **Small**: CPX11 (2 vCPU, 2GB RAM) - ~€5/month
- **Medium**: CPX21 (3 vCPU, 4GB RAM) - ~€10/month
- **Large**: CPX31 (4 vCPU, 8GB RAM) - ~€19/month

Recommended: **CPX21** for production with moderate traffic.

## Support

If you encounter issues:

1. Check the logs: `pm2 logs listener`
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running: `systemctl status postgresql`
4. Check Nginx config: `nginx -t`
5. Review this guide for troubleshooting steps

## Security Checklist

- [ ] SSL certificate is active (HTTPS)
- [ ] Firewall is configured (UFW)
- [ ] Database password is strong
- [ ] Session secret is random and secure
- [ ] GitHub OAuth credentials are production-only
- [ ] SSH key authentication is enabled
- [ ] Regular backups are configured
- [ ] Application logs are monitored
- [ ] System is kept updated

## Next Steps

Once deployed:

1. Test all functionality (login, create room, add tracks)
2. Monitor performance with `pm2 monit`
3. Set up regular backups
4. Configure monitoring/alerting (optional: UptimeRobot, Datadog)
5. Plan for scaling if needed

Enjoy your production Listener deployment! 🎧
