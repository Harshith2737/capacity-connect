import { afterEach, describe, expect, it } from "vitest";
import { scanBuffer } from "./fileScan";

afterEach(() => {
  delete process.env.MALWARE_SCAN_URL;
  delete process.env.MALWARE_SCAN_TOKEN;
  delete process.env.NODE_ENV;
});

describe("evidence file scanning", () => {
  it("accepts a supported clean development file and returns a hash", async () => {
    const result = await scanBuffer(Buffer.from("forecast evidence"), "text/plain");
    expect(result.clean).toBe(true);
    expect(result.provider).toBe("platform-baseline");
    expect(result.sha256).toHaveLength(64);
  });

  it("blocks unsupported file types before storage", async () => {
    const result = await scanBuffer(Buffer.from("binary"), "application/x-msdownload");
    expect(result.clean).toBe(false);
    expect(result.message).toContain("Unsupported content type");
  });

  it("blocks the standard antivirus test signature", async () => {
    const result = await scanBuffer(Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"), "text/plain");
    expect(result.clean).toBe(false);
    expect(result.message).toContain("Blocked signature");
  });
});
