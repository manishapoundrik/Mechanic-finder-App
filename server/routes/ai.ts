import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    // 🔥 HUGGING FACE FREE API (Replace OpenAI completely)
    const response = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`, // ← NEW ENV VAR
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: `Roadside Mechanic Assistant: ${question}\nAssistant:`, // ← Mechanic context
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            return_full_text: false,
            truncation: true
          }
        })
      }
    );

    const data: any = await response.json();

    console.log("FULL HF RESPONSE:", JSON.stringify(data, null, 2)); // 🔥 DEBUG

    // Extract response from HF format
    const reply = 
      data[0]?.generated_text || 
      data.generated_text || 
      "Try checking fuel, battery connections, or use the app to find nearby mechanics!";

    res.json({ reply });
  } catch (error) {
    console.error("HF AI Error:", error);
    // Fallback response (no AI needed)
    res.json({ 
      reply: "Quick checks: 1) Fuel? 2) Battery? 3) Use app to find nearby mechanics!" 
    });
  }
});

export default router;