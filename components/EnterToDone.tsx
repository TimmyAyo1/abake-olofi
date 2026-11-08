"use client";

import { useEffect } from "react";

/**
 * On a phone or tablet, the keyboard's Return / Go key normally submits the whole form.
 * In the app it just closes the keyboard instead, so an order is only saved by tapping Save.
 * (Text boxes with several lines still get a new line.)
 */
export function EnterToDone() {
  useEffect(() => {
    const isField = (el: EventTarget | null): el is HTMLInputElement =>
      el instanceof HTMLInputElement && !["checkbox", "radio", "submit", "button", "file", "hidden"].includes(el.type);

    function onFocus(e: FocusEvent) {
      if (isField(e.target) && !e.target.hasAttribute("enterkeyhint")) e.target.setAttribute("enterkeyhint", "done");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.isComposing || !isField(e.target) || !e.target.form) return;
      e.preventDefault();
      e.target.blur();
    }
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
