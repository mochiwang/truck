import type { IncomingMessage, ServerResponse } from 'http';
import formidable from 'formidable';
import fs from 'fs';
import { OpenAI } from 'openai';

// ✅ 禁用默认 body 解析（因为使用 formidable 处理 form-data）
export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // ✅ 设置跨域响应头（CORS）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ 处理浏览器预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // ✅ 限制仅允许 POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);
    const file = files.audio?.[0];

    if (!file || !file.filepath) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'No audio uploaded' }));
      return;
    }

    const stream = fs.createReadStream(file.filepath);
    const transcript = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: stream as any,
      language: 'zh',
      response_format: 'json'
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ text: transcript.text }));
  } catch (err) {
    console.error('[Whisper-ZH Error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Whisper zh failed' }));
  }
}
