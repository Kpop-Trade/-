#!/usr/bin/env bash
set -e

echo "=== 1. Git状態確認 ==="
git status -s

echo "=== 2. Firebase ログイン（ブラウザ認証が必要な場合は表示URLを開いてください） ==="
npx firebase login --no-localhost

echo "=== 3. Cloud Functions デプロイ ==="
npx firebase deploy --only functions

echo "=== 4. 完了 ==="
