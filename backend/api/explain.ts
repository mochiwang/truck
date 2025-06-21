import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ 设置 CORS 响应头
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 可按需限制域名
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { recentTexts } = req.body;

  if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
    return res.status(400).json({ error: 'recentTexts 必须是字符串数组' });
  }

  // ✅ 文本清洗 + 保留最多 10 条
  const cleanTexts = recentTexts
    .map((t) => String(t).trim().replace(/\s+/g, ' ').slice(0, 200))
    .slice(-10);

  const prompt = `
你是一个聪明、实用的 AI 助手，我会给你一段英语对话的片段，请你：

1. 首先告诉用户你是jarvis，你会帮助用户，然后推测说话者大概想干什么（哪怕语义不完整，也请你主动推理）
2. 用自然的三句话中文口语总结他们的意图和场景（别机械翻译）
3. 如果能给出一句有帮助的提醒或下一步建议，也请顺便说一句

不要解释你是谁，也不要重复我说的任务内容，直接输出三句话，像你陪伴在我身边一样。
以下是对话内容：
${cleanTexts.map((t, i) => `🗣 第 ${i + 1} 句：${t}`).join('\n')}

请直接输出三句中文总结。
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    const answer = completion.choices[0].message.content ?? '';
    console.log('🧠 GPT 回答：\n', answer);

    res.status(200).json({ summary: answer.trim() });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    res.status(500).json({ error: 'GPT explain failed' });
  }
}
