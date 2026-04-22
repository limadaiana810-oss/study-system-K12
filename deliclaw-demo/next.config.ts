import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: ["*.trycloudflare.com"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
}

export default nextConfig
