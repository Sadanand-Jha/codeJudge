// Superseded by `docling-extract.service.ts` (used by the AI question-generation
// flow). Kept only as a one-off manual snippet; do not import in app code.
import { readFile } from "node:fs/promises";
import { Docling } from "docling-sdk";

const client = new Docling({ api: { baseUrl: "http://localhost:5001" } });
const buffer = await readFile("./document.pdf");

const result = await client.convert(buffer, "document.pdf", { to_formats: ["md"] });
console.log(result.document.md_content);