import { useCallback } from 'react'
import { navigate } from '../../router'
import { useScan } from '../../state/store'

/** Load the clearly labelled demo scan, then open an app route (default: the overview). */
export function useOpenDemo(to = '/overview') {
  const { loadDemo } = useScan()
  return useCallback(() => {
    loadDemo()
    navigate(to)
  }, [loadDemo, to])
}
