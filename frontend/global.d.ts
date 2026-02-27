// global.d.ts
declare module 'next' {
    interface ExperimentalConfig {
        allowedDevOrigins?: string[];
    }
}
