export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { userInput } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing API key" });
  }

  // 你前端的圖層清單
  const layerList = [
    { id: "adminLayer", name: "行政區" },
    { id: "landuseLayer", name: "土地使用" },
    { id: "agriLayer", name: "農業區" },
    { id: "countyLayer", name: "縣市界" },
    { id: "districtLayer", name: "區界" },
    { id: "villageLayer", name: "鄰界" },
    { id: "hsrLayer", name: "高鐵" },
    { id: "metroLayer", name: "捷運" },
    { id: "railLayer", name: "台鐵" },
    { id: "riverLayer", name: "河川" },
    { id: "landmarkLayer", name: "地標" }
  ];

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
            content: `你是一個圖層控制助理。請根據使用者語句判斷操作，並回傳 JSON：
{
  "intent": "open|close|clear",
  "targets": ["圖層代碼陣列"]
}
目前支援的圖層如下（中文名稱 對應 圖層代碼）：
${layerList.map(l => `${l.name} => ${l.id}`).join("\n")}
請僅使用上述圖層代碼作為 targets。`
          },
          { role: "user", content: userInput }
        ]
      })
    });

    const gptData = await gptRes.json();
    const result = JSON.parse(gptData.choices[0].message.content);
    res.status(200).json(result);

  } catch (err) {
    console.error("❌ GPT failed:", err);
    res.status(500).json({ error: "GPT failed", detail: err.toString() });
  }
}
