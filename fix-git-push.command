#!/bin/bash
# Remove stale git lock files and push the latest commits to GitHub.
# Double-click this file to run it.

cd "$(dirname "$0")"

echo "Removing stale git lock files..."
rm -f .git/HEAD.lock .git/index.lock

echo "Committing changes..."
git add -A
git commit -m "fix: SMS button uses phone-based count; add eligible-count + verbose debug endpoints"

echo "Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Vercel will deploy in ~1 minute."
read -p "Press Enter to close..."
