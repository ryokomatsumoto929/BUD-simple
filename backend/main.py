from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

# 環境変数読み込み
load_dotenv()

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="BUD Simple Backend", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bud-simple-app.web.app",  # Firebase Hosting URL
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5500",  # Live Server
        "*"  # 開発時のみ、本番では具体的なドメインを指定
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API設定
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")

# リクエスト・レスポンスモデル
class FeedbackRequest(BaseModel):
    text: str

class FeedbackResponse(BaseModel):
    feedback: str
    success: bool
    model_used: str = "gemini-2.0-flash-exp"

# 子ども向けフィードバック生成関数
async def generate_child_feedback(english_text: str) -> str:
    """子ども向けの温かいAIフィードバックを生成"""
    
    prompt = f"""
あなたは優しい英語の先生です。子どもが英語で「{english_text}」と言いました。

以下の条件で、温かく励ましのフィードバックを**日本語で**生成してください：

条件：
- 子どもの頑張りを必ず褒める
- 簡単で分かりやすい言葉を使う
- 絵文字を1-2個使って楽しく
- 50文字以内で簡潔に
- 次も頑張ろうという気持ちになるように

例：
「Hello」→「こんにちはって言えたね！すごい！✨」
「I like apples」→「りんごが好きって英語で言えたね！えらい！🍎」
「Thank you」→「ありがとうって英語で言えてステキ！😊」

子どもの発話：「{english_text}」
フィードバック：
"""

    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(prompt)
        
        if response.text:
            # 不要な前後の文字を除去
            feedback = response.text.strip()
            # 「フィードバック：」などの prefix を除去
            if "：" in feedback:
                feedback = feedback.split("：")[-1].strip()
            return feedback
        else:
            raise Exception("Empty response from Gemini")
            
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        # フォールバック応答
        return f"「{english_text}」って英語で言えてえらいね！✨"

# APIエンドポイント
@app.get("/")
async def root():
    return {"message": "BUD Simple Backend is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    gemini_status = "available" if GEMINI_API_KEY else "not_configured"
    return {
        "status": "healthy",
        "gemini_api": gemini_status,
        "message": "Backend server is running"
    }

@app.post("/api/feedback", response_model=FeedbackResponse)
async def get_feedback(request: FeedbackRequest):
    """英語発話に対するAIフィードバックを生成"""
    
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        # 入力テキストのログ
        logger.info(f"Generating feedback for: '{request.text}'")
        
        # Gemini APIでフィードバック生成
        if GEMINI_API_KEY:
            feedback = await generate_child_feedback(request.text.strip())
            success = True
            model_used = "gemini-2.0-flash-exp"
        else:
            # API キーがない場合のフォールバック
            feedback = f"「{request.text}」って英語で言えてえらいね！✨"
            success = False
            model_used = "fallback"
        
        logger.info(f"Generated feedback: '{feedback}'")
        
        return FeedbackResponse(
            feedback=feedback,
            success=success,
            model_used=model_used
        )
        
    except Exception as e:
        logger.error(f"Error generating feedback: {e}")
        
        # エラー時のフォールバック
        fallback_feedback = f"「{request.text}」って英語で言えてえらいね！✨"
        
        return FeedbackResponse(
            feedback=fallback_feedback,
            success=False,
            model_used="fallback"
        )

# デバッグ用エンドポイント
@app.post("/api/test")
async def test_gemini():
    """Gemini API接続テスト"""
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY not configured"}
    
    try:
        test_feedback = await generate_child_feedback("Hello")
        return {
            "status": "success",
            "test_input": "Hello",
            "test_output": test_feedback,
            "gemini_api": "working"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "gemini_api": "failed"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)