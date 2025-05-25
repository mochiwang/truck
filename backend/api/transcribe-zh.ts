import type { IncomingMessage, ServerResponse } from 'http';
import formidable from 'formidable';
import fs from 'fs';
import { OpenAI } from 'openai';

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const form = formidable({ multiples: false });
  const [fields, files] = await form.parse(req);
  const file = files.audio?.[0];

  if (!file || !file.filepath) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'No audio uploaded' }));
    return;
  }

  try {
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
    res.end(JSON.stringify({ error: 'Whisper zh failed' }));
  }
}
