import {
  setupLayers,
  handleCommand,
  layerList,
  layers,
  activeLayers,
  openKeywords,
  closeKeywords,
  initLayerListUI
} from './layerControl.js';

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

// 🎯 語意分類 API：POST /api/intention
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
    console.warn("❌ 無法判斷語意：", err);
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

recognition.onend = async () => {
  const fullText = (finalText + interimText).trim();
  if (!fullText) return;

  appendMessage(fullText, "user");

  const intent = await queryIntention(fullText);
  console.log("意圖判斷結果：", intent);

  if (intent === "layer") {
    const [msg, detail] = await handleCommand(fullText, modeSelector.value, updateActiveLayerUI);
    appendMessage(`${msg}\n${detail}`, "system");

    const utter = new SpeechSynthesisUtterance(msg);
    utter.lang = "zh-TW";
    speechSynthesis.speak(utter);
  } else {
    appendMessage(`偵測到意圖為：${intent}，尚未支援該類型操作`, "system");
    const utter = new SpeechSynthesisUtterance(`目前尚未支援 ${intent} 操作`);
    utter.lang = "zh-TW";
    speechSynthesis.speak(utter);
  }
};

// ✅ DOM 初始化
document.addEventListener("DOMContentLoaded", () => {
  setupLayers(updateActiveLayerUI);
  initLayerListUI("layerListUI");
  document.getElementById("openWords").textContent = openKeywords.join("、");
  document.getElementById("closeWords").textContent = closeKeywords.join("、");
});
