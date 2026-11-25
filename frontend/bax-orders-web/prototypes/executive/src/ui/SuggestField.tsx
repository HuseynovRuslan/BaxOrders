import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { newListId, useAnchoredList } from './anchoredList'
import './select.css'

/*
 * A field the owner types into, with the values already in use offered under it (owner, 2026-11-18: the browser's own
 * suggestion list opened white on a dark dialog). Anything may be typed — a unit no order has used yet among them; the
 * list only helps. A combobox with list autocomplete, as the ARIA practices describe it: typing narrows the list, the
 * arrow keys walk it while the text keeps the focus, Enter takes the highlighted value (and only then: with nothing
 * highlighted, Enter is the form's), Escape closes the list and leaves the dialog open. The chevron, or Down, shows every
 * value. The list is the app's dropdown list (select.css), placed as the dropdown's is (anchoredList).
 */

export function SuggestField({ value, onChange, suggestions, label, required = false, disabled = false, placeholder, className = '' }: {
  value: string
  onChange: (value: string) => void
  /** The values offered, each once, in the order to show them. */
  suggestions: readonly string[]
  /** The field's name, for a screen reader (and the list's). */
  label: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const field = useRef<HTMLSpanElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const base = useRef('')
  if (!base.current) base.current = newListId('sf')
  const listId = `${base.current}-list`
  const optionId = (index: number) => `${base.current}-o${index}`

  // «all»: opened from the chevron or Down — every value; otherwise those containing what is typed.
  const [open, setOpen] = useState<false | 'typed' | 'all'>(false)
  const [active, setActive] = useState(-1)

  const fold = (text: string) => text.trim().toLocaleLowerCase('az')
  const needle = fold(value)
  const shown = open === 'all' || !needle ? suggestions : suggestions.filter((item) => fold(item).includes(needle))
  const current = shown.findIndex((item) => fold(item) === needle)
  const expanded = open !== false && shown.length > 0

  function show(how: 'typed' | 'all', at = -1) {
    if (disabled) return
    setOpen(how)
    setActive(at)
  }
  function hide() {
    setOpen(false)
    setActive(-1)
  }
  function choose(index: number) {
    const picked = shown[index]
    if (picked === undefined) return
    hide()
    if (picked !== value) onChange(picked)
    input.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!expanded) {
          const all = suggestions.findIndex((item) => fold(item) === needle)
          show('all', all >= 0 ? all : 0)
        } else setActive((at) => Math.min(shown.length - 1, at + 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        if (!expanded) show('all', suggestions.length - 1)
        else setActive((at) => (at <= 0 ? 0 : at - 1))
        return
      case 'Enter':
        // Only a highlighted value is taken; otherwise Enter belongs to the form.
        if (expanded && active >= 0) {
          event.preventDefault()
          choose(active)
        }
        return
      case 'Escape':
        if (expanded) {
          // Closes the list only: not the dialog around it.
          event.preventDefault()
          event.stopPropagation()
          hide()
        }
        return
      case 'Tab':
        hide()
    }
  }

  const { host, placed, style } = useAnchoredList(expanded, field, list, hide)

  // The highlighted value stays in sight as the keys move it.
  useEffect(() => {
    if (expanded && placed && active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
  }, [expanded, placed, active]) // eslint-disable-line react-hooks/exhaustive-deps

  const menu = expanded && host && createPortal(
    <div
      ref={list}
      id={listId}
      role="listbox"
      aria-label={label}
      className="dd-menu"
      data-measuring={placed ? undefined : ''}
      style={style}
      // The focus stays in the field while the mouse chooses.
      onMouseDown={(event) => event.preventDefault()}
    >
      {shown.map((item, index) => {
        const isCurrent = index === current
        return (
          <div
            key={item}
            id={optionId(index)}
            role="option"
            aria-selected={isCurrent}
            data-active={index === active ? '' : undefined}
            className="dd-option"
            onMouseMove={() => { if (index !== active) setActive(index) }}
            onClick={() => choose(index)}
          >
            <span className="dd-option-label">{item}</span>
            <Check aria-hidden="true" strokeWidth={2.6} className="dd-check" data-hidden={isCurrent ? undefined : ''} />
          </div>
        )
      })}
    </div>,
    host,
  )

  return (
    <>
      <span ref={field} className={`dd-field pr-1 ${disabled ? 'is-disabled' : ''} ${className}`}>
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => { onChange(event.target.value); show('typed') }}
          onKeyDown={onKeyDown}
          className="dd-field-input"
        />
        {/* For the mouse: the keys have Down. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          onClick={() => {
            if (expanded) hide()
            else {
              const at = suggestions.findIndex((item) => fold(item) === needle)
              show('all', at)
            }
            input.current?.focus()
          }}
          className="dd-field-toggle"
        >
          <ChevronDown strokeWidth={2.2} className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </span>
      {menu}
    </>
  )
}
