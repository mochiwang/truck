import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ 设置 CORS 响应头
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 也可以替换为具体域名，例如 https://truck-two.vercel.app
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res); // 设置跨域响应头

  // ✅ 预检请求快速返回
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { recentTexts } = req.body;

  // ✅ 类型检查
  if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
    return res.status(400).json({ error: 'recentTexts 必须是字符串数组' });
  }

  // ✅ 文本清洗 + 长度限制
  const cleanTexts = recentTexts
    .map((t) => String(t).trim().replace(/\s+/g, ' ').slice(0, 200))
    .slice(-10); // 最多保留 10 条

  try {
    const prompt = `
你是一名专业的路边执法翻译助手。现在我会给你几句话，它们全部来自警察对一名卡车司机的讲话。

请你：
1. 总结这几句话的主要意图或目的，用一句清晰、口语化、简洁但有信息量的中文话术回复；
2. 不要重复翻译句子，只需要总结。

输出格式如下：
【总结】：...

句子如下：
${cleanTexts.map((t, i) => `句子${i + 1}：${t}`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content ?? '';

    // ✅ 日志输出 GPT 实际返回内容
    console.log('🧠 GPT 原始回答：\n', answer);

    // ✅ 提取【总结】部分
    const match = answer.match(/【总结】[:：](.+)/);
    const summary = match?.[1]?.trim() || '对方的意图不太清楚，请注意听。';

    res.status(200).json({ summary });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    res.status(500).json({ error: 'GPT explain failed' });
  }
}
