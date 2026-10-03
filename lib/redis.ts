import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  console.error("Erro na conexão com Redis:", err);
});