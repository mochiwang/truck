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

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

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
你是一名中文语音助手，负责判断卡车司机是否听懂了警察的英文指令。

请根据以下信息分析：

警察原话（英文）："${target}"
司机的回应："${actual}"

请你判断：
1. 司机是否理解了警察的意思？
2. 他的回应是否得体？

回答要求：
- 用中文写出简洁自然的反馈，像老司机和朋友说话的风格
- 不要太严厉，可以容忍小错误，只关注是否理解和回应得体
- 最多写三句话，最后给一句鼓励

开始输出：
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '你是一个语气温和、表达自然的中文语音助手，专门帮助华人卡车司机练习听力理解和回应。'
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
    console.error('[GPT understanding analyze error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'GPT analyze failed' }));
  }
}
