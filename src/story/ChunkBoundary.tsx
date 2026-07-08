import { Component, type ReactNode } from 'react'

/**
 * Safety net for the code-split islands (canvas world, Work panel). A failed
 * chunk fetch — flaky network, or a stale tab requesting an old hashed chunk
 * after a redeploy — rejects the React.lazy import, and without a boundary
 * React unmounts the ENTIRE root: blank site. The canvas is decorative and
 * the DOM story must keep standing, so the boundary swallows the failure and
 * renders the fallback instead. (Class component — error boundaries have no
 * hook equivalent.)
 */
export class ChunkBoundary extends Component<
  { fallback?: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
