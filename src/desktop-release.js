// Never advertise an arbitrary URL as the official desktop installer.
export function desktopDownloadURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/antoniomml\/chordleaf\/releases\/download\/[^/]+\/Chordleaf-[^/]+-mac-arm64\.dmg$/.test(
        url.pathname,
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
