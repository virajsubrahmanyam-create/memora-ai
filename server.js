const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { HindsightClient } = require("@vectorize-io/hindsight-client");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const hindsight = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL,
  apiKey: process.env.HINDSIGHT_API_KEY
});

const BANK_ID = "memora-support";

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// MEMORA chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    // 1. Recall previous customer memories
    const memories = await hindsight.recall(
      BANK_ID,
      message,
      { limit: 5 }
    );

    // 2. Ask Hindsight to reason using those memories
    const response = await hindsight.reflect(
      BANK_ID,
      `You are MEMORA, a helpful customer support agent.

Use the customer's previous interactions when relevant.
If a previous solution worked, mention it naturally.
Do not invent customer history that is not present in memory.

Current customer message:
${message}

Respond as a friendly, concise customer support agent.`
    );

    // 3. Store this new interaction for future conversations
    await hindsight.retain(
      BANK_ID,
      `Customer said: ${message}
MEMORA responded: ${response.text}`
    );

    res.json({
      reply: response.text,
      memories: memories.results
    });

  } catch (error) {
    console.error("MEMORA ERROR:", error);

    res.status(500).json({
      error: "MEMORA could not process the request."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MEMORA server running at http://localhost:${PORT}`);
});