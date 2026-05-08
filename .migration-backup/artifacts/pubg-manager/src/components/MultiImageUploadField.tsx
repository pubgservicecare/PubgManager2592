import { useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

interface Props {
  label?: string;
  hint?: string;
  values: string[];
  onChange: (paths: string[]) => void;
  max?: number;
}

function objectUrl(p: string) {
  return `/api/storage${p}`;
}

export function MultiImageUploadField({ label = "Images", hint, values, onChange, max = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress, error } = useUpload({
    onSuccess: (resp) => {
      onChange([...(values || []), resp.objectPath]);
    },
  });

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if ((values?.length || 0) >= max) break;
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is larger than 10MB`);
        continue;
      }
      await uploadFile(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (idx: number) => {
    const next = [...values];
    next.splice(idx, 1);
    onChange(next);
  };

  const remaining = max - (values?.length || 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-muted-foreground uppercase">{label}</label>
        <span className="text-xs text-muted-foreground">{values?.length || 0} / {max}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {values && values.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {values.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30 group">
              <img src={objectUrl(p)} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded">COVER</span>
              )}
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-border hover:border-primary rounded-xl p-4 flex flex-col items-center gap-2 text-muted-foreground hover:text-white hover:bg-secondary/30 transition-all disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-semibold">Uploading {progress}%</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-bold">Add image{remaining > 1 ? "s" : ""} ({remaining} remaining)</span>
              <span className="text-xs">JPG, PNG &middot; max 10MB each</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs text-destructive font-semibold">{error.message}</p>}
    </div>
  );
}

export function imageThumbUrl(p: string | undefined | null) {
  if (!p) return null;
  return objectUrl(p);
}
