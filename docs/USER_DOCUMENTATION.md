# SkinMatch User Documentation

This guide is for everyday SkinMatch users. It explains what the platform does, how to sign up, and how to use the personalization, ingredient intelligence, and educational tools safely.

## Table of Contents
1. [Supported Platforms](#supported-platforms)
2. [Getting Started](#getting-started)
3. [Managing Your Skin Profile](#managing-your-skin-profile)
4. [Personalization Quiz & Routine Builder](#personalization-quiz--routine-builder)
5. [Understanding Recommendations](#understanding-recommendations)
6. [Ingredient & Label Guidance](#ingredient--label-guidance)
7. [Wishlist & Notifications](#wishlist--notifications)
8. [Skin Facts & Learning Hub](#skin-facts--learning-hub)
9. [Privacy, Security & Data Control](#privacy-security--data-control)
10. [Troubleshooting & Support](#troubleshooting--support)

---

## Supported Platforms

| Surface | Status | Notes |
|---------|--------|-------|
| Desktop web (Chrome/Edge/Safari/Firefox) | Fully supported | Latest two versions recommended |
| Mobile web (Safari/Chrome) | Fully supported | Installable as a PWA via the browser’s “Add to Home Screen” |
| Tablets | Fully supported | Landscape layout shows dashboard + insights simultaneously |
| Screen readers | Partially supported | The UI uses semantic labels; report gaps to support@skinmatch.com |

> Tip: Always refresh the page after an update announcement so the newest UI bundle loads.

---

## Getting Started

1. **Create an account**
   - Open https://app.skinmatch.com/ (localhost:3000 during local QA).
   - Choose “Sign up with email” or “Continue with Google”.
   - Email sign-ups require: first/last name, username, email, password, birth date (optional), gender (optional), acceptance of the Terms and Privacy Policy.
   - A confirmation email is sent instantly; click the link to unlock sharing features.

2. **Log in**
   - Use either the email/username + password combo or the Google button.
   - All sessions tokenize through `/api/v1/auth/token`, so you stay logged in across tabs for 4 hours (see developer docs for the idle timeout policy).

3. **Reset your password**
   - Click “Forgot password?” on the login page.
   - Enter the email tied to your account; you will receive a reset link powered by `/api/v1/auth/password/forgot`.
   - Links expire after 30 minutes for security.

---

## Managing Your Skin Profile

Your profile blends account details with skin-specific insights to drive recommendations.

- **Profile completion:** Navigate to *Profile → Skin info* and answer:
  - Primary/secondary concerns
  - Skin type and sensitivity level
  - Lifestyle notes (pregnancy/breastfeeding, climate, budget)
- **Avatar + preferences:** Upload an avatar or toggle the gradient fallback. You can also specify:
  - Routine reminder cadence (daily/weekly)
  - Preferred currency for product pricing
  - Whether you want educational emails
- **Editing:** Profile edits go through `/api/v1/auth/me` (PUT), so updates save instantly and sync across devices.
- **Deleting data:** Use *Profile → Security → Delete account*. This triggers GDPR-compliant deletion of quiz sessions, reviews, and wishlist items within 24 hours.

---

## Personalization Quiz & Routine Builder

SkinMatch walks you through the same question sequence that powers curated routines.

1. **Launch the quiz:** Click *Start a new quiz* on the dashboard. Behind the scenes, `/api/v1/quiz/start` seeds a session.
2. **Answer questions:** Each response is saved via `/api/v1/quiz/answer`. You can:
   - Skip a question (the engine relies on defaults but flags uncertainty in the summary).
   - Reorder or revisit questions using the “Review answers” drawer before submitting.
3. **Submit for results:** When you click *See my matches*, `/api/v1/quiz/submit` finalizes the session, generates routine steps, and stores them in history.
4. **Routine builder:**
   - Products are grouped by step (cleanser, toner, treatment, moisturizer, SPF).
   - Drag cards across steps, lock favorites, or swap using ingredient filters.
   - Save as a routine to show it inside the dashboard carousel.
5. **Quiz history:** Access earlier sessions through *History*. `/api/v1/quiz/history` lists them chronologically, and you can delete any session for privacy.

---

## Understanding Recommendations

- **Product cards:** Each card bundles the product photo, highlighted actives, risk warnings, and price. Click to open `/api/v1/quiz/products/{product_id}` data, which includes the full ingredient list and match score.
- **Compatibility badges:**
  - *Barrier Safe* — free from harsh exfoliants and drying alcohol.
  - *Pregnancy Alert* — flagged when retinoids or salicylic acid is detected.
  - *Fragrance Free* / *Essential oil alert* derived from ingredient metadata.
- **Match picks:** “SkinMatch Pick” banners highlight standout products for your parameters and remain pinned if your sessions are similar.
- **Email summary:** Use *Share via email* to send a condensed rundown. `/api/v1/quiz/email-summary` handles delivery and includes ingredient cautions plus usage notes.

---

## Ingredient & Label Guidance

1. **Ingredient suggestions:** Start typing inside *Ingredient Checker* to call `/api/v1/quiz/ingredients/suggest`. Useful when you have a bottle in hand and want to spot helpers vs irritants quickly.
2. **Ingredient search:** Paste an entire formula via `/api/v1/quiz/ingredients/search` to see categorized actives, support ingredients, and caution notes.
3. **Barcode scan:** Use the *Scan barcode* button on mobile. The upload hits `/api/v1/scan/scan` and `/api/v1/scan/resolve` to decode and cross-reference the catalog.
4. **Label OCR (beta):**
   - Upload a label photo into *Analyze label*. `/api/v1/scan-text/label/analyze-llm` extracts ingredients and generates benefits, actives, concerns, and notes, complete with a confidence score.
   - If you already have plain text, use *Paste ingredients* to call `/api/v1/scan-text/label/analyze-text`.
   - Low-confidence results are highlighted in orange so you know when to double-check manually.

---

## Wishlist & Notifications

- **Wishlist:** Tap the heart on any product card. `/api/v1/wishlist/add` stores the reference, and the list is available under *My Wishlist*. Remove items via `/api/v1/wishlist/{product_id}`.
- **Price & stock reminders:** Toggle the reminders switch when adding an item. Notifications send when an affiliate URL price drops or an item returns in stock.
- **Newsletter:** Subscribe through the *Tips & deals* widget. `/api/v1/newsletter/subscribe` double-confirms via email and you can quit anytime using `/api/v1/newsletter/unsubscribe`.

---

## Skin Facts & Learning Hub

- **Browse topics:** The *Skin Facts* section pulls from `/api/v1/facts/topics/popular` and `/api/v1/facts/topics/section/{section}` to show curated articles.
- **Recommended for you:** `/api/v1/facts/topics/recommended` ranks topics aligned to your quiz sessions and saved concerns.
- **Reading view:** Opening a topic fetches `/api/v1/facts/topics/{slug}` which contains hero images, quick facts, and deep dives. Each view is recorded so recommendations stay fresh.
- **Highlight cards:** Save cards to the dashboard for at-a-glance reminders or routines you are experimenting with.

---

## Privacy, Security & Data Control

- **Session security:** All calls use HTTPS + JWT. Idle sessions auto-expire after 30 minutes of inactivity; you will be prompted to log back in.
- **Data minimization:** The quiz stores only the answers required to compute recommendations. Sensitive metadata (pregnancy status, budget) stays within the `SkinProfile` record and can be deleted at any time.
- **Exports:** From *Profile → Data control*, request an export. You’ll receive a JSON bundle of quiz sessions, routines, and wishlist items within 24 hours.
- **Consent management:** Toggle marketing consent independently of transactional emails so you keep password-reset and security alerts even if you unsubscribe from promos.

---

## Troubleshooting & Support

| Issue | What to try | When to escalate |
|-------|-------------|-----------------|
| Cannot log in | Reset password, check spam folder, clear browser cache | If no email arrives within 10 minutes |
| Quiz stuck loading | Refresh, ensure cookies are enabled, confirm you’re on the latest release banner | If it fails with multiple browsers |
| Barcode not recognized | Retake the photo in bright light and ensure the barcode fills the frame | Send the barcode number + product photo to support so the catalog team can add it |
| Label OCR confidence too low | Upload a clearer photo or paste the text manually | Report persistent failures; include the image so we can extend keyword heuristics |
| Wrong product suggestions | Make sure profile info is updated; rerun the quiz and verify you locked accurate concerns | Contact support if results continue to violate ingredient restrictions |

**Contact us:** support@skinmatch.com or the in-app chat bubble (Mon–Fri, 9 AM–6 PM GMT+7). Provide your username, browser/device, and screenshots so the team can reproduce quickly.

---

Happy matching! Your feedback drives the roadmap—use the in-app feedback link to request new features or improvements.
