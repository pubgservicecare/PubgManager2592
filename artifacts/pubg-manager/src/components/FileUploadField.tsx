import { useState, useRef } from "react";
import { Upload, Check, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

interface Props {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (objectPath: string | null) => void;
  accept?: string;
  preview?: boolean;
}

export function FileUploadField({ label, hint, value, onChange, accept = "image/*", preview = true }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress, error } = useUpload({
    onSuccess: (resp) => {
      onChange(resp.objectPath);
    },
  });

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    await uploadFile(file);
  };

  const onChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clear = () => {
    setPreviewUrl(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-muted-foreground uppercase block">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChangeInput}
        className="hidden"
      />
      {previewUrl && preview ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-border bg-secondary/30">
          <img src={previewUrl} alt={label} className="w-full max-h-56 object-contain" />
          <div className="absolute top-2 right-2 flex gap-2">
            {value && !isUploading && (
              <span className="bg-emerald-500/90 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Uploaded
              </span>
            )}
            {isUploading && (
              <span className="bg-amber-500/90 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {progress}%
              </span>
            )}
            <button
              type="button"
              onClick={clear}
              className="bg-destructive/90 text-white p-1.5 rounded-full hover:bg-destructive"
              aria-label="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 left-2 bg-background/80 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-background"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-border hover:border-primary rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-white hover:bg-secondary/30 transition-all disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-semibold">Uploading {progress}%</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-bold">Tap to upload</span>
              <span className="text-xs">JPG, PNG &middot; max 10MB</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs text-destructive font-semibold">{error.message}</p>}
    </div>
  );
}
