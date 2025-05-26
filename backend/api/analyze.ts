import type { IncomingMessage, ServerResponse } from 'http';
import { OpenAI } from 'openai';

// ✅ 读取 JSON 请求体
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const bodyStr = Buffer.concat(chunks).toString();
  return JSON.parse(bodyStr);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // ✅ 设置跨域响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // ✅ 限制方法为 POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const { target, actual } = await parseJsonBody(req);

  if (!target || !actual) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing target or actual sentence' }));
    return;
  }

  try {
    const prompt = `
你是一名中文语音助手，帮助40-60岁的华人卡车司机练习英语发音。

他本来应该说：
"${target}"

但实际说的是：
"${actual}"

请你：
1. 指出一个最明显的发音问题（用“听起来像...”来解释）
2. 简要提示该怎么读
3. 最后加一句简短鼓励，例如：“别担心，再来一次就好了。”

要求：
- 只写 2~3 句话，不能写成作文
- 用词简单，语气温和，像朋友一样提醒
- 不要格式化列出问题，不要模板结构

开始输出：
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '你是一个语气温和、表达清晰的中文语音助手，专门帮助华人卡车司机练习英语发音。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const reply = completion.choices[0].message.content;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ feedback: reply }));
  } catch (err) {
    console.error('[GPT analyze error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'GPT analyze failed' }));
  }
}
