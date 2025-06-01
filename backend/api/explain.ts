import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { recentTexts } = req.body;

  if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
    return res.status(400).json({ error: '参数 recentTexts 必须是非空字符串数组' });
  }

  const cleanTexts = recentTexts
    .map((t) => String(t).trim().replace(/\s+/g, ' ').slice(0, 200))
    .slice(-10); // 限制最后 10 条，且每条最多 200 字符

  const prompt = `
你是一名经验丰富的双语助理，现在我会提供几句英语对话，请你根据语境，判断说话人核心在表达什么。

请直接用简洁自然的中文，总结这段对话的意图或主要内容。不需要逐句翻译，也不需要添加任何“总结”前缀或格式化。

句子如下：
${cleanTexts.map((t, i) => `- ${t}`).join('\n')}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // 如需降低成本可改为 'gpt-3.5-turbo'
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const answer = completion.choices[0].message.content?.trim() || '';

    // 保底兜底处理
    const summary =
      answer.length < 3
        ? '对方表达不清，请再听一遍'
        : answer.split('\n')[0].replace(/^【?总结】?[:：]?\s*/i, '').trim();

    return res.status(200).json({ summary });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    return res.status(500).json({ error: 'GPT explain failed' });
  }
}
