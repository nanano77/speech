import {
  setupLayers,
  handleCommand,
  layerList,
  layers,
  activeLayers,
  openKeywords,
  closeKeywords,
  initLayerListUI
} from './layerControlV2.js';

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

function appendMessage(text, sender = "system") {
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  bubble.textContent = text;
  chatbox.appendChild(bubble);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// 🎯 語意判斷
async function queryIntention(text) {
  try {
    const res = await fetch("/api/intention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: text })
    });
    const json = await res.json();
    return json?.category || "unknown";
  } catch (err) {
    console.warn("❌ 語意判斷錯誤：", err);
    return "unknown";
  }
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

let pendingIntent = ""; // 🔁 全域暫存意圖（初始為空）

recognition.onend = async () => {
  const fullText = (finalText + interimText).trim();
  if (!fullText) return;

  appendMessage(fullText, "user");

  // 🧠 決定使用 AI 還是用 pendingIntent
  const intent = pendingIntent || await queryIntention(fullText);
  console.log("🎯 意圖分類：", intent);

  if (intent === "layer") {
    // 傳入額外參數 pendingIntentRef 用於更新它
    const [msg, detail, stillPending] = await handleCommand(fullText, modeSelector.value, updateActiveLayerUI);

    appendMessage(`${msg}\n${detail}`, "system");

    const utter = new SpeechSynthesisUtterance(msg);
    utter.lang = "zh-TW";
    speechSynthesis.speak(utter);

    // 若該次對話尚未完成（如 ambiguous），保留意圖
    pendingIntent = stillPending ? intent : "";
  } else {
    pendingIntent = ""; // 非圖層意圖，清空意圖記憶
    const msg = `🎯 偵測到意圖為「${intent}」，目前尚未支援此功能`;
    appendMessage(msg, "system");

    const utter = new SpeechSynthesisUtterance("目前尚未支援此功能");
    utter.lang = "zh-TW";
    speechSynthesis.speak(utter);
  }
};

// ✅ 頁面初始化
document.addEventListener("DOMContentLoaded", () => {
  setupLayers(updateActiveLayerUI);
  initLayerListUI("layerListUI");
  document.getElementById("openWords").textContent = openKeywords.join("、");
  document.getElementById("closeWords").textContent = closeKeywords.join("、");
});
