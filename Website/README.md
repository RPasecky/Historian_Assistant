<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally (DB-backed)

**Prerequisites:**  Node.js, Python 3.10+, SQLite (bundled)

### 1) Start the backend API (FastAPI)
From the project root:
```bash
python -m pip install -r /Users/ryanpasecky/Historian_Assistant/requirements.txt
python -m Models.api_server
# or with autoreload:
# uvicorn Models.api_server:app --reload --port 8000
```
The API will be available at `http://localhost:8000`.

Optional: configure the frontend to point to a different API base:
Create `Website/.env.local` with:
```
VITE_API_BASE_URL=http://localhost:8000
```

### 2) Start the frontend (Vite + React)
1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

Open http://localhost:3000

Notes:
- The site now loads events directly from your SQLite DB (`Models/data/historian.db`) via the new API.
- If your DB is empty, the UI will show no events until you insert data.

---

## Gemini (optional)
If you switch to the Gemini service later, add your key to `.env.local`:
```
GEMINI_API_KEY=YOUR_KEY
```
