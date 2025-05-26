import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';

// ✅ 禁用默认 body 解析器（使用 formidable 解析 multipart form-data）
export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ 设置全局 CORS 响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ✅ 限制仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({
    uploadDir: '/tmp',
    keepExtensions: true
  });

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    // ✅ 再次设置 CORS（确保在回调上下文中仍生效）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (err) {
      console.error('❌ formidable parse error:', err);
      return res.status(500).json({ error: 'Form parse failed' });
    }

    if (!files.audio) {
      return res.status(400).json({ error: 'No audio file found' });
    }

    const file = Array.isArray(files.audio) ? files.audio[0] : files.audio;

    try {
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(file.filepath),
        language: 'en'
      });

      console.log('✅ Whisper 返回:', transcription.text);
      res.status(200).json({ text: transcription.text });
    } catch (e) {
      console.error('❌ Whisper API 出错:', e);
      res.status(500).json({ error: 'Whisper failed' });
    }
  });
}
