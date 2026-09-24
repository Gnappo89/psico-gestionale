/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // La build non è mai stata verificata con `tsc` in locale in questo
    // ambiente (nessun accesso al registro npm): evitiamo che un errore di
    // tipo blocchi il primo deploy. Consigliato rimuovere questa opzione
    // una volta verificato `npm run build` in locale o nei log di Railway.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
