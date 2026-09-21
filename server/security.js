// Keep the standalone server and Vercel deployment on the same policy.
import config from "../vercel.json" with { type: "json" };
export function securityHeaders(res) {
  for (const { key, value } of config.headers[0].headers)
    res.setHeader(key, value);
}
