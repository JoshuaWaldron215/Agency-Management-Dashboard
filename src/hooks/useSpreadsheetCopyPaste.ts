import { useEffect, useCallback } from "react";

interface CopyPasteConfig {
  onCopy?: () => string | null;
  onPaste?: (text: string) => void;
  isEnabled?: boolean;
}

export function useSpreadsheetCopyPaste({ onCopy, onPaste, isEnabled = true }: CopyPasteConfig) {
  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (!isEnabled || !onCopy) return;
    
    const text = onCopy();
    if (text) {
      e.preventDefault();
      e.clipboardData?.setData("text/plain", text);
    }
  }, [onCopy, isEnabled]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!isEnabled || !onPaste) return;
    
    const text = e.clipboardData?.getData("text/plain");
    if (text) {
      e.preventDefault();
      onPaste(text);
    }
  }, [onPaste, isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [handleCopy, handlePaste, isEnabled]);
}
