"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Image } from "lucide-react";
import { cn } from "@/lib/cn";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    setDragCount(0);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
    setDragCount(e.dataTransfer.items.length);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => { setDragging(false); setDragCount(0); }}
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
        multiple
        accept=".csv,.txt,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
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
          {dragging
            ? dragCount > 1
              ? `Relâchez ${dragCount} fichiers`
              : "Relâchez pour analyser"
            : "Déposez vos relevés bancaires"}
        </p>
        <p className="text-xs text-ink-ghost">
          ou cliquez pour sélectionner un ou plusieurs fichiers
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-ink-ghost">
        <span className="flex items-center gap-1"><FileText size={11} /> CSV · Excel · PDF</span>
        <span className="opacity-40">·</span>
        <span className="flex items-center gap-1">
          {/* eslint-disable-next-line jsx-a11y/alt-text -- lucide-react icon, not next/image; has no alt prop */}
          <Image size={11} /> Capture d'écran PNG/JPG
        </span>
      </div>
    </div>
  );
}
