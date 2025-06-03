// backend/api/translateWhisperer.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

let messageHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
  {
    role: 'system',
    content: `你是一个中英翻译助手。请将用户的英文内容直接翻译为自然、简洁的中文。
即使英文内容不完整、语法不标准或只有短语，也要尽力给出中文含义。
不要说“请提供上下文”、“无法翻译”、“抱歉”这类话，直接翻译或合理猜测其含义。`
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing input text' });
  }

  try {
    messageHistory.push({ role: 'user', content: text });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messageHistory,
      temperature: 0.3,
    });

    const zh = completion.choices?.[0]?.message?.content?.trim();
    if (!zh) throw new Error('GPT returned empty');

    messageHistory.push({ role: 'assistant', content: zh });

    // 仅保留 system + 最近 4 轮（8 条 message）
    if (messageHistory.length > 9) {
      messageHistory = [messageHistory[0], ...messageHistory.slice(-8)];
    }

    return res.status(200).json({ zh });
  } catch (err) {
    console.error('[GPT Translate Error]', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
