import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite abrir el servidor de desarrollo desde otras IPs de la red local.
  allowedDevOrigins: ['192.168.56.1', '127.0.0.1'],
  // Genera un servidor autocontenido para la imagen de Docker.
  output: 'standalone',
};

export default nextConfig;
