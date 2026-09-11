import { createHash } from "node:crypto";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export type ScanResult = {
  clean: boolean;
  provider: string;
  sha256: string;
  message: string;
};

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function baselineScan(buffer: Buffer, contentType: string): ScanResult {
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const prefix = buffer.subarray(0, 16).toString("ascii");
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
  const blocked = text.includes(EICAR) || prefix.startsWith("MZ") || prefix.startsWith("\\x7fELF") || text.includes("<script");
  const unsupported = !allowedTypes.has(contentType);
  return {
    clean: !blocked && !unsupported && buffer.length > 0,
    provider: "platform-baseline",
    sha256,
    message: blocked ? "Blocked signature detected" : unsupported ? "Unsupported content type" : buffer.length === 0 ? "Empty file" : "No blocked baseline signature detected",
  };
}

export async function scanBuffer(buffer: Buffer, contentType: string): Promise<ScanResult> {
  const baseline = baselineScan(buffer, contentType);
  if (!baseline.clean) return baseline;
  const scanUrl = process.env.MALWARE_SCAN_URL;
  if (!scanUrl) {
    if (process.env.NODE_ENV === "production") {
      return { ...baseline, clean: false, provider: "fail-closed", message: "Malware scanner is not configured for production" };
    }
    return baseline;
  }
  const response = await fetch(scanUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.MALWARE_SCAN_TOKEN ? { Authorization: `Bearer ${process.env.MALWARE_SCAN_TOKEN}` } : {}) },
    body: JSON.stringify({ sha256: baseline.sha256, contentType, bytesBase64: buffer.toString("base64") }),
  });
  if (!response.ok) return { ...baseline, clean: false, provider: "external-scan", message: `Scanner returned HTTP ${response.status}` };
  const payload = await response.json() as { clean?: boolean; message?: string };
  return { ...baseline, clean: payload.clean === true, provider: "external-scan", message: payload.message ?? "External scan completed" };
}
