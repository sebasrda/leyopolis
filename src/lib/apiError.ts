import { NextResponse } from "next/server";

/**
 * Standard API error response that never leaks internals in production.
 *
 * In dev: returns the full error so we can debug.
 * In prod: returns a generic message keyed by status code. The original
 *          error is still logged server-side via console.error.
 */
const PROD_MESSAGES: Record<number, string> = {
  400: "Solicitud inválida",
  401: "No autorizado",
  403: "Acceso denegado",
  404: "Recurso no encontrado",
  409: "Conflicto con el estado actual del recurso",
  413: "Carga demasiado grande",
  429: "Demasiadas solicitudes. Intenta más tarde.",
  500: "Error interno del servidor",
  502: "Error en un servicio dependiente",
  503: "Servicio temporalmente no disponible",
};

export function apiError(error: unknown, status: number = 500, devMessage?: string) {
  // Always log on server side for ops
  const isProd = process.env.NODE_ENV === "production";
  console.error("[apiError]", { status, devMessage, error });

  const errMessage = devMessage
    || (error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error");

  const body = {
    message: isProd ? (PROD_MESSAGES[status] || "Error interno del servidor") : errMessage,
    // Only expose error details in non-prod
    ...(isProd ? {} : { detail: errMessage }),
  };

  return NextResponse.json(body, { status });
}

export function unauthorized(devMessage?: string) {
  return apiError(devMessage, 401, devMessage);
}
export function forbidden(devMessage?: string) {
  return apiError(devMessage, 403, devMessage);
}
export function badRequest(devMessage?: string) {
  return apiError(devMessage, 400, devMessage);
}
export function notFound(devMessage?: string) {
  return apiError(devMessage, 404, devMessage);
}
