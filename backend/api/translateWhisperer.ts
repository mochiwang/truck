// backend/api/translateWhisperer.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing input text' });
  }

  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY!;
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'zh-CN',
        format: 'text'
      })
    });

    const data = await response.json();

    if (!data?.data?.translations?.[0]?.translatedText) {
      throw new Error('Invalid Google Translate response');
    }

    const zh = data.data.translations[0].translatedText;
    return res.status(200).json({ zh });
  } catch (err) {
    console.error('[Google Translate Error]', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
