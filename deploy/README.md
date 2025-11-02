# Listener Deployment Scripts

Production deployment setup for Hetzner Cloud servers.

## Quick Start

### 1. Prerequisites
- Ubuntu 22.04/24.04 Hetzner Cloud server
- Domain name pointing to server IP
- GitHub OAuth App (production credentials)
- Root SSH access

### 2. Deploy

```bash
# On your Hetzner server (as root):
curl -o setup.sh https://raw.githubusercontent.com/YOUR_USERNAME/listener/main/deploy/hetzner-setup.sh
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
# Copy script to server
scp deploy/hetzner-setup.sh root@YOUR_SERVER_IP:/root/

# SSH into server
ssh root@YOUR_SERVER_IP

# Run setup
chmod +x /root/hetzner-setup.sh
/root/hetzner-setup.sh
```

### 3. Update Application

```bash
cd /home/listener/app
git pull
npm install
npm run build
npx prisma migrate deploy
pm2 restart listener
```

## Files

- **`hetzner-setup.sh`** - Main deployment script
- **`DEPLOYMENT_GUIDE.md`** - Comprehensive deployment guide
- **`README.md`** - This file

## What Gets Installed

- Node.js 20.x
- PostgreSQL 17
- Nginx (reverse proxy with SSL)
- PM2 (process manager)
- UFW firewall
- SSL certificate (Let's Encrypt)

## Important Paths

| Path | Description |
|------|-------------|
| `/home/listener/app` | Application directory |
| `/home/listener/app/.env` | Environment variables |
| `/home/listener/app/logs` | PM2 logs |
| `/etc/nginx/sites-available/listener` | Nginx config |
| `/var/log/nginx/` | Nginx logs |

## Common Commands

```bash
# Application
pm2 status              # Check status
pm2 logs listener       # View logs
pm2 restart listener    # Restart app
pm2 monit               # Monitor resources

# Nginx
nginx -t                # Test config
systemctl reload nginx  # Reload

# Database
sudo -u postgres psql listener  # Access DB

# SSL
certbot certificates    # Check SSL status
```

## Troubleshooting

1. **Check logs**: `pm2 logs listener --err`
2. **Check status**: `pm2 status`
3. **Verify DB**: `sudo -u postgres psql -c "SELECT version();"`
4. **Test Nginx**: `nginx -t`
5. **Check DNS**: `dig your-domain.com`

## Security

- SSL/HTTPS enabled automatically
- Firewall configured (ports 22, 80, 443)
- Database password protected
- Session secrets auto-generated
- HTTP-only cookies

## Support

See **DEPLOYMENT_GUIDE.md** for detailed documentation and troubleshooting.

## Cost

Recommended Hetzner server: **CPX21** (~€10/month)
- 3 vCPU
- 4GB RAM
- 80GB SSD

Perfect for production with moderate traffic.
