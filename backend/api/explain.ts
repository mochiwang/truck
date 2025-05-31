import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { recentTexts } = req.body;

  if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
    return res.status(400).json({ error: 'Missing recentTexts' });
  }

  try {
    const prompt = `
你是一名翻译助手，接下来我会给你三句话，全部来自警察在路边执法时对司机的讲话。

请你做两件事：
1. 根据这三句话总结警察的主要意图或问题，输出一句中文总结；
2. 分别将三句话翻译成自然中文，每句后加上“- 中文翻译”。

要求输出格式如下：
【总结】：...
【句子1】：... - 中文翻译
【句子2】：... - 中文翻译
【句子3】：... - 中文翻译

三句话如下：
${recentTexts.map((t, i) => `句子${i + 1}：${t}`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const answer = completion.choices[0].message.content;
    res.status(200).json({ summary: answer });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    res.status(500).json({ error: 'GPT explain failed' });
  }
}
