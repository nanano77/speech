const layerMap = Object.fromEntries(layerList.map(l => [l.id, l.name]));

  // 「全部關閉」不經 GPT
  const clearKeywords = ["關閉全部", "全部關閉", "清除所有圖層"];
  if (clearKeywords.some(k => userInput.includes(k))) {
    return res.status(200).json({ intent: "clear", targets: [] });
  }

  try {
    const candidateBlock = lastCandidates.length > 0
      ? `\n使用者先前被提示的候選圖層（請根據編號或順序判斷）：
${lastCandidates.map((id, i) => `${i + 1}. ${layerMap[id]} => ${id}`).join("\n")}`
      : "";

    const systemPrompt = `你是一個圖層控制助理，請根據使用者語句判斷操作並回傳 JSON 格式如下：

✅ 一般情況：
{
  "intent": "open" | "close" | "clear",
  "targets": ["圖層代碼"]
}

⚠️ 若語句模糊（如：打開無人機圖層），請回傳：
{
  "intent": "ambiguous",
  "candidates": ["圖層代碼"]
}

目前支援的圖層如下（中文名稱 => 圖層代碼）：
${layerList.map(l => `${l.name} => ${l.id}`).join("\n")}${candidateBlock}

請僅使用上述圖層代碼作為 targets 或 candidates。`;

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
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
