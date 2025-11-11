# 🧪 Error Handling Testing Guide

## Quick Start (Without Docker)

If Docker is having network issues, run the app locally:

### 1. Start Backend (if using Docker for backend only)
```bash
# Start just backend and database
docker-compose up db backend
```

### 2. Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:3000

---

## 🎯 Testing Error Messages

### Method 1: Browser DevTools (Easiest)

1. **Open Chrome DevTools** (F12 or Cmd+Option+I)
2. Go to **Network** tab
3. Enable **"Offline"** mode or use **"Slow 3G"** to simulate network issues

### Method 2: Block API Requests

1. Open DevTools → **Network** tab
2. Right-click on any API request
3. Select **"Block request URL"** or **"Block request domain"**
4. Refresh the page to see error messages

### Method 3: Modify API Endpoints (Temporary)

Temporarily break API calls in the code to test error handling:

```typescript
// In frontend/src/lib/api.facts.ts - temporarily change:
const base = "http://invalid-url-that-does-not-exist.com/api";
```

---

## 📋 Test Scenarios Checklist

### ✅ Authentication Errors

**Test Login Errors:**
1. Go to `/login`
2. Enter wrong credentials → Should show: "The password you entered is incorrect."
3. Enter non-existent email → Should show: "We couldn't find an account with that email or username."

**Test Signup Errors:**
1. Go to `/login` → Signup tab
2. Enter existing username → Should show: "Username already taken"
3. Enter existing email → Should show: "Email already in use"
4. Enter weak password → Should show password validation errors
5. Mismatched passwords → Should show: "Passwords do not match"

### ✅ API Loading Errors

**Test Facts Pages:**
1. Go to homepage → Scroll to "Recommended for your routine" section
2. Block API requests to `/api/facts/topics/recommended`
3. Should see: "We couldn't load recommended topics right now. Please try again later."

**Test Popular Topics:**
1. Go to homepage → Scroll to "Skin Facts" section
2. Block API requests to `/api/facts/topics/popular`
3. Should see: "We couldn't load popular topics right now."

**Test Trending Skincare:**
1. Go to homepage → Scroll to "Trending Skincare" section
2. Block API requests to `/api/facts/topics/section/trending`
3. Should see: "We couldn't load trending skincare stories right now."

### ✅ Product Scanner Errors

**Test Image Upload:**
1. Go to homepage → Find "Instant Product Scanner"
2. Upload an invalid file (e.g., .txt file)
3. Should show error about file type

**Test OCR Errors:**
1. Upload a blurry/unreadable image
2. Should show: "We couldn't read that label clearly. Try cropping closer..."

**Test Text Analysis:**
1. Paste invalid/empty text
2. Should show appropriate error message

### ✅ Newsletter Errors

**Test Newsletter Signup:**
1. Go to homepage → Find newsletter signup
2. Enter invalid email → Should show: "Please enter a valid email address."
3. Enter empty email → Should show: "Please enter your email address."

### ✅ Quiz Errors

**Test Quiz Session:**
1. Go to `/quiz`
2. Block API requests to quiz endpoints
3. Should show: "We couldn't start a new quiz session. Please try again."

**Test Quiz Results:**
1. Complete quiz → Go to results page
2. Block API requests to product details
3. Click on a product → Should show error with "Try again" button

### ✅ Account Page Errors

**Test Profile Loading:**
1. Go to `/account` without being logged in
2. Should redirect to login or show error

**Test Wishlist:**
1. Go to `/account` → Wishlist tab
2. Block API requests to wishlist endpoints
3. Should show error message

**Test Match History:**
1. Go to `/account` → Match History tab
2. Block API requests
3. Should show: "Failed to load match history"

---

## 🔧 Advanced Testing with Browser Console

### Simulate Network Errors

Open browser console and run:

```javascript
// Block all API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return Promise.reject(new Error('Network error'));
};

// Restore after testing
window.fetch = originalFetch;
```

### Simulate Specific API Errors

```javascript
// Block specific endpoint
const originalFetch = window.fetch;
window.fetch = function(url, ...args) {
  if (url.includes('/api/facts/topics/recommended')) {
    return Promise.reject(new Error('API Error'));
  }
  return originalFetch(url, ...args);
};
```

### Simulate Slow Network

In DevTools → Network tab:
1. Click throttling dropdown
2. Select "Slow 3G" or "Fast 3G"
3. Watch for loading states and timeout errors

---

## 🎨 Visual Testing Checklist

For each error scenario, verify:

- [ ] Error message is visible and readable
- [ ] Error message is user-friendly (no technical jargon)
- [ ] Error styling is consistent (red/orange borders, clear text)
- [ ] Loading states disappear when error occurs
- [ ] User can retry the action (if applicable)
- [ ] Page doesn't crash or show blank screen
- [ ] Other parts of the page still work

---

## 🐛 Common Issues to Test

1. **Backend Down**: Stop backend container → All API calls should show errors
2. **Database Down**: Stop database container → Backend errors should propagate
3. **Network Timeout**: Use "Slow 3G" → Should show timeout errors
4. **Invalid Token**: Clear localStorage → Should redirect to login
5. **CORS Errors**: Check console for CORS issues

---

## 📝 Quick Test Script

Run this in browser console to test all error scenarios:

```javascript
// Test error handling
async function testErrors() {
  console.log('Testing error handling...');
  
  // Test 1: Block API calls
  const originalFetch = window.fetch;
  window.fetch = () => Promise.reject(new Error('Test error'));
  
  // Reload page to see errors
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('Restored fetch. Refresh page to test normal behavior.');
  }, 5000);
}

testErrors();
```

---

## ✅ Expected Results

All error messages should:
- Be visible to users
- Use plain language (no technical errors)
- Provide actionable next steps
- Match the design system (colors, fonts, spacing)
- Not break the page layout

