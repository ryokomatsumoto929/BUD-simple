# Google Cloud Run用 Dockerfile
FROM python:3.11-slim

# 作業ディレクトリ設定
WORKDIR /app

# システムパッケージ更新
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係ファイルをコピー
COPY requirements.txt .

# 依存関係インストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションファイルをコピー
COPY main.py .
COPY .env .

# ポート設定（Cloud Runは環境変数PORTを使用）
ENV PORT=8080
EXPOSE 8080

# アプリケーション起動
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT