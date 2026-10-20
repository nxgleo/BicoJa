// Cabeçalhos de segurança enviados em todas as páginas (usados em next.config.ts).

const desenvolvimento = process.env.NODE_ENV !== "production";

// 'unsafe-inline' em scripts: necessário por enquanto para o Next e o ScriptTema.
// Pendência da Fase 6: trocar por "nonce". 'unsafe-eval' só em desenvolvimento (recarregamento automático).
const scripts = ["'self'", "'unsafe-inline'", desenvolvimento ? "'unsafe-eval'" : ""].filter(Boolean).join(" ");

const politicaConteudo = [
  "default-src 'self'",
  `script-src ${scripts}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' ws: wss:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export const cabecalhosSeguranca: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: politicaConteudo },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microfone fica bloqueado até existir áudio no chat
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];
