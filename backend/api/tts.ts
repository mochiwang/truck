import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// ⬇️  方案 A —— 本地 / Vercel 自动用 GOOGLE_APPLICATION_CREDENTIALS
const client = new TextToSpeechClient();

/*  ⬇️  方案 B —— 如果你只想用环境变量内联 JSON，不想上传文件
const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON!),
});
*/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text, lang = 'zh-CN' } = req.body as { text?: string; lang?: string };
  if (!text?.trim()) return res.status(400).json({ error: 'Missing text' });

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
