import type { IncomingMessage, ServerResponse } from 'http';
import { OpenAI } from 'openai';

// 获取 JSON body 工具
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const bodyStr = Buffer.concat(chunks).toString();
  return JSON.parse(bodyStr);
}

// 初始化 GPT
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// 主处理函数
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const { text } = await parseJsonBody(req);

  if (!text) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing input text' }));
    return;
  }

  try {
    const prompt = `请把下面这句中文翻译成通俗易懂的英文口语句子：\n"${text}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const reply = completion.choices[0].message.content?.trim();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ translation: reply }));
  } catch (err) {
    console.error('[GPT translate error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Translation failed' }));
  }
}
