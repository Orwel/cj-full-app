import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

// Garantiza .env / .env.local en process.env al cargar la config (útil en dev).
loadEnvConfig(process.cwd())

const nextConfig: NextConfig = {}

export default nextConfig
