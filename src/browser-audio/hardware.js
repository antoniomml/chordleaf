export function audioDevice(navigator = {}) {
  const ua = navigator.userAgent || "";
  const ios =
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const webkit =
    ios || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua));
  return {
    mobile:
      ios ||
      /Android|Mobile/.test(ua) ||
      Boolean(navigator.userAgentData?.mobile),
    webkit,
  };
}

export async function audioHardware(navigator) {
  const device = audioDevice(navigator);
  // Use the non-Asyncify CPU engine on WebKit, including other browsers on iOS.
  // Exposing navigator.gpu alone does not establish reliable Qwen inference.
  const adapter = device.webkit
    ? null
    : await navigator.gpu?.requestAdapter().catch(() => null);
  return { ...device, gpu: Boolean(adapter?.features.has("shader-f16")) };
}
