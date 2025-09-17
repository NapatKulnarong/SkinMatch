# SkinMatch — *Your Skin, Your Match, Your Best Care!*  

SkinMatch is a personalized skincare recommendation platform that analyzes product ingredients, provides compatibility guidance, and helps users build safe and effective skincare routines.  

The project is designed for skincare enthusiasts and individuals with specific concerns who want better routines while minimizing irritation and adverse reactions.  

---

## 🌟 Features  

- **Skin Profile Setup** — Users input skin type (oily, dry, combination, sensitive, normal) and concerns (acne, wrinkles, dark spots).  
- **Ingredient Guidance** — Learn which ingredients are beneficial or harmful for your profile.  
- **Personalized Routine Generator** — Daily/weekly routine planner (cleanser, toner, moisturizer, sunscreen, treatments).  
- **Product Recommendations** — Suggested products based on safe/compatible ingredients.  
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