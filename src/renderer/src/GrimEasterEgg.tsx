import { useEffect, useRef, useState } from "react";

const CODE = "grim666";

export function GrimEasterEgg() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let buffer = "";

    const reveal = () => {
      setVisible(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        timeoutRef.current = null;
      }, 3_500);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.matches("input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key.length !== 1) return;
      buffer = (buffer + event.key.toLowerCase()).slice(-CODE.length);
      if (buffer === CODE) {
        buffer = "";
        reveal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="grim-easter-egg" role="status">
      <span>THIS IS A PRODUCT DESIGN BY GRIM</span>
      <strong>666</strong>
    </div>
  );
}
