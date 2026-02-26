# DayNote Backend Improvements

## Current Status
✅ Mobile API working (`/sessions`, `/sessions/:id/chunks`, `/sessions/:id/summarize`)
✅ Token authentication
✅ Rate limiting
✅ AI summarization with action items, agenda, reminders

## Improvements Needed for iOS App

### 1. **Background Recording Support**
- Add session keep-alive endpoint
- Handle partial uploads during network interruptions
- Chunk deduplication already works ✅

### 2. **Enhanced AI Analysis**
Current extraction:
- ✅ Action items
- ✅ Agenda suggestions  
- ✅ Reminders
- ✅ Important facts

**Add:**
- **Email drafts** - Extract emails that need to be sent with:
  - Recipient
  - Subject
  - Draft body
  - Priority
- **Follow-up detection** - Identify unresolved items from previous sessions
- **Sentiment analysis** - Detect urgency/priority
- **Entity extraction** - People, companies, dates, amounts

### 3. **Smart Notifications**
- Push notifications when:
  - High-priority action item detected
  - Deadline approaching (from reminders)
  - Meeting needs scheduling (from agenda)
  
### 4. **Integration Endpoints**
- **Calendar integration** - Create events from agenda items
- **Email integration** - Send drafted emails
- **Task managers** - Export to Todoist, Things, etc.

### 5. **Session Management**
- List sessions with filters (date range, has actions, etc.)
- Search transcripts
- Delete sessions
- Export session data

### 6. **Analytics**
- Daily/weekly summary
- Action item completion tracking
- Most mentioned topics/people
- Time spent in meetings

## Next Steps

1. **Immediate** - Test the summarize endpoint with the iOS app
2. **Short-term** - Add email draft extraction
3. **Medium-term** - Build notification system
4. **Long-term** - Integrations with calendar/email

## Testing Plan

1. Record a test session with iOS app
2. Verify summarization works
3. Check action items are extracted
4. Validate agenda suggestions

---

Ready to implement these improvements!
