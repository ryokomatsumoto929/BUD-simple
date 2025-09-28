// === BUD Simple: Gemini完全修正版 ===

// 音声認識の設定
let recognition;
let isRecording = false;

// DOM要素の取得
const recordBtn = document.getElementById("recordBtn");
const status = document.getElementById("status");
const transcript = document.getElementById("transcript");
const feedback = document.getElementById("feedback");
const support = document.getElementById("support");
const history = document.getElementById("history");
const clearBtn = document.getElementById("clearBtn");

// Gemini API設定（最適化済み）
const GEMINI_API_KEY = "AIzaSyDs0iZaGYNHi4_Q5K7cbpynaDcdL6PtlAQ";
const GEMINI_MODEL = "gemini-1.5-flash-latest"; // 最新の高速モデル

// === AI機能（完全修正版） ===
async function generateAIFeedback(text) {
  console.log("🤖 Gemini API 最適化版テスト開始:", text);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: createOptimizedPrompt(text),
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "object",
              properties: {
                feedback: {
                  type: "string",
                  description: "子ども向けの温かい英語フィードバック",
                },
                encouragement: {
                  type: "string",
                  description: "日本語での励ましメッセージ",
                },
                level_assessment: {
                  type: "string",
                  enum: ["beginner", "intermediate", "advanced"],
                  description: "英語レベル評価",
                },
                next_suggestion: {
                  type: "string",
                  description: "次に挑戦してほしいこと",
                },
              },
              required: ["feedback", "encouragement", "level_assessment"],
            },
            temperature: 0.7,
            maxOutputTokens: 300,
            topP: 0.8,
            topK: 40,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_LOW_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      }
    );

    console.log("📊 API Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Details:", errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("📥 Raw API Response:", data);

    // レスポンス解析
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Invalid response structure");
    }

    // JSON パース（構造化出力のため確実）
    const aiResponse = JSON.parse(content);
    console.log("✅ Parsed AI Response:", aiResponse);

    return aiResponse;
  } catch (error) {
    console.error("💥 Gemini Error:", error);

    // 高品質フォールバック
    return createFallbackResponse(text);
  }
}

// 最適化されたプロンプト生成
function createOptimizedPrompt(englishText) {
  return `あなたは優しい英語の先生です。日本の子ども（6-10歳）が英語で話した内容を聞いて、温かく励ますフィードバックをします。

## 入力された英語
「${englishText}」

## フィードバック方針
1. まず必ず褒める（頑張りを認める）
2. 使った単語や表現を具体的に評価
3. 簡単な改善提案（1つだけ）
4. 次のチャレンジへの励まし

## 出力形式（必須）
以下のJSON形式で出力してください：
{
  "feedback": "英語でのフィードバック（簡単な単語で100文字以内）",
  "encouragement": "日本語での励まし（50文字以内）", 
  "level_assessment": "beginner/intermediate/advanced",
  "next_suggestion": "次に挑戦してほしいこと（30文字以内）"
}

## 制約
- 子どもが理解できる簡単な英語を使用
- ネガティブな表現は避ける
- 具体的で建設的なアドバイス
- 温かく親しみやすい口調`;
}

// 高品質フォールバック
function createFallbackResponse(text) {
  const encouragements = [
    "英語で話してくれてありがとう！",
    "すてきな英語だったね！",
    "英語にチャレンジしてえらいよ！",
    "がんばって話してくれたね！",
    "英語が上手になってきたね！",
  ];

  const feedbacks = [
    "Great job speaking English!",
    "Nice try! You did well!",
    "Wonderful speaking!",
    "You're getting better!",
    "Keep up the good work!",
  ];

  return {
    feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)],
    encouragement:
      encouragements[Math.floor(Math.random() * encouragements.length)],
    level_assessment: "beginner",
    next_suggestion: "また英語で話してみてね！",
  };
}

