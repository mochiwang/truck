// backend/api/transcribe.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';
import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export const config = {
  api: {
    bodyParser: false
  }
};

// 读取 FormData 中上传的音频文件
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });
  const [fields, files] = await form.parse(req);
  const file = files.audio?.[0];

  if (!file || !file.filepath) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  try {
    const stream = fs.createReadStream(file.filepath);

    const transcript = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: stream as any,
      response_format: 'json'
    });

    return res.status(200).json({ text: transcript.text });
  } catch (err) {
    console.error('Whisper error:', err);
    return res.status(500).json({ error: 'Whisper failed' });
  }
}
