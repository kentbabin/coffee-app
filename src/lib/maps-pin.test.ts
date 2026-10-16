import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { pinFromMapsUrl } = await import("./maps-pin");

afterEach(() => vi.unstubAllGlobals());

describe("pinFromMapsUrl", () => {
  it("reads full links without a request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await pinFromMapsUrl("https://www.google.com/maps/@-8.5069,115.2625,15z")).toEqual({ lat: -8.5069, lng: 115.2625 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("follows short links to the full one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ url: "https://www.google.com/maps/place/X/@-8.6,115.1,17z/data=!3d-8.6512!4d115.1301" })));
    expect(await pinFromMapsUrl("https://maps.app.goo.gl/AbC")).toEqual({ lat: -8.6512, lng: 115.1301 });
  });

  it("reads the target out of a consent page", async () => {
    const target = encodeURIComponent("https://www.google.com/maps/place/X/@-8.65,115.13,17z");
    vi.stubGlobal("fetch", vi.fn(async () => ({ url: `https://consent.google.com/ml?continue=${target}` })));
    expect(await pinFromMapsUrl("https://maps.app.goo.gl/AbC")).toEqual({ lat: -8.65, lng: 115.13 });
  });

  it("gives up quietly when the link can't be followed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await pinFromMapsUrl("https://maps.app.goo.gl/AbC")).toBeNull();
  });
});
