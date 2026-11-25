import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import { newListId, useAnchoredList } from './anchoredList'
import './select.css'

/*
 * The app's one dropdown (owner, 2026-11-17: a native list opened white on a dark page). A select-only combobox as
 * the ARIA practices describe it: the focus stays on the control, the list follows it with `aria-activedescendant`.
 * Arrow keys, Home and End, Page Up and Down, typing a name, Enter or Space to choose, Escape to close; a click
 * outside closes it too. The list is drawn in the page's top layer — over the body, or over the open dialog it was
 * opened from — fixed to the control, so no card, chart or scrolling box can cut it, and it turns upwards where there
 * is no room below. It holds what a native <select> held: the value, the choices, disabled choices and their groups.
 */

export interface SelectOption {
  value: string
  label: string
  /** Shorter text for the closed control, where the list's label is long. */
  display?: string
  disabled?: boolean
  /** The heading the option sits under; the options of one group follow each other. */
  group?: string
}

interface SelectProps {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  /** The control's name, for a screen reader (and the list's). */
  label: string
  disabled?: boolean
  /** «field»: a control of its own; «bare»: one of several inside a `dd-group` box. */
  variant?: 'field' | 'bare'
  icon?: LucideIcon
  /** A muted name inside the control, before the value: «Növ:». */
  prefix?: string
  /** What the closed control shows when the value is none of the options. */
  placeholder?: string
  title?: string
  id?: string
  className?: string
}

export function Select({
  value, options, onChange, label, disabled = false, variant = 'field', icon: Icon, prefix, placeholder = '—', title, id, className = '',
}: SelectProps) {
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const base = useRef('')
  if (!base.current) base.current = newListId('dd')
  const listId = `${base.current}-list`
  const optionId = (index: number) => `${base.current}-o${index}`

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const typed = useRef({ text: '', at: 0 })

  const selected = options.findIndex((option) => option.value === value)
  const current = selected >= 0 ? options[selected] : null
  const usable = (index: number) => index >= 0 && index < options.length && !options[index].disabled
  /** The next choice that can be chosen, `by` steps on (or as far as there is one); `from` itself when none. */
  const move = (from: number, by: number) => {
    const way = Math.sign(by) || 1
    let found = from
    let left = Math.abs(by)
    for (let index = from + way; index >= 0 && index < options.length && left > 0; index += way) {
      if (!options[index].disabled) { found = index; left-- }
    }
    return found
  }
  const first = () => move(-1, 1)
  const last = () => move(options.length, -1)

  function show(at?: number) {
    if (disabled || !trigger.current) return
    setActive(at !== undefined && usable(at) ? at : usable(selected) ? selected : first())
    setOpen(true)
  }
  function hide() {
    setOpen(false)
  }
  function choose(index: number) {
    if (!usable(index)) return
    hide()
    if (options[index].value !== value) onChange(options[index].value)
  }

  /** Typing a name moves to the next choice that starts with it; a pause starts a new name. */
  function match(key: string) {
    const now = Date.now()
    const text = now - typed.current.at > 700 ? key : typed.current.text + key
    typed.current = { text, at: now }
    const wanted = text.toLocaleLowerCase('az')
    const start = text.length === 1 ? active + 1 : Math.max(active, 0)
    for (let step = 0; step < options.length; step++) {
      const index = (start + step) % options.length
      if (usable(index) && options[index].label.toLocaleLowerCase('az').startsWith(wanted)) return index
    }
    return -1
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event
    const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        show()
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault()
        show(key === 'Home' ? first() : last())
      } else if (printable) {
        event.preventDefault()
        const found = match(key)
        show(found >= 0 ? found : undefined)
      }
      return
    }
    switch (key) {
      case 'ArrowDown': event.preventDefault(); setActive((at) => move(at, 1)); return
      case 'ArrowUp':
        event.preventDefault()
        if (event.altKey) choose(active)
        else setActive((at) => move(at, -1))
        return
      case 'PageDown': event.preventDefault(); setActive((at) => move(at, 10)); return
      case 'PageUp': event.preventDefault(); setActive((at) => move(at, -10)); return
      case 'Home': event.preventDefault(); setActive(first()); return
      case 'End': event.preventDefault(); setActive(last()); return
      case 'Enter': event.preventDefault(); choose(active); return
      case ' ':
        event.preventDefault()
        // A space inside a name being typed is part of the name.
        if (Date.now() - typed.current.at < 700 && typed.current.text) {
          const found = match(' ')
          if (found >= 0) setActive(found)
        } else choose(active)
        return
      // Closes the list only: not the dialog or the menu around it.
      case 'Escape': event.preventDefault(); event.stopPropagation(); hide(); return
      case 'Tab': hide(); return
    }
    if (printable) {
      event.preventDefault()
      const found = match(key)
      if (found >= 0) setActive(found)
    }
  }

  const { host, placed, style } = useAnchoredList(open, trigger, list, () => hide())

  // The active choice stays in sight as the keys move it.
  useEffect(() => {
    if (open && placed && active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
  }, [open, placed, active]) // eslint-disable-line react-hooks/exhaustive-deps

  // A control that turns disabled while open closes its list.
  useEffect(() => { if (disabled) hide() }, [disabled])

  const shown = current ? current.display ?? current.label : placeholder
  const menu = open && host && createPortal(
    <div
      ref={list}
      id={listId}
      role="listbox"
      aria-label={label}
      className="dd-menu"
      data-measuring={placed ? undefined : ''}
      style={style}
      // The focus stays on the control while the mouse chooses.
      onMouseDown={(event) => event.preventDefault()}
    >
      {groupsOf(options).map((run) => {
        const items = run.indexes.map((index) => {
          const option = options[index]
          const isSelected = index === selected
          return (
            <div
              key={`${option.value}-${index}`}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              data-value={option.value}
              data-active={index === active && !option.disabled ? '' : undefined}
              className="dd-option"
              onMouseMove={() => { if (!option.disabled && index !== active) setActive(index) }}
              onClick={() => choose(index)}
            >
              <span className="dd-option-label">{option.label}</span>
              <Check aria-hidden="true" strokeWidth={2.6} className="dd-check" data-hidden={isSelected ? undefined : ''} />
            </div>
          )
        })
        if (!run.group) return items
        const heading = `${base.current}-g${run.indexes[0]}`
        return (
          <div key={heading} role="group" aria-labelledby={heading} className="flex flex-col gap-0.5">
            <div id={heading} role="presentation" className="dd-heading">{run.group}</div>
            {items}
          </div>
        )
      })}
    </div>,
    host,
  )

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        disabled={disabled}
        title={title}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        // A Space released on the control must not click it again after the keys above have handled it.
        onKeyUp={(event) => { if (event.key === ' ') event.preventDefault() }}
        className={`dd-trigger ${variant === 'bare' ? 'dd-trigger--bare' : ''} ${className}`}
      >
        {Icon && <Icon aria-hidden="true" className="dd-icon" strokeWidth={2} />}
        {prefix && <span className="dd-prefix">{prefix}</span>}
        <span className="dd-value">{shown}</span>
        <ChevronDown aria-hidden="true" className="dd-chevron" strokeWidth={2.2} />
      </button>
      {menu}
    </>
  )
}

/** The options in runs of one group, in their own order: a run without a group stands on its own. */
function groupsOf(options: readonly SelectOption[]) {
  const runs: { group?: string; indexes: number[] }[] = []
  options.forEach((option, index) => {
    const run = runs.at(-1)
    if (run && run.group === option.group) run.indexes.push(index)
    else runs.push({ group: option.group, indexes: [index] })
  })
  return runs
}
