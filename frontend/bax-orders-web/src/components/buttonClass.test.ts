import { describe, expect, it } from 'vitest'
import { buttonClass } from './buttonClass'

/** UI V2 (03 §5.4, 04 §5.8): three button styles in tokens, for a button and a link alike. */
describe('the button styles', () => {
  it('draws each variant in the product’s tokens, never in stock slate or a hex value', () => {
    expect(buttonClass({ variant: 'primary' })).toContain('bg-primary')
    expect(buttonClass({ variant: 'primary' })).toContain('text-on-primary')
    expect(buttonClass({ variant: 'primary' })).toContain('hover:bg-primary-container')
    expect(buttonClass({ variant: 'secondary' })).toContain('border-outline')
    expect(buttonClass({ variant: 'secondary' })).toContain('bg-surface-container-lowest')
    expect(buttonClass({ variant: 'ghost' })).toContain('text-on-surface-variant')
    expect(buttonClass({ variant: 'ghost' })).toContain('hover:bg-surface-container-low')

    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      expect(buttonClass({ variant })).not.toMatch(/slate-|#[0-9a-f]{3,6}/i)
    }
  })

  it('shows the keyboard’s focus and a disabled button on every variant', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const classes = buttonClass({ variant }).split(' ')
      expect(classes).toEqual(expect.arrayContaining([
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-primary',
        'disabled:opacity-40',
        'aria-disabled:opacity-40',
      ]))
    }
  })

  it('is 32, 40 or 44 pixels tall, and 44 below lg when it is pressed with a finger', () => {
    expect(buttonClass({ size: 'sm' }).split(' ')).toContain('h-8')
    expect(buttonClass({ size: 'md' }).split(' ')).toContain('h-10')
    expect(buttonClass({ size: 'touch' }).split(' ')).toContain('h-11')
    expect(buttonClass({ size: 'sm', touchBelowLg: true }).split(' ')).toEqual(expect.arrayContaining(['h-11', 'lg:h-8']))
    expect(buttonClass({ size: 'md', touchBelowLg: true }).split(' ')).toEqual(expect.arrayContaining(['h-11', 'lg:h-10']))
    expect(buttonClass({ size: 'md', touchBelowLg: true }).split(' ')).not.toContain('h-10')
  })
})
