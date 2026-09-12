import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

/*
  Simple daily limit.

  IMPORTANT:
  This is suitable for testing.
  For a real production app, store usage in a database
  because this counter resets when the server restarts.
*/
const usage = new Map();

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function allowed(ip) {
  const today = getToday();
  const key = `${ip}-${today}`;

  const count = usage.get(key) || 0;

  if (count >= 150) {
    return false;
  }

  usage.set(key, count + 1);
  return true;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], model = "gpt-5" } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (!allowed(req.ip)) {
      return res.status(429).json({
        error: "Daily limit reached. Please try again tomorrow."
      });
    }

    const safeHistory = history
      .slice(-20)
      .map(x => ({
        role: x.role === "assistant" ? "assistant" : "user",
        content: String(x.content).slice(0, 10000)
      }));

    const response = await client.responses.create({
      model,
      instructions:
        "You are a helpful AI assistant. Give clear, accurate and easy-to-understand answers.",
      input: [
        ...safeHistory,
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      answer: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI request failed. Check your API key and server."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MyAI running on http://localhost:${PORT}`);
});
