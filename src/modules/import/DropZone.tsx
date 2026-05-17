"use client";

import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/cn";

interface DropZoneProps {
  onFile: (file: File) => void;
}

export function DropZone({ onFile }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors select-none",
        dragging
          ? "border-accent bg-accent-soft"
          : "border-border hover:border-border-strong hover:bg-surface-overlay"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls,.pdf"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
        dragging ? "bg-accent/20" : "bg-surface-overlay"
      )}>
        {dragging
          ? <FileText size={22} className="text-accent" />
          : <Upload size={22} className="text-ink-ghost" />}
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-ink">
          {dragging ? "Relâchez pour analyser" : "Déposez votre relevé bancaire"}
        </p>
        <p className="text-xs text-ink-ghost">ou cliquez pour sélectionner un fichier</p>
      </div>
      <p className="text-xs text-ink-ghost text-center">
        CSV · Excel (.xlsx) · PDF — BNP Paribas · Société Générale · Crédit Agricole · LCL
      </p>
    </div>
  );
}
