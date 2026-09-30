export const APP_ORIGIN = "chordleaf://app";
export function trustedURL(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "chordleaf:" &&
      url.hostname === "app" &&
      !url.port &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function externalURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function boundedBody(request, limit = 30 * 1024 * 1024) {
  if (["GET", "HEAD"].includes(request.method) || !request.body)
    return undefined;
  if (Number(request.headers.get("content-length")) > limit)
    throw new RangeError("size");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new RangeError("size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}
