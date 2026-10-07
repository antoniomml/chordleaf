import { runtimeURLs, gpuRuntimeURLs } from "./runtime.js";
import sizes from "virtual:chordleaf-audio-runtime-sizes";

export const runtimeFiles = Object.entries(runtimeURLs).map(([name, url]) => ({
  url,
  bytes: sizes.cpu[name],
}));
export const gpuRuntimeFiles = Object.entries(gpuRuntimeURLs).map(
  ([name, url]) => ({
    url,
    bytes: sizes.gpu[name],
  }),
);
