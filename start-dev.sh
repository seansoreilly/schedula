#!/bin/bash

# Schedula Development Server Startup Script
# This script ensures both frontend and API work together properly

echo "🚀 Starting Schedula Development Environment..."

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  Warning: .env file not found"
fi

# Kill any existing processes on development port
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No existing processes found"

# Verify environment variables
echo "🔍 Verifying configuration..."
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ Error: VITE_SUPABASE_URL not set"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: VITE_SUPABASE_ANON_KEY not set"
    exit 1
fi

echo "✅ Supabase URL: $VITE_SUPABASE_URL"
echo "✅ Supabase Key: [REDACTED]"

# Test API connectivity
echo "🔌 Testing Supabase connectivity..."
curl -s -o /dev/null -w "%{http_code}" "$VITE_SUPABASE_URL/rest/v1/" -H "apikey: $VITE_SUPABASE_ANON_KEY" > /tmp/supabase_test
SUPABASE_STATUS=$(cat /tmp/supabase_test)

if [ "$SUPABASE_STATUS" = "200" ]; then
    echo "✅ Supabase connection successful"
else
    echo "⚠️  Warning: Supabase connection returned status $SUPABASE_STATUS"
fi

# Start Vercel development server
echo "🌟 Starting Vercel development server..."
echo "📍 Frontend: http://localhost:3000"
echo "🔌 API: http://localhost:3000/api/"
echo ""
echo "🎯 Ready to create meetings!"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Fill in meeting title and your name"
echo "   3. Click 'Create Meeting'"
echo ""

# Start the server with proper environment variables
exec vercel dev --listen 3000