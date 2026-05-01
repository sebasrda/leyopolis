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

export {};
