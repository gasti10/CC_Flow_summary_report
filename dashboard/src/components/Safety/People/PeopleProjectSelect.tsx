import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface PeopleProjectSelectProps {
  options: string[]
  value: string
  disabled?: boolean
  id: string
  ariaLabel: string
  placeholder?: string
  className?: string
  onChange: (value: string) => void
}

const MAX_VISIBLE_OPTIONS = 12
const LIST_GAP_PX = 4
const VIEWPORT_PADDING_PX = 8
const MAX_LIST_HEIGHT_PX = 220
const MIN_LIST_HEIGHT_PX = 120

type ListPlacement = 'above' | 'below'

interface ListLayout {
  placement: ListPlacement
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

function computeListLayout(anchor: DOMRect): ListLayout {
  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PADDING_PX
  const spaceAbove = anchor.top - VIEWPORT_PADDING_PX
  const placement: ListPlacement = spaceBelow < MIN_LIST_HEIGHT_PX && spaceAbove > spaceBelow
    ? 'above'
    : 'below'
  const availableSpace = placement === 'above' ? spaceAbove : spaceBelow
  const maxHeight = Math.min(
    MAX_LIST_HEIGHT_PX,
    Math.max(MIN_LIST_HEIGHT_PX, availableSpace - LIST_GAP_PX)
  )

  if (placement === 'above') {
    return {
      placement,
      left: anchor.left,
      width: anchor.width,
      maxHeight,
      bottom: window.innerHeight - anchor.top + LIST_GAP_PX
    }
  }

  return {
    placement,
    left: anchor.left,
    width: anchor.width,
    maxHeight,
    top: anchor.bottom + LIST_GAP_PX
  }
}

export default function PeopleProjectSelect({
  options,
  value,
  disabled = false,
  id,
  ariaLabel,
  placeholder: placeholderProp,
  className,
  onChange
}: PeopleProjectSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [listLayout, setListLayout] = useState<ListLayout | null>(null)

  const isDisabled = disabled || options.length === 0
  const placeholder = options.length === 0
    ? 'No projects available'
    : (placeholderProp ?? 'Search or select project…')

  const updateListLayout = useCallback(() => {
    const anchor = inputRef.current?.getBoundingClientRect()
    if (!anchor) return
    setListLayout(computeListLayout(anchor))
  }, [])

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? options.filter((name) => name.toLowerCase().includes(q))
      : options
    return list.slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, query])

  useEffect(() => {
    if (!isOpen) {
      setListLayout(null)
      return
    }

    updateListLayout()

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return
      setIsOpen(false)
      setQuery(value)
    }

    function handleReposition() {
      updateListLayout()
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [isOpen, updateListLayout, value])

  const inputValue = isOpen ? query : value

  function openList() {
    if (isDisabled) return
    setIsOpen(true)
    setQuery(value)
  }

  function selectOption(projectName: string) {
    onChange(projectName)
    setQuery('')
    setIsOpen(false)
  }

  const listStyle: CSSProperties | undefined = listLayout
    ? {
        left: listLayout.left,
        width: listLayout.width,
        maxHeight: listLayout.maxHeight,
        ...(listLayout.placement === 'above'
          ? { bottom: listLayout.bottom }
          : { top: listLayout.top })
      }
    : undefined

  const listNode = isOpen && listLayout ? (
    <ul
      ref={listRef}
      id={listId}
      className={`safety-people-project-combobox-list safety-people-project-combobox-list--portal${listLayout.placement === 'above' ? ' is-above' : ''}`}
      style={listStyle}
      role="listbox"
      aria-label="Projects"
    >
      {filteredOptions.length === 0 ? (
        <li className="safety-people-project-combobox-empty safety-muted" role="presentation">
          No projects match your search.
        </li>
      ) : (
        filteredOptions.map((projectName) => (
          <li key={projectName} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === projectName}
              className={`safety-people-project-combobox-option${value === projectName ? ' is-selected' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(projectName)}
            >
              {projectName}
            </button>
          </li>
        ))
      )}
    </ul>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`safety-people-project-combobox${isOpen ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <input
        ref={inputRef}
        id={id}
        className="safety-input safety-people-project-combobox-input"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={inputValue}
        placeholder={placeholder}
        disabled={isDisabled}
        autoComplete="off"
        onFocus={openList}
        onChange={(event) => {
          const next = event.target.value
          setQuery(next)
          setIsOpen(true)
          if (!next.trim()) onChange('')
        }}
      />
      {listNode ? createPortal(listNode, document.body) : null}
    </div>
  )
}
