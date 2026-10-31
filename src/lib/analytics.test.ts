import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyError, isProductionHostname, track } from "./analytics";

const stubWindow = (hostname: string, gtag?: () => void): void => {
  vi.stubGlobal("window", { location: { hostname }, gtag });
};

describe("isProductionHostname", () => {
  it.each(["www.schedula.xyz", "schedula.xyz"])("accepts %s", (host) => {
    expect(isProductionHostname(host)).toBe(true);
  });

  it.each([
    "localhost",
    "127.0.0.1",
    "schedula-git-feat.vercel.app",
    "evil.com.schedula.xyz.example",
  ])("rejects %s", (host) => {
    expect(isProductionHostname(host)).toBe(false);
  });
});

describe("track", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the event to gtag on a production hostname", () => {
    const gtag = vi.fn();
    stubWindow("www.schedula.xyz", gtag);
    track("share", { method: "copy_link", content_type: "meeting" });
    expect(gtag).toHaveBeenCalledWith("event", "share", {
      method: "copy_link",
      content_type: "meeting",
    });
  });

  it("logs instead of sending off the production hostname", () => {
    const gtag = vi.fn();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stubWindow("localhost", gtag);
    track("meeting_created", {});
    expect(gtag).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("does not throw when gtag throws or is missing", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    stubWindow("schedula.xyz", () => {
      throw new Error("boom");
    });
    expect(() => track("meeting_created", {})).not.toThrow();
    stubWindow("schedula.xyz", undefined);
    expect(() => track("meeting_created", {})).not.toThrow();
  });
});

describe("classifyError", () => {
  it("treats TypeError (fetch failure) as network and others as server", () => {
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyError(new Error("HTTP 500"))).toBe("server");
  });
});
