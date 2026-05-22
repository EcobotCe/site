#!/bin/bash
set -e

echo "🔧 Railway Deployment Script Started"
echo "📌 Current NODE_ENV: $NODE_ENV"
echo "🔌 Current PORT: $PORT"
echo "🗂️  Listing directory:"
ls -la

echo "📦 Installing dependencies..."
npm ci --production

echo "🚀 Starting application..."
node server.js
