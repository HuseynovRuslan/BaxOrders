import { expect } from 'vitest'

/**
 * Test-only: brief acceptance 5 and decision 20.3 as one check. What cannot be clicked never changes under the
 * cursor or the keyboard's focus, so neither it nor anything around it — up to the card or row that is the click
 * target, when there is one — carries a hover, focus or cursor class.
 */
const interactiveStatePattern = /(^|\s|:)(hover|group-hover|focus|focus-visible|cursor)[-:]/

/**
 * Asserts that `element`, and every ancestor below `surface`, has no hover, focus or cursor class. Without a
 * surface it looks all the way up to the body.
 */
export function expectInert(element: Element, surface?: Element) {
  for (
    let node: Element | null = element;
    node !== null && node !== surface && node !== document.body;
    node = node.parentElement
  ) {
    // `getAttribute`, not `className`: an icon is an SVG element, whose `className` is not a string.
    const classes = node.getAttribute('class') ?? ''
    expect(classes, `<${node.tagName.toLowerCase()}> "${node.textContent?.slice(0, 40) ?? ''}"`)
      .not.toMatch(interactiveStatePattern)
  }
}
