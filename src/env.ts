// Which build this is (dev, qa, staging or prod), with its version and build number. Set at build time
// (vite.config.ts) from mirror.json, which the grail repo's pipeline writes, so the desktop app always carries the
// same version and build number as the APK it mirrors; and from APP_ENV, which the pipeline sets per branch.

declare const __GRAIL_VERSION__: string
declare const __GRAIL_BUILD__: number
declare const __GRAIL_ENV__: string

export type Env = 'dev' | 'qa' | 'staging' | 'prod'

export const VERSION: string = __GRAIL_VERSION__
export const BUILD: number = __GRAIL_BUILD__
export const ENV: Env = (['dev', 'qa', 'staging', 'prod'] as const).find((e) => e === __GRAIL_ENV__) ?? 'prod'
