import axios from "axios";
import * as cheerio from "cheerio";

async function debug() {
  const url = "https://codeforces.com/contest/2227/problem/A";
  
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CodeJudge/1.0)",
    },
  });

  const $ = cheerio.load(response.data);
  const container = $(".problem-statement").first();
  
  // Method 1: Using fullHtml substring approach
  const fullHtml = container.html() || "";
  console.log("=== FULL HTML (first 1000 chars) ===");
  console.log(fullHtml.substring(0, 1000));
  console.log("\n");
  
  const headerStart = fullHtml.indexOf('<div class="header">');
  const headerEnd = fullHtml.indexOf('</div>', headerStart) + '</div>'.length;
  const inputSpecStart = fullHtml.indexOf('<div class="input-specification">');
  
  console.log("headerStart:", headerStart);
  console.log("headerEnd:", headerEnd);
  console.log("inputSpecStart:", inputSpecStart);
  
  if (headerEnd > 0 && inputSpecStart > headerEnd) {
    const statementHtml = fullHtml.substring(headerEnd, inputSpecStart).trim();
    console.log("\n=== STATEMENT HTML (method 1) ===");
    console.log(statementHtml);
    console.log("Length:", statementHtml.length);
  }
  
  // Method 2: Using children approach
  const children = container.children();
  console.log("\n=== Children ===");
  children.each((i, el) => {
    const $el = $(el);
    const tagName = ($el.prop("tagName") || "").toLowerCase();
    const classes = $el.attr("class") || "";
    const html = $el.html() || "";
    console.log(`[${i}] <${tagName}> class="${classes}" html-length=${html.length}`);
    if (i === 1) {
      console.log("  HTML:", html.substring(0, 500));
    }
  });
}

debug().catch(console.error);