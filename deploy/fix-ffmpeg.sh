#!/bin/bash
# Quick fix script to install ffmpeg and restart the app
# Run this on your Hetzner server as root

set -e

echo "🎬 Installing FFmpeg and restarting Listener..."
echo ""

# Install ffmpeg
echo "📦 Installing ffmpeg..."
apt-get update
apt-get install -y ffmpeg

# Verify installation
echo ""
echo "🔍 Verifying ffmpeg installation..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg installed at: $(which ffmpeg)"
    echo "   Version: $(ffmpeg -version | head -n1)"
else
    echo "❌ ffmpeg installation failed"
    exit 1
fi

# Navigate to app directory
cd /home/listener/app

# Pull latest code (includes transcoder fix)
echo ""
echo "📥 Pulling latest code..."
sudo -u listener git pull

# Rebuild the app
echo ""
echo "🔨 Rebuilding application..."
sudo -u listener npm run build:server

# Restart with PM2
echo ""
echo "🔄 Restarting application..."
sudo -u listener pm2 restart listener

# Show status
echo ""
echo "✅ Done!"
echo ""
echo "📊 Application status:"
sudo -u listener pm2 status

echo ""
echo "📋 To view logs:"
echo "   sudo -u listener pm2 logs listener"
