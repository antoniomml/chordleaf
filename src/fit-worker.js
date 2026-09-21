import { fitToPage } from "./layout.js";
self.onmessage = ({ data }) => self.postMessage(fitToPage(data));
