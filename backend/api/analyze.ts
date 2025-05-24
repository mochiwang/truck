import type { IncomingMessage, ServerResponse } from 'http';
import { OpenAI } from 'openai';

// 用 ReadableStream 获取 body 数据
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
你是一个专门给50岁华人卡车司机做语音反馈的中文助手。

他们不熟悉语言学术语，也不太懂什么是重音、音节、ch音，请你说得特别特别口语化，用“听起来像什么”解释，不要用术语。

现在用户本来应该说：
"${target}"

但实际说的是：
"${actual}"

请你用下面这种“老司机教新手”风格来反馈：

1. 哪个词读得不对，错在哪里？
2. 你说的是：“xxx”，听起来像“yyy”，标准是“zzz”
3. 怎么纠正？直接告诉他应该怎么读，多模仿几遍就行
4. 用**纯中文、语气自然、有点口语感**，一句话只讲一个重点，别搞格式模板

不要说“请练习发音”、“你的语音有问题”这种书面表达，要像老大哥教小弟一样。

开始：
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '你是一个老司机风格的中文发音反馈专家，专门给华人卡车司机讲问题。' },
        { role: 'user', content: prompt }
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
