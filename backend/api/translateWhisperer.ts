// backend/api/translateWhisperer.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
    const prompt = `你是一个中英翻译助手，请将下列英文翻译为通顺自然的中文，不要遗漏、不做臆测。\n英文原文：${text}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一个中英翻译助手。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const zh = completion.choices?.[0]?.message?.content?.trim();
    if (!zh) throw new Error('GPT returned empty content');

    return res.status(200).json({ zh });
  } catch (err) {
    console.error('[GPT Translate Error]', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
