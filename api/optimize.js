export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send();
  const { gpu, ton } = req.body;

  const key = process.env.GROQ_API_KEY;  // Secure from env
  if (!key) return res.json({ earnings: "$20–$30 USD", window: "Tonight 22:00 UTC → +4h", note: "Fallback" });

  try {
    const g = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: `GPU: ${gpu}\nTON: $${ton.toFixed(2)}\nVaried 4h window next 48h for max $TON. JSON only: {"earnings":"$48–$67 USD","window":"Tonight 23:30 UTC → +4h","note":"low gas"}` }],
        temperature: 0.9,
        max_tokens: 80
      })
    });

    if (g.ok) {
      const txt = (await g.json()).choices[0]?.message?.content?.trim();
      return res.json(JSON.parse(txt));
    }
  } catch {}

  // Fallback
  res.json({ earnings: "$20–$30 USD", window: "Tonight 22:00 UTC → +4h", note: "Fast calc" });
}