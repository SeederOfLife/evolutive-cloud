import { OpenRouter } from '@openrouter/sdk';

export const OPENROUTER_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'poolside/laguna-xs-2.1:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
] as const;

export async function callOpenRouter(
  prompt: string,
  model: string,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const client = new OpenRouter({
    apiKey,
    httpReferer: 'https://evolutive-cloud.vercel.app',
    appTitle: 'Evolutive Cloud',
  });

  const stream = await client.chat.send({
    chatRequest: {
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    },
  });

  let response = '';
  for await (const chunk of stream) {
    const content = (chunk as any).choices?.[0]?.delta?.content;
    if (content) {
      response += content;
      onChunk?.(content);
    }
  }

  if (!response) throw new Error('OpenRouter returned empty response.');
  return response;
}
