// BUD Simple - 音声認識・AIフィードバックアプリ

// 設定
const CONFIG = {
  // バックエンドURL（本番URL固定）
  BACKEND_URL: "https://bud-backend-945853872709.asia-northeast1.run.app",

  MAX_RECORDING_TIME: 30000, // 30秒
  STORAGE_KEY: "budSimpleHistory",
};

// グローバル変数
let isRecording = false;
let recognition = null;
let mediaRecorder = null;
let audioChunks = [];

// DOM要素
const recordButton = document.getElementById("recordButton");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");
const feedbackDiv = document.getElementById("feedback");
const historyDiv = document.getElementById("history");

// 初期化
document.addEventListener("DOMContentLoaded", function () {
  initializeSpeechRecognition();
  loadHistory();
  checkBackendConnection();
});

// バックエンド接続確認
async function checkBackendConnection() {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/health`);
    const data = await response.json();

    if (data.status === "healthy") {
      console.log("✅ バックエンド接続OK:", data);

      if (data.gemini_api === "available") {
        console.log("✅ Gemini API利用可能");
      } else {
        console.warn("⚠️ Gemini API未設定 - フォールバックモードで動作");
      }
    }
  } catch (error) {
    console.warn(
      "⚠️ バックエンド接続失敗 - ローカルフィードバックで動作:",
      error
    );
    showStatus(
      "バックエンドに接続できません。ローカルモードで動作します。",
      "warning"
    );
  }
}

// 音声認識初期化
function initializeSpeechRecognition() {
  if (
    !("webkitSpeechRecognition" in window) &&
    !("SpeechRecognition" in window)
  ) {
    showStatus("このブラウザは音声認識に対応していません", "error");
    recordButton.disabled = true;
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onstart = function () {
    console.log("🎤 音声認識開始");
    isRecording = true;
    updateUI();
    showStatus("英語で話してください...", "recording");

    // 最大録音時間のタイマー
    setTimeout(() => {
      if (isRecording) {
        recognition.stop();
      }
    }, CONFIG.MAX_RECORDING_TIME);
  };

  recognition.onresult = function (event) {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // リアルタイム表示
    const displayText = finalTranscript || interimTranscript;
    if (displayText) {
      resultDiv.innerHTML = `<strong>認識中:</strong> ${displayText}`;
    }

    // 最終結果の処理
    if (finalTranscript) {
      console.log("📝 最終結果:", finalTranscript);
      processRecognitionResult(finalTranscript.trim());
    }
  };

  recognition.onerror = function (event) {
    console.error("❌ 音声認識エラー:", event.error);
    isRecording = false;
    updateUI();

    let errorMessage = "音声認識エラーが発生しました";
    switch (event.error) {
      case "network":
        errorMessage = "ネットワークエラーです。接続を確認してください。";
        break;
      case "not-allowed":
        errorMessage =
          "マイクの使用が許可されていません。設定を確認してください。";
        break;
      case "no-speech":
        errorMessage = "音声が検出されませんでした。もう一度お試しください。";
        break;
    }

    showStatus(errorMessage, "error");
  };

  recognition.onend = function () {
    console.log("🔇 音声認識終了");
    isRecording = false;
    updateUI();
  };
}

// 録音ボタンクリック
recordButton.addEventListener("click", function () {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// 録音開始
function startRecording() {
  if (!recognition) {
    showStatus("音声認識が利用できません", "error");
    return;
  }

  try {
    recognition.start();
  } catch (error) {
    console.error("録音開始エラー:", error);
    showStatus("録音を開始できませんでした", "error");
  }
}

// 録音停止
function stopRecording() {
  if (recognition && isRecording) {
    recognition.stop();
  }
}

// 認識結果処理
async function processRecognitionResult(text) {
  if (!text) return;

  // 結果表示
  resultDiv.innerHTML = `<strong>あなたの英語:</strong> "${text}"`;

  // AIフィードバック取得
  showStatus("AIがフィードバックを考えています...", "processing");

  try {
    const feedback = await generateAIFeedback(text);

    // フィードバック表示
    feedbackDiv.innerHTML = `<strong>AIからのメッセージ:</strong> ${feedback}`;

    // 履歴に保存
    addToHistory(text, feedback);

    showStatus("完了！また話してみてください 😊", "success");
  } catch (error) {
    console.error("フィードバック生成エラー:", error);

    // フォールバック
    const fallbackFeedback = `「${text}」って英語で言えてえらいね！✨`;
    feedbackDiv.innerHTML = `<strong>メッセージ:</strong> ${fallbackFeedback}`;
    addToHistory(text, fallbackFeedback);

    showStatus("完了！また話してみてください 😊", "success");
  }
}

// AIフィードバック生成（バックエンド連携）
async function generateAIFeedback(text) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("🤖 AIフィードバック:", data);

    return data.feedback;
  } catch (error) {
    console.error("Gemini API呼び出しエラー:", error);

    // ローカルフォールバック
    return generateLocalFeedback(text);
  }
}

// ローカルフィードバック（バックエンド接続失敗時）
function generateLocalFeedback(text) {
  const encouragements = [
    "英語で話せてすばらしい！✨",
    "がんばって話せたね！😊",
    "英語チャレンジえらい！🌟",
    "すてきな英語だったよ！👏",
    "また話してみてね！💫",
  ];

  const randomEncouragement =
    encouragements[Math.floor(Math.random() * encouragements.length)];
  return `「${text}」って言えたね！${randomEncouragement}`;
}

// UI更新
function updateUI() {
  if (isRecording) {
    recordButton.innerHTML = `
            <div class="recording-animation"></div>
            <span>録音中... (タップで停止)</span>
        `;
    recordButton.classList.add("recording");
  } else {
    recordButton.innerHTML = `
            <span class="mic-icon">🎤</span>
            <span>英語で話してみよう</span>
        `;
    recordButton.classList.remove("recording");
  }
}

// ステータス表示
function showStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  // 自動クリア（エラー以外）
  if (type !== "error") {
    setTimeout(() => {
      if (statusDiv.textContent === message) {
        statusDiv.textContent = "";
        statusDiv.className = "status";
      }
    }, 3000);
  }
}

// 履歴管理
function addToHistory(text, feedback) {
  const historyItem = {
    timestamp: new Date().toLocaleString("ja-JP"),
    english: text,
    feedback: feedback,
  };

  let history = getHistory();
  history.unshift(historyItem); // 新しいものを先頭に

  // 最大20件まで保存
  if (history.length > 20) {
    history = history.slice(0, 20);
  }

  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
  displayHistory();
}

function getHistory() {
  try {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("履歴読み込みエラー:", error);
    return [];
  }
}

function displayHistory() {
  const history = getHistory();

  if (history.length === 0) {
    historyDiv.innerHTML =
      '<p class="no-history">まだ履歴がありません。英語で話してみましょう！</p>';
    return;
  }

  historyDiv.innerHTML = "<h3>📚 今までのチャレンジ</h3>";

  history.forEach((item, index) => {
    const historyItemDiv = document.createElement("div");
    historyItemDiv.className = "history-item";
    historyItemDiv.innerHTML = `
            <div class="history-header">
                <span class="history-time">${item.timestamp}</span>
                <button class="delete-btn" onclick="deleteHistoryItem(${index})" title="削除">×</button>
            </div>
            <div class="history-content">
                <div class="history-english"><strong>🎤 英語:</strong> "${item.english}"</div>
                <div class="history-feedback"><strong>🤖 AI:</strong> ${item.feedback}</div>
            </div>
        `;
    historyDiv.appendChild(historyItemDiv);
  });
}

function loadHistory() {
  displayHistory();
}

function deleteHistoryItem(index) {
  if (confirm("この履歴を削除しますか？")) {
    let history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
    displayHistory();
  }
}

function clearAllHistory() {
  if (confirm("すべての履歴を削除しますか？")) {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    displayHistory();
  }
}

// 履歴クリアボタン（必要に応じてHTMLに追加）
function addClearButton() {
  if (getHistory().length > 0) {
    const clearButton = document.createElement("button");
    clearButton.textContent = "履歴をすべて削除";
    clearButton.className = "clear-history-btn";
    clearButton.onclick = clearAllHistory;
    historyDiv.appendChild(clearButton);
  }
}

// お助けフレーズ機能
const helpfulPhrases = [
  "Hello, how are you?",
  "Thank you very much",
  "Nice to meet you",
  "I like apples",
  "What's your name?",
  "I'm fine, thank you",
  "See you later",
  "Good morning",
];

function showHelpfulPhrases() {
  const phrasesDiv =
    document.getElementById("helpful-phrases") || createPhrasesDiv();

  phrasesDiv.innerHTML = "<h3>💡 お助けフレーズ</h3>";
  helpfulPhrases.forEach((phrase) => {
    const phraseButton = document.createElement("button");
    phraseButton.textContent = phrase;
    phraseButton.className = "phrase-btn";
    phraseButton.onclick = () => speakPhrase(phrase);
    phrasesDiv.appendChild(phraseButton);
  });
}

function createPhrasesDiv() {
  const phrasesDiv = document.createElement("div");
  phrasesDiv.id = "helpful-phrases";
  phrasesDiv.className = "helpful-phrases";
  document.querySelector(".container").appendChild(phrasesDiv);
  return phrasesDiv;
}

function speakPhrase(phrase) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }
}

// 初期化時にお助けフレーズも表示
document.addEventListener("DOMContentLoaded", function () {
  showHelpfulPhrases();
});

console.log("🎯 BUD Simple アプリ初期化完了");
console.log("📡 バックエンドURL:", CONFIG.BACKEND_URL);
