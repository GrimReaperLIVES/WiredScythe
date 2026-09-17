import { useCallback, useEffect, useRef, useState } from "react";

export const STREAM_WINDOW_PREFIX = "wiredscythe-stream-";

function adoptStyles(target: Window): void {
  for (const node of document.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    target.document.head.append(node.cloneNode(true));
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (
          node instanceof HTMLStyleElement ||
          (node instanceof HTMLLinkElement && node.rel === "stylesheet")
        ) {
          target.document.head.append(node.cloneNode(true));
        }
      }
    }
  });
  observer.observe(document.head, { childList: true });
  target.addEventListener("pagehide", () => observer.disconnect());
}

export interface StreamWindows {
  targets: Map<number, Window>;
  open: (id: number, name: string) => void;
  close: (id: number) => void;
}

/** Keeps each popped stream in the same React tree while its DOM moves to a
 * separate, resizable native window. Closing that window docks it again. */
export function useStreamWindows(): StreamWindows {
  const [targets, setTargets] = useState<Map<number, Window>>(() => new Map());
  const targetsRef = useRef(targets);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  const open = useCallback((id: number, name: string) => {
    const current = targetsRef.current.get(id);
    if (current && !current.closed) {
      current.focus();
      return;
    }

    const opened = window.open(
      "",
      `${STREAM_WINDOW_PREFIX}${id}`,
      "width=960,height=540",
    );
    if (!opened) return;
    opened.document.title = `WiredScythe — ${name}`;
    opened.document.documentElement.className = "stream-window-root";
    opened.document.body.className = "stream-window-body";
    adoptStyles(opened);
    setTargets((previous) => new Map(previous).set(id, opened));
  }, []);

  const close = useCallback((id: number) => {
    const target = targetsRef.current.get(id);
    if (target && !target.closed) target.close();
    setTargets((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const poll = window.setInterval(() => {
      setTargets((previous) => {
        let changed = false;
        const next = new Map(previous);
        for (const [id, target] of next) {
          if (!target.closed) continue;
          next.delete(id);
          changed = true;
        }
        return changed ? next : previous;
      });
    }, 400);

    const closeAll = () => {
      for (const target of targetsRef.current.values()) {
        if (!target.closed) target.close();
      }
    };
    window.addEventListener("pagehide", closeAll);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("pagehide", closeAll);
      closeAll();
    };
  }, []);

  return { targets, open, close };
}
