export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { userInput } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing API key" });
  }

  // 圖層清單（與前端保持一致）
  const layerList = [
    { id: "cadastreLayer", name: "地籍圖(顯示於1:30000，地號顯示於1:5000)" },
    { id: "taitungSoilLayer", name: "臺東農地重劃區" },
    { id: "taitungCitySoilLayer", name: "臺東市地重劃區" },
    { id: "taitungFunctionPlan", name: "臺東縣國土功能分區圖(三階公展版)" },
    { id: "urbanZone2024", name: "都市計畫使用分區圖 (來源:建設處，114年2月17日)" },
    { id: "publicPrivateLandLayer", name: "公私有土地分布圖" },
    { id: "sectionLayer", name: "段籍圖" },
    { id: "leisureAgriZone", name: "休閒農業區(來源:農業處)" },
    { id: "traceHistoryLayer", name: "產銷履歷分布(來源:農業處)" },
    { id: "organicLayer", name: "有機農地分布(來源:農業處)" },
    { id: "japanMapMeiji", name: "日治二萬分之一台灣堡圖(明治版)" },
    { id: "landUseSurvey", name: "國土利用現況調查成果圖" },
    { id: "nonUrbanZone", name: "非都市土地使用分區圖" },
    { id: "slopeSensitive", name: "順向坡敏感區" },
    { id: "rockfallSensitive", name: "落石敏感區" },
    { id: "debrisFlowStream", name: "土石流潛勢溪流" },
    { id: "countyBoundary", name: "縣市界" },
    { id: "townBoundary", name: "鄉鎮市區界" },
    { id: "villageBoundary", name: "村里界" },
    { id: "droneLijia", name: "利嘉禁航區無人機影像" },
    { id: "droneTaiping", name: "太平榮家無人機影像" },
    { id: "droneFengrong", name: "豐榮豐樂區段徵收區無人機影像" },
    { id: "waterQualityProtection", name: "自來水水質水量保護區圖" },
    { id: "farmRoad", name: "農路圖 (資料來源:TGOS)" },
    { id: "agriIrrigation", name: "農田水利灌排渠道系統圖" },
    { id: "hillArea", name: "山坡地範圍圖" },
    { id: "hotelLayer", name: "旅館" },
    { id: "bnbLayer", name: "民宿" },
    { id: "map5000", name: "五千分一圖號" },
    { id: "nonUrbanTypeLayer", name: "非都市土地使用地類別圖" },
    { id: "contour25k", name: "1/25000經建版地形圖" },
    { id: "contour50k", name: "1/50000經建版地形圖" },
    { id: "contour100k", name: "1/100000經建版地形圖" },
    { id: "indigenousReserve", name: "原住民保留地" },
    { id: "indigenousTradition", name: "原住民族傳統領域" }
  ];

  // ✅ 如果使用者語句包含「關閉全部」關鍵字，直接回傳 clear，不送 GPT
  const clearKeywords = ["關閉全部", "全部關閉", "清除所有圖層"];
  if (clearKeywords.some(k => userInput.includes(k))) {
    return res.status(200).json({
      intent: "clear",
      targets: []
    });
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
            content: `你是一個圖層控制助理。請根據使用者語句判斷操作，並回傳 JSON：
{
  "intent": "open|close|clear",
  "targets": ["圖層代碼陣列"]
}
目前支援的圖層如下（中文名稱 對應 圖層代碼）：
${layerList.map(l => `${l.name} => ${l.id}`).join("\n")}
⚠️ 若使用者語句為「關閉全部」、「全部關閉」、「清除所有圖層」，請回傳 intent 為 "clear"，且 targets 為空陣列。請勿列出所有圖層。
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
