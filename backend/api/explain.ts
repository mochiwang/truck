import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function cleanLine(line: string): string {
  return line
    .replace(/\b(uh+|um+|hmm+|you know|like)\b/gi, '')  // 去除语气词
    .replace(/\b(\w+)\s+\1\b/gi, '$1') // 合并重复单词
    .replace(/\s{2,}/g, ' ') // 多空格压缩
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { recentTexts } = req.body;
  if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
    return res.status(400).json({ error: 'recentTexts 必须是字符串数组' });
  }

  const cleanTexts = recentTexts
    .map(t => cleanLine(String(t)).slice(0, 200))
    .filter(Boolean)
    .slice(-10); // 最多 10 条

  const joined = cleanTexts.map((t, i) => `句子${i + 1}：${t}`).join('\n');

  const systemPrompt = `
你是一个善于理解人类口语、总结混乱句子核心意图的中文助手。
你擅长从重复、语病、停顿词中提炼出真实的需求，并用自然简洁的中文总结出来。
`;

  const userPrompt = `
以下是几句口语表达（来自语音识别），它们可能断断续续或语病较多。请你根据上下文推断，说话者的主要意图，用一句中文总结即可。
如果内容仍模糊，也请你尝试给出合理猜测，不要输出“我不确定”或“无法判断”。

${joined}

请输出总结：
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    const answer = completion.choices[0].message.content ?? '';
    console.log('🧠 GPT 原始回答：\n', answer);

    const summary = answer.trim().replace(/^【?总结】?[:：]?\s*/i, '');
    const finalSummary = summary.length < 4 ? '对方可能在请求帮助或表达一个需求。' : summary;

    res.status(200).json({ summary: finalSummary });
  } catch (err) {
    console.error('❌ GPT explain 调用失败:', err);
    res.status(500).json({ error: 'GPT explain failed' });
  }
}
