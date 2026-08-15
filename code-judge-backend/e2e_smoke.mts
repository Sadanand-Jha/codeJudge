await import("./src/app.ts");
const { streamAiChat } = await import("./src/ai/services/aiService.ts");

let out = "";
let n = 0;
for await (const c of streamAiChat({
  message: "This is a test — reply with exactly: OK",
  mode: "coding_coach",
  problemId: "2227A",
  code: "// user code\nint main() { return 0; }\n",
  language: "cpp",
  filename: "main.cpp",
  conversationId: "e2e-test-conv-1",
})) {
  if (c.content) { out += c.content; n++; if (n % 20 === 0) console.log("...streaming", n); }
  if (c.conversationId) console.log("DONE conversationId:", c.conversationId);
}
console.log("REPLY:", JSON.stringify(out.slice(0, 300)));
