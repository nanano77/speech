export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { userInput } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing API key' });
  }

  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `你是一個圖層控制助理，請解析使用者語句並回傳 JSON：
{
  "intent": "open|close|clear",
  "targets": ["adminLayer", "metroLayer"]
}`
          },
          { role: "user", content: userInput }
        ]
      })
    });

    const gptData = await gptRes.json();
    const result = JSON.parse(gptData.choices[0].message.content);
    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({ error: "GPT failed", detail: err.toString() });
  }
}
