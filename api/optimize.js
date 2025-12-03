// api/optimize.js — Classic Vercel API, always works
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { gpu } = req.body;
  gpu = gpu?.trim() || 'RTX 4090';

  // Fetch TON price (fast fallback)
  let tonPrice = 7.2;
  try {
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd', {
      signal: AbortSignal.timeout(2000)
    });
    const priceData = await priceRes.json();
    tonPrice = priceData['the-open-network']?.usd || tonPrice;
  } catch (e) {
    console.log('Price fetch failed:', e);
  }

  // Groq AI for varied responses (if key set)
  const groqKey = process.env.GROQ_API_KEY;
  let result = null;
  if (groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'user',
            content: `GPU: ${gpu}. TON: $${tonPrice.toFixed(2)}. Predict best 4h window next 48h for Cocoon $TON max yield. Varied/realistic. JSON only: {"earnings": "$X–$Y USD", "window": "Time → +4h", "note": "reason"}`
          }],
          temperature: 0.7,
          max_tokens: 100
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData.choices[0]?.message?.content?.trim();
        if (content) {
          try {
            result = JSON.parse(content);
          } catch {}
        }
      }
    } catch (e) {
      console.log('Groq error:', e);
    }
  }

  // Use AI result or fallback
  if (!result) {
    // Deterministic fallback with variation
    const baseRate = /h100/i.test(gpu) ? 5.5 : /a100/i.test(gpu) ? 3.9 : /4090/i.test(gpu) ? 2.7 : /3090/i.test(gpu) ? 1.8 : 1.4;
    const low = Math.round(baseRate * 4 * tonPrice * 0.85 + Math.random() * 5);
    const high = Math.round(baseRate * 4 * tonPrice * 1.15 + Math.random() * 10);
    const windows = ['Tonight 22:00 UTC → +4h', 'Tonight 01:00 UTC → +4h', 'Tomorrow 00:00 UTC → +4h', 'Tomorrow 19:30 UTC → +4h'];
    const randomWindow = windows[Math.floor(Math.random() * windows.length)];
    result = {
      earnings: `$${low}–$${high} USD`,
      window: randomWindow,
      note: 'Fallback calc'
    };
  }

  res.status(200).json({
    earnings: result.earnings,
    window: result.window,
    gas: `${result.note} • TON ≈ $${tonPrice.toFixed(2)}`
  });
}