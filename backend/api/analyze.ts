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

  // ✅ 响应预检请求
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
你是一个专门为50岁华人卡车司机提供发音反馈的中文语音助手。

请记住以下原则：
- 用户不需要术语解释，请用“听起来像...”来描述。
- 不要太长，最多三段中文，直奔重点。
- 允许发音有点问题但语义正确时不扣分。
- 多鼓励用户，比如“差不多了”，“你读得挺好，就是xxx要注意”。
- 最后附上一句“👉 跟我一起读一遍：xxx”，帮助用户跟读。

现在他本来应该说：
"${target}"

但实际说的是：
"${actual}"

请你用非常自然、接地气、像老司机教新人的语气来写反馈。别写作文，别讲道理太多，直接指出问题词，轻松、友好、鼓励式说话。
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '你是一个语气自然、接地气的中文发音反馈助手，专门帮华人卡车司机纠正发音。'
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