// フィードバック表示（修正版）
async function showFeedbackWithAI(recognizedText) {
  console.log("🎤 音声認識結果:", recognizedText);

  const feedbackElement = document.getElementById("feedback");

  // ローディング表示
  feedbackElement.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>AI先生が考え中...</p>
    </div>
  `;

  // AI フィードバック生成（構造化レスポンス）
  const aiResponse = await generateAIFeedback(recognizedText);
  console.log("🤖 構造化AI応答:", aiResponse);

  // 詳細フィードバック表示
  feedbackElement.innerHTML = `
    <div class="ai-feedback">
      <h3>🤖 AI先生からのメッセージ</h3>
      <div class="feedback-content">
        <div class="english-feedback">
          <strong>English:</strong> ${aiResponse.feedback}
        </div>
        <div class="japanese-encouragement">
          <strong>日本語:</strong> ${aiResponse.encouragement}
        </div>
        <div class="level-info">
          <strong>レベル:</strong> ${aiResponse.level_assessment}
        </div>
        ${
          aiResponse.next_suggestion
            ? `
          <div class="suggestion">
            <strong>次のチャレンジ:</strong> ${aiResponse.next_suggestion}
          </div>
        `
            : ""
        }
      </div>
      <small>あなたが言った言葉: "${recognizedText}"</small>
    </div>
  `;

  // 履歴に構造化データを保存
  saveToHistory(recognizedText, aiResponse);
  console.log("✅ 構造化処理完了");
}

// === 音声認識初期化 ===
function initSpeechRecognition() {
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      isRecording = true;
      recordBtn.textContent = "🔴 聞いているよ...";
      recordBtn.classList.add("recording");
      status.textContent = "英語で話してみて！（30秒以内）";

      setTimeout(() => {
        if (isRecording) {
          recognition.stop();
        }
      }, 30000);
    };

    recognition.onresult = async function (event) {
      const result = event.results[0][0].transcript;
      console.log("🗣️ 認識結果:", result);

      // 結果表示
      transcript.textContent = result;

      // AI フィードバック処理（構造化）
      await showFeedbackWithAI(result);

      // 日本語サポート
      const japaneseSupport = generateJapaneseSupport(result);
      support.textContent = japaneseSupport;

      status.textContent = "よくできたね！また話したくなったら押してね";
    };

    recognition.onerror = function (event) {
      console.error("音声認識エラー:", event.error);
      let errorMessage = "もう一度試してみてね！";

      if (event.error === "no-speech") {
        errorMessage = "声が聞こえませんでした。もう一度話してみて";
      } else if (event.error === "network") {
        errorMessage = "インターネット接続を確認してね";
      }

      status.textContent = errorMessage;
      resetRecordButton();
    };

    recognition.onend = function () {
      resetRecordButton();
    };
  } else {
    status.textContent = "このブラウザでは音声認識がサポートされていません";
    recordBtn.disabled = true;
    recordBtn.textContent = "❌ 非対応";
  }
}

// === その他の関数 ===
function resetRecordButton() {
  isRecording = false;
  recordBtn.textContent = "🎤 英語で話してみよう！";
  recordBtn.classList.remove("recording");
}

function generateJapaneseSupport(text) {
  const supportMessages = [
    "英語で話してくれてありがとう！",
    "英語にチャレンジしてえらいね！",
    "すてきな英語だったよ！",
    "英語で話すのって楽しいね！",
    "また英語で話してね！",
    "とても頑張ったね！すごいよ！",
    "英語が上手になってきたね！",
    "その調子でがんばろう！",
  ];

  return supportMessages[Math.floor(Math.random() * supportMessages.length)];
}

// 履歴保存（構造化データ対応）
function saveToHistory(text, aiResponse) {
  console.log("💾 構造化履歴保存:", text, aiResponse);

  try {
    const historyData = JSON.parse(localStorage.getItem("budHistory") || "[]");
    const newEntry = {
      timestamp: new Date().toLocaleString("ja-JP"),
      text: text,
      aiResponse: aiResponse, // 構造化データ
      date: new Date().toDateString(),
      id: Date.now(),
    };

    historyData.unshift(newEntry);

    if (historyData.length > 20) {
      historyData.pop();
    }

    localStorage.setItem("budHistory", JSON.stringify(historyData));
    displayHistory();
    console.log("✅ 構造化履歴保存完了");
  } catch (error) {
    console.error("❌ 履歴保存エラー:", error);
  }
}

// 履歴表示（構造化データ対応）
function displayHistory() {
  const historyData = JSON.parse(localStorage.getItem("budHistory") || "[]");

  if (historyData.length === 0) {
    history.innerHTML =
      '<p style="text-align: center; opacity: 0.7;">まだ練習記録がありません。<br>英語で話してみましょう！</p>';
    return;
  }

  history.innerHTML = historyData
    .map((entry, index) => {
      // 新形式（構造化）と旧形式の両方に対応
      const feedback = entry.aiResponse
        ? entry.aiResponse.feedback
        : entry.message;
      const encouragement = entry.aiResponse
        ? entry.aiResponse.encouragement
        : "";
      const level = entry.aiResponse ? entry.aiResponse.level_assessment : "";

      return `
        <div class="history-item">
            <div class="history-time">${entry.timestamp}</div>
            <div class="history-text">💬 "${entry.text}"</div>
            <div class="history-feedback">
                <div class="english-feedback">✨ ${feedback}</div>
                ${
                  encouragement
                    ? `<div class="japanese-support">🇯🇵 ${encouragement}</div>`
                    : ""
                }
                ${level ? `<div class="level-badge">📊 ${level}</div>` : ""}
            </div>
        </div>
      `;
    })
    .join("");
}

function clearHistory() {
  if (confirm("練習記録を全部消しますか？")) {
    localStorage.removeItem("budHistory");
    displayHistory();
    status.textContent = "記録をクリアしました！新しく始めましょう";
  }
}

// === イベントリスナー ===
recordBtn.addEventListener("click", function () {
  if (!isRecording && recognition) {
    recognition.start();
  }
});

clearBtn.addEventListener("click", clearHistory);

// === 初期化 ===
document.addEventListener("DOMContentLoaded", function () {
  initSpeechRecognition();
  displayHistory();

  if (!localStorage.getItem("budHistory")) {
    status.textContent = "ようこそBUDへ！英語で話してみよう！";
  }

  console.log("🚀 BUD Simple - Gemini最適化版 初期化完了");
});
