# SkinMatch — *Your Skin, Your Match, Your Best Care!*  

SkinMatch is a personalized skincare recommendation platform that analyzes product ingredients, provides compatibility guidance, and helps users build safe and effective skincare routines.  

The project is designed for skincare enthusiasts and individuals with specific concerns who want better routines while minimizing irritation and adverse reactions.  

---

## 🌟 Features  

- **Skin Profile Setup** — Users input skin type (oily, dry, combination, sensitive, normal) and concerns (acne, wrinkles, dark spots).  
- **Ingredient Guidance** — Learn which ingredients are beneficial or harmful for your profile.  
- **Personalized Routine Generator** — Daily/weekly routine planner (cleanser, toner, moisturizer, sunscreen, treatments).  
- **Product Recommendations** — Suggested products based on safe/compatible ingredients.  
- **Product Imagery** — Upload photos in the Django admin or link to hosted images so recommendation cards feel real.  
- **Similar Product Finder** *(optional)* — Find alternatives with similar formulas.  
- **Affiliate Integration** *(future)* — Buy directly from retailers (Shopee, Lazada, Amazon).  
- **Feedback & Analytics** — Continuous improvement based on user ratings and outcomes.  
- **Expert Resources** *(optional)* — FAQ and dermatologist/consultation links.  

---

## 🛠 Tech Stack  

- **Frontend**: React + TailwindCSS  
- **Backend**: Django Ninja Extra (FastAPI-like, auto Swagger/ReDoc, built on Django)  
- **Database**: PostgreSQL (with JSONB for ingredients & flexible data)  
- **Deployment**:  
  - Frontend → Vercel  
  - Backend → Render (Dockerized)  
  - Database → PostgreSQL on Render (daily backups)  
- **CI/CD**: GitHub Actions  

---

## 🚀 Roadmap (Milestones)  

**Week 1–2 (M1)**  
- Repo setup, CI/CD, database schema  
- Ingredient & compatibility checker (manual entry)  

**Week 3–4 (M2)**  
- Similar Product Finder  
- Rule-based personalized recommendations  

**Week 5 (M3)**  
- Routine planner (CRUD)  
- Feedback capture + analytics dashboard  

**Week 6 (M4)** *(optional MVP+)*  
- Upload ingredient lists (manual text/OCR stub)  
- Expert consultation content  

---

## ⚙️ Setup & Deployment  

1. **Clone repo**  
   git clone https://github.com/your-username/skinmatch.git
   cd skinmatch

2. **run Docker Compose**
    docker-compose up --build

3. **Verify everything is running**
    Backend API: http://localhost:8000
    Frontend: http://localhost:3000

4. **(Optional) Load the sample product catalog for local testing**
    ```bash
    cd backend
    python manage.py load_sample --reset
    ```
    The `load_sample` command is a compatibility alias for `load_sample_catalog` and seeds the quiz database with curated products, concerns, and ingredient mappings. The quiz service auto-seeds this data on first use when running in development (see `QUIZ_AUTO_SEED_SAMPLE`), but running the command manually lets you reset or refresh the catalog on demand. Any additional products you create in the Django admin will automatically participate in quiz recommendations as long as they remain `is_active` and you assign the relevant concerns/traits.
    You can now upload a product photo directly via the `image` field in the Product admin or provide an `image_url`; recommendations will prefer the uploaded image when both are present. When neither is set, SkinMatch renders an on-the-fly gradient card so the UI never falls back to an empty frame. Add any HTTPS product link to the `product_url` field to surface the “View product” button in quiz results.
