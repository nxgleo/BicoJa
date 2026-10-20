import type { NextConfig } from "next";
import { cabecalhosSeguranca } from "./lib/seguranca";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosSeguranca }];
  },
};

export default nextConfig;
