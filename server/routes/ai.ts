import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    input: `You are a helpful roadside mechanic assistant. ${question}`
  })
});

const data: any = await response.json();

console.log("FULL AI RESPONSE:", JSON.stringify(data, null, 2)); // 🔥 DEBUG

const reply =
  data.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
  data.output_text ||
  "No response";
// if (data.error) {
//   return res.json({
//     reply: "Try checking fuel, battery, or find nearby mechanics using the app."
//   });
// }
res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: "AI error" });
  }
});


export default router;