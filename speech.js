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

// ✅ 初始化語音辨識
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  alert("❌ 你的瀏覽器不支援語音辨識，請改用 Chrome");
}

const recognition = new SpeechRecognition();
recognition.lang = "zh-TW";
recognition.continuous = true;
recognition.interimResults = true;

let finalText = "", interimText = "";
let pendingIntent = "";

// ✅ 使用 data-* 的方式取得 DOM 元素
const chatbox = document.querySelector("[data-chat]");
const modeSelector = document.querySelector("[data-mode]");
const activeLayerList = document.querySelector("[data-active-layer]");

// ✅ 動態更新 UI 上顯示的啟用圖層
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

// ✅ 聊天視窗訊息渲染
function appendMessage(text, sender = "system") {
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  bubble.textContent = text;
  chatbox.appendChild(bubble);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// ✅ 呼叫後端語意分析 API
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

// ✅ 語音啟動 / 停止函式
const startRecognition = () => {
  finalText = ""; interimText = "";
  recognition.start();
};

const stopRecognition = () => recognition.stop();

// ✅ 綁定語音按鈕事件
function bindRecognitionButton(button) {
  button.addEventListener("mousedown", startRecognition);
  button.addEventListener("mouseup", stopRecognition);
  button.addEventListener("mouseleave", stopRecognition);
  button.addEventListener("touchstart", e => {
    e.preventDefault();
    startRecognition();
  });
  button.addEventListener("touchend", stopRecognition);
}

// ✅ 語音結果處理
recognition.onresult = (event) => {
  interimText = "";
  for (let i = event.resultIndex; i < event.results.length; ++i) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) finalText = transcript;
    else interimText += transcript;
  }
};

// ✅ 語音結束處理
recognition.onend = async () => {
  const fullText = (finalText + interimText).trim();
  if (!fullText) return;

  appendMessage(fullText, "user");

  const intent = pendingIntent || await queryIntention(fullText);
  console.log("🎯 意圖分類：", intent);

  if (intent === "layer") {
    const [msg, detail, stillPending] = await handleCommand(fullText, modeSelector.value, updateActiveLayerUI);

    appendMessage(`${msg}\n${detail}`, "system");

    const utter = new SpeechSynthesisUtterance(msg);
    utter.lang = "zh-TW";
    speechSynthesis.speak(utter);

    pendingIntent = stillPending ? intent : "";
  } else {
    pendingIntent = "";
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
  initLayerListUI("[data-layer-list]");

  document.querySelector("[data-open-words]").textContent = openKeywords.join("、");
  document.querySelector("[data-close-words]").textContent = closeKeywords.join("、");

  const toggleBtn = document.querySelector(".my-voice-button");
  if (toggleBtn) {
    bindRecognitionButton(toggleBtn);
  }
});
