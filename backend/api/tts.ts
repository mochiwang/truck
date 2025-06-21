import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// ✅ 使用内联环境变量 JSON 创建客户端（推荐 Render 使用）
const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON!),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ 添加 CORS 响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ 处理预检请求（CORS preflight）
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ 拒绝非 POST 请求
  if (req.method !== 'POST') return res.status(405).end();

  // ✅ 解析请求体
  const { text, lang = 'zh-CN' } = req.body as { text?: string; lang?: string };
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }

  try {
    const [resp] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: lang,
        name: lang === 'en-US' ? 'en-US-Wavenet-D' : 'zh-CN-Wavenet-A',
      },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const base64 = (resp.audioContent as Buffer).toString('base64');
    res.status(200).json({ url: `data:audio/mp3;base64,${base64}` });
  } catch (e) {
    console.error('[TTS] synthesize error', e);
    res.status(500).json({ error: 'TTS failed' });
  }
}
