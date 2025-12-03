// api/optimize.js — Groq = <400ms every time
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send();

  const { gpu } = req.body;
  const model = gpu?.trim() || "RTX 4090";

  // TON price
  let ton = 7.2;
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd",{signal:AbortSignal.timeout(2000)});
    const j = await r.json();
    ton = j["the-open-network"]?.usd || ton;
  } catch {}

  // Groq call — super fast + varied
  try {
    const g = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",   // fastest Groq model
        messages: [{ role: "user", content: `GPU: ${model}\nTON price: $${ton.toFixed(2)}\nGive ONE varied 4-hour window in next 48h for max Cocoon $TON yield. Reply ONLY valid JSON: {"earnings":"$48–$67 USD","window":"Tonight 23:30 UTC → +4h","note":"peak hashrate drop"}` }],
        temperature: 0.9,
        max_tokens: 80
      })
    });

    if (g.ok) {
      const txt = (await g.json()).choices[0]?.message?.content?.trim();
      const json = JSON.parse(txt);
      return res.json({
        earnings: json.earnings,
        window: json.window,
        gas: json.note || `TON ≈ $${ton.toFixed(2)}`
      });
    }
  } catch (e) {
    console.log("Groq failed, using fallback");
  }

  // Instant fallback if Groq ever sleeps
  const rate = /h100/i.test(model) ? 5.5 : /a100/i.test(model) ? 3.9 : /4090/i.test(model) ? 2.7 : /3090/i.test(model) ? 1.8 : 1.4;
  const low = Math.round(rate * 4 * ton * 0.9 + Math.random() * 12);
  const high = Math.round(rate * 4 * ton * 1.2 +