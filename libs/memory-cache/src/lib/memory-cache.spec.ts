import { memoryCache } from "./memory-cache.js";

describe("memoryCache", () => {
  it("should work", () => {
    expect(memoryCache()).toEqual("memory-cache");
  });
});
