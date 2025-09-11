import { vi } from 'vitest'
import './mocks/audio.mock'

// Mock window.scrollTo
Element.prototype.scrollTo = vi.fn()
