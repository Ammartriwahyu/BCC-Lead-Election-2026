'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Spec 4.4: leaving a filled candidate form asks first ("Discard this candidate?").
 * Covers in-app links (sidebar, breadcrumb, Back), buttons that call `requestLeave`, and closing
 * or reloading the tab (the browser's own prompt).
 */
export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const allowed = useRef(false);

  useEffect(() => {
    if (!dirty) return undefined;
    const onClick = (event: MouseEvent) => {
      if (allowed.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname)
        return;
      // Capture phase on the document runs before Next's <Link> handler on the React root.
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}`);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!allowed.current) event.preventDefault();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);

  /** Navigate now, or ask first when there are unsaved changes. */
  const requestLeave = useCallback(
    (href: string) => {
      if (dirty && !allowed.current) setPendingHref(href);
      else router.push(href);
    },
    [dirty, router],
  );

  /** Saved or deleted: the next navigation needs no question. */
  const allowLeave = useCallback(() => {
    allowed.current = true;
  }, []);

  const confirmLeave = useCallback(() => {
    if (!pendingHref) return;
    allowed.current = true;
    setPendingHref(null);
    router.push(pendingHref);
  }, [pendingHref, router]);

  const cancelLeave = useCallback(() => {
    setPendingHref(null);
  }, []);

  return { pendingHref, requestLeave, allowLeave, confirmLeave, cancelLeave };
}
