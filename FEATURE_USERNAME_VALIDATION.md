# Real-time Username Validation Feature

## Overview
Added real-time username availability checking on the signup page. When users type a username, the system immediately checks if it's available and displays feedback below the username field.

## Changes Made

### Backend (Django/Ninja API)
1. **New Endpoint**: `/api/auth/check-username` (POST)
   - Accepts: `{ "username": "string" }`
   - Returns: `{ "available": boolean, "message": "string" }`
   - Validates:
     - Username is not empty
     - Username is at least 3 characters
     - Username is not already taken (case-insensitive)

2. **New Schemas** in `backend/core/api.py`:
   - `UsernameCheckIn`: Input schema for username check
   - `UsernameCheckOut`: Response schema with availability status

3. **Tests** in `backend/core/tests/tests_account_auth_api.py`:
   - Test available username
   - Test taken username
   - Test case-insensitive checking
   - Test minimum length validation
   - Test empty username validation

### Frontend (Next.js/React)
1. **API Function** in `frontend/src/lib/api.auth.ts`:
   - `checkUsername(username: string)`: Calls the backend endpoint

2. **New Component** `frontend/src/components/UsernameRequirements.tsx`:
   - Styled to match PasswordRequirements component
   - Only displays when username is already taken
   - Shows red X icon with "Username already taken" message
   - Displays in a bordered box below username field

3. **UI Updates** in `frontend/src/app/login/page.tsx`:
   - Added state for username availability and checking status
   - Implemented debounced username checking (500ms delay)
   - Visual feedback:
     - Bordered box only appears when username is taken (matching password style)
     - Red X icon with error message
     - No display when username is available (clean UI)
   - Cleanup on component unmount and mode changes

## User Experience
- Users see immediate feedback as they type their username
- 500ms debounce prevents excessive API calls
- Clean UI approach:
  - No visual feedback when username is available (clean interface)
  - Error box only appears when username is already taken
  - Red X icon with "Username already taken" message
  - Bordered box with dashed border matching password requirements design
- Silent validation for available usernames keeps the form clean

## Testing
Run backend tests:
```bash
cd backend
python3 manage.py test core.tests.tests_account_auth_api
```

## API Usage Example
```bash
# Check if username is available
curl -X POST http://localhost:8000/api/auth/check-username \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser123"}'

# Response:
# {"available": true, "message": "Username is available"}
```
