import { describe, expect, it } from "vitest";
import { parseMapsUrl } from "./maps";

describe("parseMapsUrl", () => {
  it("prefers the place pin over the map centre", () => {
    const url =
      "https://www.google.com/maps/place/Sample+Roastery/@-8.6478,115.1385,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-8.6481!4d115.1391";
    expect(parseMapsUrl(url)).toEqual({ kind: "coords", lat: -8.6481, lng: 115.1391 });
  });

  it("reads the map centre when there is no pin", () => {
    expect(parseMapsUrl("https://www.google.com/maps/@-8.5069,115.2625,15z")).toEqual({ kind: "coords", lat: -8.5069, lng: 115.2625 });
  });

  it("reads query parameters, encoded or not", () => {
    expect(parseMapsUrl("https://www.google.com/maps/search/?api=1&query=-8.65,115.13")).toEqual({ kind: "coords", lat: -8.65, lng: 115.13 });
    expect(parseMapsUrl("https://maps.google.com/?q=-8.65%2C115.13")).toEqual({ kind: "coords", lat: -8.65, lng: 115.13 });
  });

  it("flags short links, which cannot be read in the browser", () => {
    expect(parseMapsUrl("https://maps.app.goo.gl/AbCdEf123")).toEqual({ kind: "short" });
    expect(parseMapsUrl("https://goo.gl/maps/AbCdEf123")).toEqual({ kind: "short" });
  });

  it("finds nothing in links without coordinates", () => {
    expect(parseMapsUrl("https://www.google.com/maps/place/Sample+Roastery")).toEqual({ kind: "none" });
    expect(parseMapsUrl("not a link")).toEqual({ kind: "none" });
    expect(parseMapsUrl("")).toEqual({ kind: "none" });
  });

  it("rejects out-of-range numbers", () => {
    expect(parseMapsUrl("https://www.google.com/maps/@-98.1,115.2,15z")).toEqual({ kind: "none" });
  });
});
