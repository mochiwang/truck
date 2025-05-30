// backend/api/simplifyAnswer.ts

import { OpenAI } from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '缺少 text 字段' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个负责将中文对话简化为英文关键词的助手。',
        },
        {
          role: 'user',
          content: `请将以下中文回答转化为适合司机对警察简短口头作答的英文关键词（5~7个以内），不要输出完整句子。\n\n中文原文：${text}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content;
    const keywords = answer?.split(/[,\n]/).map((word) => word.trim()).filter(Boolean) || [];

    res.status(200).json({ keywords });
  } catch (err) {
    console.error('❌ GPT 生成失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
}
