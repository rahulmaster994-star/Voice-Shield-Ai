"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, Lock } from "lucide-react";

export default function SecurityShield() {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;

    const triggerWarning = (reason: string) => {
      setWarningMessage(reason);
      setWarningCount((c) => c + 1);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWarningMessage(null);
      }, 3500);
    };

    // 1. Block Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerWarning("Right-click context menu and source inspection are restricted by Cyber Defense Protocol.");
      return false;
    };

    // 2. Block DevTools & Source View Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toUpperCase() : "";
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // F12 -> DevTools
      if (key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning("Developer Tools (F12) access is restricted.");
        return false;
      }

      // Ctrl+Shift+I / Cmd+Opt+I -> Inspect Element
      // Ctrl+Shift+J / Cmd+Opt+J -> Console
      // Ctrl+Shift+C / Cmd+Opt+C -> Element Selector
      // Ctrl+Shift+K / Cmd+Opt+K -> Firefox Web Console
      if (
        (isCtrlOrMeta && isShift && (key === "I" || key === "J" || key === "C" || key === "K")) ||
        (isCtrlOrMeta && isAlt && (key === "I" || key === "J" || key === "C"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning("Developer Inspection shortcut is disabled for security.");
        return false;
      }

      // Ctrl+U / Cmd+U -> View Page Source
      if (isCtrlOrMeta && key === "U") {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning("Page source inspection (Ctrl+U) is restricted.");
        return false;
      }

      // Ctrl+S / Cmd+S -> Save Page HTML
      if (isCtrlOrMeta && key === "S") {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning("Saving offline source copies (Ctrl+S) is disabled.");
        return false;
      }
    };

    // 3. Clear and sanitize console logs in production
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      const banner = () => {
        try {
          console.clear();
          console.log(
            "%c🔒 VAANISHIELD CYBER DEFENSE: Source inspection & reverse engineering are actively monitored and prohibited under SIH26104 Security Protocol.",
            "color: #00e5ff; font-weight: bold; font-size: 14px; background: #050811; padding: 8px 12px; border: 1px solid #00e5ff; border-radius: 4px;"
          );
        } catch {
          // ignore
        }
      };
      banner();
    }

    // 4. Subtle Anti-debugging heartbeat
    const debuggerInterval = setInterval(() => {
      const startTime = performance.now();
      // eslint-disable-next-line no-eval
      try {
        const noop = new Function("debugger");
        noop();
      } catch {
        // ignore
      }
      const executionTime = performance.now() - startTime;
      if (executionTime > 100) {
        triggerWarning("Active debugger detected. Cyber Defense monitoring engaged.");
      }
    }, 2500);

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      clearInterval(debuggerInterval);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!warningMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-bounce-in">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#070b18]/95 border border-red-500/50 shadow-2xl shadow-red-500/20 backdrop-blur-xl text-white">
        <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 inline" /> Security Defense Alert
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
              BLOCK #{warningCount}
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            {warningMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
