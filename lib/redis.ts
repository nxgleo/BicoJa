import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Se o Redis cair, desiste rápido (erro) em vez de deixar a tela girando para sempre
export const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });

redis.on("error", (err) => {
  console.error("Erro na conexão com Redis:", err);
});