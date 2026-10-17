import type { HotkeyBinding } from '@shared/types'

const KEY_LABELS: Record<string, string> = {
  SPACE: 'Space',
  RETURN: 'Enter',
  ESCAPE: 'Esc',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  'UP ARROW': 'Up',
  'DOWN ARROW': 'Down',
  'LEFT ARROW': 'Left',
  'RIGHT ARROW': 'Right',
  'PAGE UP': 'Page Up',
  'PAGE DOWN': 'Page Down',
  'CAPS LOCK': 'Caps Lock',
  'FORWARD SLASH': '/',
  BACKSLASH: '\\',
  'SQUARE BRACKET OPEN': '[',
  'SQUARE BRACKET CLOSE': ']',
  SEMICOLON: ';',
  QUOTE: "'",
  COMMA: ',',
  DOT: '.',
  EQUALS: '=',
  MINUS: '-',
  BACKTICK: '`'
}

function formatKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key]
  if (/^F\d{1,2}$/.test(key)) return key
  if (key.length === 1) return key.toUpperCase()
  return key
    .split(' ')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

export function formatBinding(binding: HotkeyBinding): string {
  const parts: string[] = []
  if (binding.ctrl) parts.push('Ctrl')
  if (binding.shift) parts.push('Shift')
  if (binding.alt) parts.push('Alt')
  if (binding.meta) parts.push('Win')
  parts.push(formatKey(binding.key))
  return parts.join(' + ')
}

export function hasModifier(binding: HotkeyBinding): boolean {
  return binding.ctrl || binding.alt || binding.shift || binding.meta
}
