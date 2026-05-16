# 🌌 Evolutive Cloud

> A living galaxy of apps, games, and websites — built by the community, powered by AI.

![Evolutive Cloud Banner](https://evolutive-cloud.vercel.app)

---

## What is Evolutive Cloud?

Evolutive Cloud is a **community-driven creative platform** where anyone can generate, share, and improve apps, games, and websites — powered by AI.

Think of it as **GitHub meets a galaxy meets an AI playground.**

### The Galaxy View
Projects float in a 3D solar system. The more a project is used, loved, and built upon, the closer it orbits to the sun. The sun is the collective memory of the community — a living map of the best ideas humans and AI have made together.

### The Discovery Feed
Scroll through a curated feed of community projects and interact with them directly — no install, no setup. Just scroll and play.

### The AI Engine
Users choose their own AI backend — free local models (via Web-LLM running right in your browser), or powerful cloud APIs like Google Gemini or OpenAI. Your creativity, your choice of fuel.

---

## ✨ Features

- 🌍 **Generate** — Create apps, games, and websites from a prompt using AI
- 🔭 **Galaxy View** — 3D visualization of the community's projects orbiting by popularity
- 📜 **Discovery Scroll** — Browse and interact with community creations in a live feed
- 🤝 **Community Improvement** — Fork, remix, and improve any project collaboratively
- 🧠 **Multi-AI Support** — Switch between local AI (free, private) and cloud AI (powerful)
- 🔥 **Firebase Backend** — Real-time sync, auth, and storage
- 🚀 **Deployed on Vercel** — Always live, always fast

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| 3D Graphics | Three.js + React Three Fiber |
| AI (cloud) | Google Gemini API, OpenAI API |
| AI (local) | Web-LLM (runs in browser, no API key needed) |
| Backend | Express + Firebase Firestore |
| Styling | Tailwind CSS + Framer Motion |
| Deployment | Vercel |

---

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

```bash
# 1. Clone the repo
git clone https://github.com/SeederOfLife/evolutive-cloud.git
cd evolutive-cloud

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local (optional — you can use local AI without it)

# 4. Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

---

## 🤖 AI Options

Evolutive Cloud lets users choose their AI engine:

| Mode | Provider | Cost | Privacy |
|---|---|---|---|
| Local AI | Web-LLM (in-browser) | Free | Full — never leaves your device |
| Cloud AI | Google Gemini | API key required | Sent to Google |
| Cloud AI | OpenAI | API key required | Sent to OpenAI |

---

## 🌱 Roadmap

- [ ] Galaxy view: project nodes rendered as orbiting 3D objects
- [ ] Discovery scroll feed
- [ ] User accounts & project ownership (Firebase Auth)
- [ ] Fork & remix system
- [ ] Popularity-based orbital gravity
- [ ] In-browser code editor for remixing
- [ ] Mobile support

---

## 🤝 Contributing

This project is built in the open and welcomes contributors of all levels.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-idea`
3. Commit your changes
4. Open a Pull Request

See [STANDALONE_SETUP.md](./STANDALONE_SETUP.md) for detailed setup notes.

---

## 📄 License

GPL v3 — free to use, remix, and improve. Keep it open.

---

*Built with curiosity. Grown by community. Powered by AI.*
