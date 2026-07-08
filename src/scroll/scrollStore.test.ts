import { describe, expect, it, vi } from 'vitest'
import { registerScrollLock, setScrollLocked } from './scrollStore'

/**
 * The scroll gate COUNTS its holders (preloader + modal dialogs can overlap):
 * each holder balances its own acquire/release, and the driver only hears
 * about edges (unlocked→locked, locked→unlocked). Tests share the module
 * singleton, so every test leaves the count back at zero.
 */
describe('scroll lock (counting gate)', () => {
  it('replays the current state to a newly registered driver', () => {
    const driver = vi.fn()
    registerScrollLock(driver)
    expect(driver).toHaveBeenCalledWith(false)
    registerScrollLock(null)
  })

  it('locks on first acquire, releases on last, edges only', () => {
    const driver = vi.fn()
    registerScrollLock(driver)
    driver.mockClear()

    setScrollLocked(true)
    expect(driver).toHaveBeenLastCalledWith(true)
    setScrollLocked(false)
    expect(driver).toHaveBeenLastCalledWith(false)
    expect(driver).toHaveBeenCalledTimes(2)
    registerScrollLock(null)
  })

  it('overlapping holders cannot steal each other’s lock', () => {
    const driver = vi.fn()
    registerScrollLock(driver)
    driver.mockClear()

    setScrollLocked(true) // preloader
    setScrollLocked(true) // dialog opens on top
    setScrollLocked(false) // preloader finishes — dialog still holds
    expect(driver).toHaveBeenCalledTimes(1)
    expect(driver).toHaveBeenLastCalledWith(true)

    setScrollLocked(false) // dialog closes — now truly unlocked
    expect(driver).toHaveBeenLastCalledWith(false)
    registerScrollLock(null)
  })

  it('an unbalanced release floors at zero and the next acquire still locks', () => {
    const driver = vi.fn()
    registerScrollLock(driver)
    driver.mockClear()

    setScrollLocked(false) // stray release — must not go negative
    expect(driver).not.toHaveBeenCalled()

    setScrollLocked(true)
    expect(driver).toHaveBeenLastCalledWith(true)
    setScrollLocked(false)
    expect(driver).toHaveBeenLastCalledWith(false)
    registerScrollLock(null)
  })
})
