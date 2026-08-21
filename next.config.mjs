/** @type {import('next').NextConfig} */
const nextConfig = {
  // @napi-rs/canvas
  // brings a native N-API binding that Turbopack can't bundle into
  // an ESM chunk – treat it as a real Node external instead of bundling it.
  serverExternalPackages: ['@napi-rs/canvas'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
