import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({
    uploadDir: '/tmp',
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
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
