import OpenAI from "openai";
import { config } from "dotenv";
config();
const client = new OpenAI({ baseURL: process.env.LM_STUDIO_URL, apiKey: "lm-studio" });
const stream = await client.chat.completions.create({
  model: process.env.LM_STUDIO_MODEL_CODER,
  messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: "briefly say hello" }],
  temperature: 0.7,
  stream: true,
  stream_options: { include_usage: true },
});
let sawUsage = false, lastUsage = null;
for await (const chunk of stream) {
  if (chunk.usage) { sawUsage = true; lastUsage = chunk.usage; }
}
console.log("sawUsage:", sawUsage);
console.log("usage:", JSON.stringify(lastUsage));
