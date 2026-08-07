/** @type {import('next').NextConfig} */
const nextConfig = {
  // @napi-rs/canvas (transitiv über den PDF-Parser) bringt eine native N-API-Binding mit, die
  // Turbopack nicht in ein ESM-Chunk bündeln kann – als echtes Node-External behandeln statt
  // zu bundlen (betrifft v.a. Route Handler, seit core/agent/ dort mit hineingezogen wird).
  serverExternalPackages: ['@napi-rs/canvas'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
