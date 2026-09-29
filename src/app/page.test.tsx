import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the app name as the main heading", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("<h1>F1 Predictor</h1>");
  });
});
