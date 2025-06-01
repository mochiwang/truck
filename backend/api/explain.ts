import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ 设置 CORS 响应头
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 可替换为特定域名
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { recentTexts } = req.body;

  if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
    return res.status(400).json({ error: 'recentTexts 必须是字符串数组' });
  }

  const cleanTexts = recentTexts
    .map((t) => String(t).trim().replace(/\s+/g, ' ').slice(0, 200))
    .slice(-10); // 最多保留 10 条

  const prompt = `
以下是一段英文对话的部分片段，请根据这些句子总结说话者的核心意图。
即使语句不完整或表达含糊，也请你根据语境进行合理推测。

直接给出一句简洁的中文总结，不需要逐句翻译。尽量用贴近日常口语的表达方式，不要说“我不确定”或“无法判断”。

句子如下：
${cleanTexts.map((t, i) => `句子${i + 1}：${t}`).join('\n')}

【总结】：
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content ?? '';
    console.log('🧠 GPT 原始回答：\n', answer);

    const match = answer.match(/【总结】[:：](.+)/);
    const summary = match?.[1]?.trim() || '内容含糊，请仔细听清对方说的话。';

    res.status(200).json({ summary });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    res.status(500).json({ error: 'GPT explain failed' });
  }
}
