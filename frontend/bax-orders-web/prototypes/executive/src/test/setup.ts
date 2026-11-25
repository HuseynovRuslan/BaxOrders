import '@testing-library/jest-dom/vitest'

// jsdom does not scroll; the routers' scroll restoration only needs the call to exist.
window.scrollTo = () => {}
