"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { AttachmentItem, formatBytes, readValidatedAttachment } from "@/utils/legalData";
import { toast } from "sonner";

interface DocumentDropzoneProps {
  attachments: AttachmentItem[];
  onChange: (next: AttachmentItem[]) => void;
  maxFiles?: number;
  compact?: boolean;
}

export default function DocumentDropzone({
  attachments,
  onChange,
  maxFiles = 3,
  compact = false
}: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remaining = maxFiles - attachments.length;
    if (remaining <= 0) {
      toast.error(`Maximum of ${maxFiles} document attachments allowed.`);
      return;
    }

    const candidates = Array.from(fileList).slice(0, remaining);
    const nextList = [...attachments];

    for (const file of candidates) {
      try {
        const processed = await readValidatedAttachment(file);
        nextList.push(processed);
      } catch (err: any) {
        toast.error(err.message || "Invalid file attachment");
      }
    }

    onChange(nextList);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    onChange(attachments.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-sm cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
          compact ? "p-4" : "p-6"
        } ${
          isDragging
            ? "border-black bg-neutral-100"
            : "border-neutral-300 bg-neutral-50 hover:border-black hover:bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="w-9 h-9 bg-white border border-neutral-200 rounded-full flex items-center justify-center mb-2 shadow-sm">
          <UploadCloud className="w-4 h-4 text-black" />
        </div>
        <p className="text-xs font-bold text-neutral-900">
          Drop supporting documents here or <span className="underline">browse files</span>
        </p>
        <p className="text-[11px] text-neutral-500 mt-1">
          Optional: PDF, PNG, JPG or WEBP up to 2MB each (max {maxFiles} files) — contracts, notices, or photos
        </p>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, idx) => {
            const isPdf = file.mimeType === "application/pdf";
            return (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 p-2.5 bg-white border border-neutral-200 rounded-sm shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isPdf ? (
                    <div className="w-9 h-9 bg-red-50 border border-red-100 text-red-700 flex items-center justify-center rounded-sm shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-neutral-100 border border-neutral-200 overflow-hidden rounded-sm shrink-0 flex items-center justify-center">
                      {file.dataUrl ? (
                        <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-neutral-600" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{file.name}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                      {isPdf ? "PDF Document" : "Image"} · {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  aria-label={`Remove ${file.name}`}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {attachments.length === maxFiles && (
        <p className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          Upload limit ({maxFiles} files) reached. Remove a file to add another.
        </p>
      )}
    </div>
  );
}

