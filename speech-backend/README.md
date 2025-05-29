# 🧠 Speech Backend (Render Ready)

## 功能

- 使用 Google Cloud Speech-to-Text 实时识别语音
- 使用 VAD 只上传有声片段，控制成本
- 使用 WebSocket 推送识别结果到前端

## 部署步骤（Render）

1. 上传本项目到 GitHub
2. 登录 Render → 创建 Web Service
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Port: `4000`
3. 添加 Secret Files：
   - `/etc/secrets/credentials.json` ← 粘贴你的 Google 凭据
4. 添加 Environment Variables：
   - `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/credentials.json`
   - `LANGUAGE_CODE=en-US`

## 本地测试

```bash
npm install
node server.js
