/**
 * pdf-polyfill.ts
 *
 * Some PDFs require DOMMatrix at parse time (via pdfjs-dist, used by pdf-parse).
 * In Node.js there is no DOM, so we install a minimal stub.
 *
 * IMPORTANT: import this file BEFORE `require("pdf-parse")` in any route
 * that extracts text from a PDF on the server. ESM imports are hoisted and
 * executed top-down, so a single side-effect import at the top of the
 * module is enough.
 *
 *   import "@/lib/pdf-polyfill";
 *   const pdfParse = require("pdf-parse");
 */

if (typeof (globalThis as any).DOMMatrix === "undefined") {
  class DOMMatrixStub {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true;
    isIdentity = true;
    constructor(_init?: any) {}
  }
  (globalThis as any).DOMMatrix = DOMMatrixStub;
}

// Fix for pdfjs-dist / pdf-parse "Cannot find module as expression is too dynamic"
// Modern pdfjs-dist (4.x+) reads GlobalWorkerOptions.workerSrc from the module
// exports, not from a global PDFJS object. The legacy PDFJS shim below is
// preserved for older code paths that still check it.
if (typeof (globalThis as any).PDFJS === "undefined") {
  (globalThis as any).PDFJS = {};
}
(globalThis as any).PDFJS.disableWorker = true;
(globalThis as any).PDFJS.workerSrc = "";

// Try to set the modern option too. This must run before pdfjs is loaded;
// once serverExternalPackages is set in next.config, pdfjs is imported
// via plain Node require, so this side effect works.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");
  if (pdfjs?.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = "";
  }
} catch {
  // pdfjs-dist may not be resolvable via this path; safe to ignore.
}

export {};
