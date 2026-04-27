# Payment "Failed to Fetch" - Debugging Guide

## Current Status
- ✅ Frontend running on: `http://localhost:5175/`
- ✅ Backend running on: `http://127.0.0.1:8000`
- ✅ Code updated with better error logging

## What's Happening

The "Failed to fetch" error in Payment page means one of these:
1. **Case ID mismatch** - The case ID in URL doesn't exist in your cases
2. **Authentication issue** - Token expired or user not properly logged in
3. **API error** - Backend returning an error response
4. **Case retrieval** - Case not being returned in the cases list (permissions issue)

## Debugging Steps

### Step 1: Open Browser Dev Tools
1. Open http://localhost:5175/
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Look for error messages in red

### Step 2: Check the Actual Error
You should now see console logs like:
- `"Fetched cases: [...]"` - Shows all available cases
- `"Case not found. Available cases..."` - Cases being searched
- `"Error fetching case: ..."` - Specific error details

### Step 3: Verify You're Logged In
1. Check if you see your username/profile in the top right
2. If not logged in, log in first as a client
3. Create or accept a case first
4. Then navigate to payment

### Step 4: Check Case Status
For the payment button to appear, the case must have:
- ✅ Case accepted by lawyer (`requestStatus = "approved"`)
- ✅ Case status NOT closed
- ✅ `amountCharged` should be set

### Step 5: Use Correct Case ID
Only use case IDs from cases that:
- You created (as client) OR
- Were assigned to you (as lawyer)

**Not accessible:** Cases assigned to other clients/lawyers

## Common Issues & Solutions

### Issue: "Case not found"
**Cause:** Case ID doesn't exist or wrong user type
**Solution:**
1. Go to `/dashboard/client/cases` or `/dashboard/lawyer/cases`
2. Find a case with status "approved" and payment required
3. Copy the case ID from URL or list
4. Try `/payment/{correct-case-id}`

### Issue: "Failed to fetch" with CORS error in console
**Cause:** Backend API is down or blocked
**Solution:**
```powershell
# Check backend status
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# If not showing "Listen", restart backend:
cd c:\Users\chand\Documents\lawbridge4\lawbridge\backend
python -m uvicorn main:app --reload
```

### Issue: "Failed to fetch" with 401 Unauthorized
**Cause:** Token expired
**Solution:**
1. Log out
2. Log back in
3. Try payment flow again

### Issue: Cases list is empty
**Cause:** No cases available for this user
**Solution:**
1. Create a new case request (as client)
2. Have lawyer accept it (switch to lawyer account)
3. Then try payment flow

## Quick Test Flow

```
1. Login as CLIENT
   ↓
2. Create case or find existing case
   ↓
3. Verify case status = "approved" with payment required
   ↓
4. Click "Proceed to Payment" button
   ↓
5. Watch browser console for detailed logs
   ↓
6. If error, copy the error message from console
```

## What the Updated Code Does

The new error handling now shows:
```javascript
// Logs all fetched cases
console.log("Fetched cases:", allCases);

// If case not found, shows all available cases
console.log("Case not found. Available cases:", allCases?.map(c => ({ id: c.id, _id: c._id, title: c.title })));

// Logs successful case load
console.log("Case data loaded:", theCase);

// Shows detailed errors
console.error("Error fetching case:", err);
```

## Browser Console Check

### If you see:
```
Fetched cases: Array(3) [ {...}, {...}, {...} ]
```
→ Cases are being fetched correctly

### If you see:
```
Case not found. Available cases: Array(2)
  0: { id: "507f1f77bcf86cd799439011", _id: "507f1f77bcf86cd799439011", title: "Divorce Case" }
  1: { id: "507f1f77bcf86cd799439012", _id: "507f1f77bcf86cd799439012", title: "Property Dispute" }
```
→ Use one of these case IDs in the URL

### If you see:
```
Error fetching case: Error: Request failed
```
→ Check backend or login again

## Next Steps for Testing

1. **After seeing console logs**, copy the error message
2. **Share the case ID** you're trying to access
3. **Share the available cases** from console output
4. **Check backend** has payment endpoints active

## Files Updated
- ✅ `src/pages/Payment.jsx` - Added console logging and better error messages
- ✅ Frontend reloaded on port 5175

## Immediate Action

1. Go to http://localhost:5175/
2. Open DevTools (F12 → Console)
3. Try accessing a payment page with case ID
4. Copy any error messages and share them

---
**Last Updated:** Now
**Status:** Ready to debug with detailed logging
