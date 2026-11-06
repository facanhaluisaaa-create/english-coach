// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Markdown } from "@/components/shared/markdown";

describe("Markdown renderer", () => {
  it("renders bold, lists and code without injecting HTML", () => {
    const { container } = render(<Markdown text={"**Quick correction:** use *the*.\n\n- one\n- two\n\n`code` <script>alert(1)</script>"} />);
    expect(container.querySelector("strong")?.textContent).toBe("Quick correction:");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("code")?.textContent).toBe("code");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });
});
