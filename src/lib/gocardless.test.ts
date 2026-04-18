import { describe, it, expect, vi, afterEach } from "vitest";
import { GOCARDLESS_DEFAULTS } from "./gocardless";

async function loadBuilder() {
  const mod = await import("./gocardless");
  return mod.buildGoCardlessAuthorizeUrl;
}

describe("gocardless URL helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to sandbox OAuth base when no env", async () => {
    const buildGoCardlessAuthorizeUrl = await loadBuilder();
    const url = buildGoCardlessAuthorizeUrl({
      clientId: "cid",
      redirectUri: "https://app.example.com/oauth/callback",
    });
    expect(url.startsWith(`${GOCARDLESS_DEFAULTS.oauthSandbox}/oauth/authorize`)).toBe(true);
    expect(url).toContain("client_id=cid");
    expect(url).toContain(encodeURIComponent("https://app.example.com/oauth/callback"));
  });

  it("uses live OAuth base when VITE_GOCARDLESS_ENV=live", async () => {
    vi.stubEnv("VITE_GOCARDLESS_ENV", "live");
    const buildGoCardlessAuthorizeUrl = await loadBuilder();
    const url = buildGoCardlessAuthorizeUrl({
      clientId: "x",
      redirectUri: "https://a.com/cb",
    });
    expect(url.startsWith(`${GOCARDLESS_DEFAULTS.oauthLive}/oauth/authorize`)).toBe(true);
  });

  it("respects VITE_GOCARDLESS_OAUTH_BASE override", async () => {
    vi.stubEnv("VITE_GOCARDLESS_OAUTH_BASE", "https://custom.example/gc");
    const buildGoCardlessAuthorizeUrl = await loadBuilder();
    const url = buildGoCardlessAuthorizeUrl({
      clientId: "x",
      redirectUri: "https://a.com/cb",
    });
    expect(url.startsWith("https://custom.example/gc/oauth/authorize")).toBe(true);
  });
});
