#!/bin/bash
# Quick script to check your DayNote sessions

TOKEN="dnk_f0c73242794ba243338af6621d25b8f369465b3fa08a9d39f558263ca3f0fc98"
API="https://kncfxmooqnjdawrrrcaq.supabase.co/functions/v1/mobile-api"

echo "📋 Your DayNote Sessions:"
echo "========================"
echo ""

# This would need a list endpoint - let me check if it exists
curl -s "$API/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool || echo "No sessions endpoint yet - use web dashboard"

echo ""
echo "🌐 View in browser: https://day-note-flow.lovable.app"
