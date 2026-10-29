import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  GenerateWithAiButton,
  placeCreditPopover,
} from "@/components/creator/common/GenerateWithAiButton";
import { useAICreditsStore } from "@/store/aiCreditsStore";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let passed = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`✓ ${name}`);
};

const baseBalance = useAICreditsStore.getState().balance;

const renderButton = async (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const main = async () => {
  await test("popover places below a trigger with room", async () => {
    const position = placeCreditPopover(
      { top: 100, bottom: 140, left: 100, width: 120 },
      { width: 1000, height: 800 }
    );
    assert.equal(position.width, 320);
    assert.equal(position.top, 148);
    assert.equal(position.left, 8);
  });

  await test("popover flips above a trigger near the bottom", async () => {
    const position = placeCreditPopover(
      { top: 700, bottom: 740, left: 400, width: 120 },
      { width: 1000, height: 800 }
    );
    assert.equal(position.top, 496);
  });

  await test("popover stays inside narrow viewports", async () => {
    const position = placeCreditPopover(
      { top: 50, bottom: 80, left: 240, width: 40 },
      { width: 260, height: 600 }
    );
    assert.equal(position.width, 244);
    assert.ok(position.left >= 8);
    assert.ok(position.left + position.width <= 252);
  });

  await test("empty credits open the refuel dialog instead of navigating", async () => {
    useAICreditsStore.setState({
      status: "ready",
      hasSnapshot: true,
      balance: { ...baseBalance, totalRemaining: 0, remaining: 0 },
    });
    const view = await renderButton(
      <GenerateWithAiButton href="/creator/billing/credits" label="Generate with AI" />
    );
    const anchor = view.container.querySelector("a");
    assert.ok(anchor);
    assert.equal(anchor.getAttribute("data-credit-state"), "empty");
    assert.equal(anchor.getAttribute("aria-haspopup"), "dialog");

    await act(async () => {
      anchor.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });
    assert.ok(document.body.querySelector('[role="dialog"]'), "refuel dialog opens");
    assert.match(document.body.textContent ?? "", /Out of credits/);
    assert.match(document.body.textContent ?? "", /Credits stay valid for 6 months/);
    await view.unmount();
  });

  await test("unknown balance never marks the trigger empty", async () => {
    useAICreditsStore.setState({
      status: "loading",
      hasSnapshot: false,
      balance: { ...baseBalance, totalRemaining: 0, remaining: 0 },
    });
    const view = await renderButton(<GenerateWithAiButton label="Generate with AI" />);
    const button = view.container.querySelector("button");
    assert.ok(button);
    assert.equal(button.getAttribute("data-credit-state"), null);
    assert.equal(button.getAttribute("aria-haspopup"), null);
    await view.unmount();
  });

  await test("a confirmed positive balance does not gate the trigger", async () => {
    useAICreditsStore.setState({
      status: "ready",
      hasSnapshot: true,
      balance: { ...baseBalance, totalRemaining: 20, remaining: 20 },
    });
    let clicked = 0;
    const view = await renderButton(
      <GenerateWithAiButton label="Generate with AI" onClick={() => (clicked += 1)} />
    );
    const button = view.container.querySelector("button");
    assert.ok(button);
    assert.equal(button.getAttribute("data-credit-state"), null);
    await act(async () => {
      button.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });
    assert.equal(clicked, 1);
    await view.unmount();
  });

  console.log(`\n${passed} AI-button checks passed.`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
