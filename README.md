# Hoop Lab Gym

Sito web per una insegnante di fitness di cerchio aereo (danza acrobatica).

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS v3
- **Deploy**: Vercel

## Setup Locale

```bash
cd frontend
npm install
npm run dev
```

## Deploy su Vercel

Dalla root del progetto:

```bash
vercel
# Quando chiede "In which directory is your code located?" → ./frontend
```

Per produzione:
```bash
vercel --prod
```

## Struttura

```
hoop-lab-gym/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── App.jsx    # Main component
│   │   ├── index.css  # Tailwind imports
│   │   └── main.jsx   # Entry point
│   └── ...
├── .gitignore
└── README.md
```
