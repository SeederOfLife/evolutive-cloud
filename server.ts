import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add a simple health check for the platform
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Neural Bridge Proxy - Securely handle AI requests
  app.use(express.json());
  app.post("/api/neural-link", async (req, res) => {
    try {
      const { prompt, model = "gemini-3.1-pro-preview" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'undefined') {
        return res.status(401).json({ 
          error: "SYSTEM_KEY_MISSING", 
          message: "The server-side GEMINI_API_KEY is not configured. Please provide a key in the AI Hub (Google slot) to enable Neural Link Cloud features." 
        });
      }

      // Use the official endpoint format
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error?.message || data.message || "Unknown Neural Node Error";
        console.error(`Neural Link Node Failure [${response.status}]:`, errorMessage);
        return res.status(response.status).json({ 
          error: "NEURAL_NODE_ERROR", 
          message: errorMessage,
          details: data.error || data
        });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return res.status(500).json({ error: "Empty signal received from Neural Node." });
      }

      res.json({ text });
    } catch (err: any) {
      console.error("Critical Proxy Failure:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Handle Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true, host: "0.0.0.0" },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached successfully.");
    } catch (viteErr) {
      console.error("Failed to initialize Vite server:", viteErr);
      // Fallback to static if vite fails
      const distPath = path.join(process.cwd(), "build");
      app.use(express.static(distPath));
    }
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "build");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neural Server pulse detected at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical System Failure during startup:", err);
  process.exit(1);
});
