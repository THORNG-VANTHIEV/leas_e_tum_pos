#!/usr/bin/env bash

# Resolve application directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting LEASHAL ETUM POS Terminal (លៀសហាល អ៉ីទុម) V2.0"
echo " Local Server Environment: MAMP MySQL (8889) + Laravel"
echo "=========================================================="

# Run preflight verification
php scripts/launcher/preflight.php
if [ $? -ne 0 ]; then
    echo "Preflight check failed. Please resolve the errors above."
    read -p "Press Enter to exit..."
    exit 1
fi

# Ensure frontend assets are clean and available
if [ -f "public/hot" ]; then
    lsof -i :5173 > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "Cleaning up stale Vite hot-reload reference..."
        rm -f public/hot
    fi
fi

if [ ! -f "public/build/manifest.json" ]; then
    echo "Compiling frontend assets..."
    npm run build
fi

echo "Opening POS Terminal in default browser..."
open "http://127.0.0.1:8000"

# Check if artisan serve is already running on port 8000
lsof -i :8000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "POS server is already actively listening on http://127.0.0.1:8000."
    echo "Terminal session is live."
else
    echo "Starting local application server..."
    php artisan serve --port=8000
fi
