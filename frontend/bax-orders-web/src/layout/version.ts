/**
 * The build's own version, read from `package.json` at build time by Vite.
 *
 * The approved handoff showed «v2.0 Enterprise» in this corner. That was mock copy for a mockup: printing it
 * here would tell every reader a version number that is not this build's, which is the one thing a version
 * string exists not to do.
 */
export const appVersion = `v${__APP_VERSION__}`
