import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ 设置 CORS 响应头
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 可替换为你的域名
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

  // ✅ 清洗与限制文本长度
  const cleanTexts = recentTexts
    .map((t) => String(t).trim().replace(/\s+/g, ' ').slice(0, 200))
    .slice(-10); // 最多取最近 10 条

  const prompt = `
你将看到几句英文对话片段，这些句子可能来自实际交流场景，也可能不太连贯。

请你根据这些内容，尽可能推测说话者的主要意图，用一句自然、简洁的中文进行总结。

- 不要求逐句翻译，只需总结核心含义；
- 即使语句破碎、语法错误，也请你根据常识大胆推测；
- 如果意思不明确，也请给出模糊但合理的总结，例如“对方可能在说明个人情况”或“他可能在表达一个请求”；
- 不要输出“我不确定”或“无法判断”。

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
    console.log('🧠 GPT 返回内容：\n', answer);

    // ✅ 正则提取总结内容（兼容中文冒号与换行）
    const match = answer.match(/【总结】[:：]?\s*(.+)/);
    const summary = match?.[1]?.trim() || '对方可能在表达一些请求或说明自己的情况。';

    res.status(200).json({ summary });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    res.status(500).json({ error: 'GPT explain failed' });
  }
}
