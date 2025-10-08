import Anthropic from "@anthropic-ai/sdk";
const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const r = await c.messages.create({
  model: "claude-3-sonnet-20240229",
  max_tokens: 8,
  messages: [{ role: "user", content: "ping" }]
});
console.log(r.content?.[0]?.text || r);
