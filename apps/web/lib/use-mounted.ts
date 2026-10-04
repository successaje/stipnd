"use client";

import * as React from "react";

const subscribe = () => () => {};

/**
 * False during server rendering and the first client paint, true afterwards. Lets
 * storage-dependent UI render the same neutral markup on both sides, which avoids
 * hydration mismatches without resorting to `typeof window` checks in render.
 */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
