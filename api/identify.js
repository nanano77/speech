// Modal 控制
function openModal(id) {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById(id).style.display = 'block';
}
function closeModal() {
  document.getElementById('overlay').style.display = 'none';
  document.querySelectorAll('.modal').forEach(el => el.style.display = 'none');
}

// 語音相關
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  alert("❌ 你的瀏覽器不支援語音辨識，請改用 Chrome");
}

const recognition = new SpeechRecognition();
recognition.lang = "zh-TW";
recognition.continuous = true;
recognition.interimResults = true;

let finalText = "", interimText = "";
const toggle = document.getElementById("toggle");
const chatbox = document.getElementById("chat");
const modeSelector = document.getElementById("mode");
const activeLayerList = document.getElementById("activeLayerList");

const layerList = [
  { id: "cadastreLayer", name: "地籍圖" },
  { id: "taitungSoilLayer", name: "臺東農地重劃區" },
  { id: "taitungCitySoilLayer", name: "臺東市地重劃區" },
  { id: "taitungFunctionPlan", name: "臺東縣國土功能分區圖" },
  { id: "urbanZone2024", name: "都市計畫使用分區圖" },
  { id: "publicPrivateLandLayer", name: "公私有土地分布圖" },
  { id: "sectionLayer", name: "段籍圖" },
  { id: "leisureAgriZone", name: "休閒農業區" },
  { id: "traceHistoryLayer", name: "產銷履歷分布" },
  { id: "organicLayer", name: "有機農地分布" },
  { id: "japanMapMeiji", name: "日治二萬分之一台灣堡圖" },
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
  { id: "farmRoad", name: "農路圖" },
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

const layers = {};
const activeLayers = new Set();

layerList.forEach(layer => {
  layers[layer.id] = {
    name: layer.name,
    show: () => { activeLayers.add(layer.id); updateActiveLayerUI(); },
    hide: () => { activeLayers.delete(layer.id); updateActiveLayerUI(); }
  };
});

function updateActiveLayerUI() {
  activeLayerList.innerHTML = "";
  for (const id of activeLayers) {
    const li = document.createElement("li");
    li.textContent = layers[id].name;
    activeLayerList.appendChild(li);
  }
  if (activeLayers.size === 0) {
    activeLayerList.innerHTML = "<li>（無）</li>";
  }
}

const openKeywords = ["開啟", "打開", "顯示", "我要看", "展開", "叫出"];
const closeKeywords = ["關閉", "關掉", "隱藏", "收起", "不要看"];
const clearAllKeywords = ["全部關閉", "關閉全部"];

async function handleCommand(text) {
  const mode = modeSelector.value;

  if (mode === "local") {
    if (clearAllKeywords.some(k => text.includes(k))) {
      activeLayers.forEach(id => layers[id].hide());
      return ["已關閉全部圖層", "（本地規則判斷）"];
    }

    const isOpen = openKeywords.some(k => text.includes(k));
    const isClose = closeKeywords.some(k => text.includes(k));

    for (const layer of layerList) {
      if (text.includes(layer.name)) {
        if (isOpen) {
          layers[layer.id].show();
          return [`已開啟 ${layer.name}`, "（本地規則判斷）"];
        } else if (isClose) {
          layers[layer.id].hide();
          return [`已關閉 ${layer.name}`, "（本地規則判斷）"];
        }
      }
    }
    return ["無法判斷指令", "（本地規則判斷）"];
  } else {
    const gptResult = await queryGPT(text);
    if (gptResult?.intent === "clear") {
      activeLayers.forEach(id => layers[id].hide());
      return ["已關閉全部圖層", "（GPT 判斷）"];
    }
    if (gptResult?.intent && Array.isArray(gptResult.targets)) {
      const actionText = gptResult.intent === "open" ? "已開啟" : "已關閉";
      gptResult.targets.forEach(id => {
        if (layers[id]) {
          if (gptResult.intent === "open") layers[id].show();
          if (gptResult.intent === "close") layers[id].hide();
        }
      });
      const names = gptResult.targets.map(id => layers[id]?.name).join("、");
      return [`${actionText} ${names}`, "（GPT 判斷）"];
    }
    return ["無法判斷指令", "（GPT 判斷）"];
  }
}

async function queryGPT(userInput) {
  try {
    const res = await fetch("/api/tt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput })
    });
    return await res.json();
  } catch (e) {
    console.warn("GPT 錯誤：", e);
    return null;
  }
}

function appendMessage(text, sender = "system") {
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  bubble.textContent = text;
  chatbox.appendChild(bubble);
  chatbox.scrollTop = chatbox.scrollHeight;
}

const startRecognition = () => {
  finalText = ""; interimText = "";
  recognition.start();
};

const stopRecognition = () => recognition.stop();

toggle.addEventListener("mousedown", startRecognition);
toggle.addEventListener("mouseup", stopRecognition);
toggle.addEventListener("mouseleave", stopRecognition);
toggle.addEventListener("touchstart", e => { e.preventDefault(); startRecognition(); });
toggle.addEventListener("touchend", stopRecognition);

recognition.onresult = (event) => {
  interimText = "";
  for (let i = event.resultIndex; i < event.results.length; ++i) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) finalText = transcript;
    else interimText += transcript;
  }
};

recognition.onend = async () => {
  const fullText = (finalText + interimText).trim();
  if (fullText) {
    appendMessage(fullText, "user");
    const [msg, detail] = await handleCommand(fullText);
    appendMessage(`${msg}\n${detail}`, "system");

    const utter = new SpeechSynthesisUtterance(msg);
    utter.lang = "zh-TW";
    speechSynthesis.speak(utter);
  }
};

window.onload = () => {
  const listUI = document.getElementById("layerListUI");
  layerList.forEach(layer => {
    const li = document.createElement("li");
    li.textContent = layer.name;
    listUI.appendChild(li);
  });
  document.getElementById("openWords").textContent = openKeywords.join("、");
  document.getElementById("closeWords").textContent = closeKeywords.join("、");
};
