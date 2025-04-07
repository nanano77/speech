export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { userInput } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing API key" });
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
            content: `你是一個語意分析助理，負責判斷使用者輸入是屬於哪一類地圖操作，只需回傳 JSON 格式如下：
{
  "category": "layer"     // 表示使用者在操作圖層（例如：開啟地圖圖層、關閉高鐵圖層等）
  | "zoom"                // 表示使用者在控制縮放（例如：放大、縮小、縮放至全縣等）
  | "locate"              // 表示使用者想定位到某地（例如：幫我定位到臺北車站、找東區）
  | "unknown"             // 無法判斷的情況
}
請根據下列說明來判斷：
- 若句中包含如「開啟、關閉、顯示、打開圖層」字樣，或提到地圖上哪些圖層（如河川、高鐵、地標等），屬於 layer
- 若句中提及「放大、縮小、顯示全圖、全部顯示」等與縮放有關的詞彙，屬於 zoom
- 若句中提及「定位、跳到、移動到、找某地、到某地」等動作，屬於 locate
- 若無法明確判斷則為 unknown`
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
