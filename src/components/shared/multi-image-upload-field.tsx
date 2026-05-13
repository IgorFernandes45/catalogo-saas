"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud, X } from "lucide-react";

import { useNotify } from "@/components/shared/notify-provider";

type UploadPurpose = "product";

type MultiImageUploadFieldProps = {
  name: string;
  label: string;
  purpose: UploadPurpose;
  initialUrls?: string[];
  helpText?: string;
  maxItems?: number;
};

function sanitizeUrls(input: string[]) {
  const seen = new Set<string>();

  return input
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });
}

export function MultiImageUploadField({
  name,
  label,
  purpose,
  initialUrls = [],
  helpText,
  maxItems = 6,
}: MultiImageUploadFieldProps) {
  const notify = useNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState(() => sanitizeUrls(initialUrls).slice(0, maxItems));
  const [isUploading, setIsUploading] = useState(false);

  function syncUrls(nextUrls: string[]) {
    const sanitized = sanitizeUrls(nextUrls).slice(0, maxItems);
    setUrls(sanitized);
  }

  async function uploadSingleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("purpose", purpose);

    const response = await fetch("/api/store/uploads", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      url?: string;
      error?: string;
    };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Não foi possível enviar a imagem.");
    }

    return payload.url;
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const availableSlots = Math.max(0, maxItems - urls.length);

    if (!availableSlots) {
      notify({
        tone: "error",
        title: "Galeria cheia",
        message: `A galeria aceita no máximo ${maxItems} imagens.`,
      });
      return;
    }

    const selectedFiles = [...files].slice(0, availableSlots);
    setIsUploading(true);

    try {
      const uploadedUrls = await Promise.all(selectedFiles.map(uploadSingleFile));
      syncUrls([...urls, ...uploadedUrls]);
      notify({
        tone: "success",
        title: "Galeria atualizada",
        message: `${uploadedUrls.length} imagem(ns) enviada(s) para o Cloudinary.`,
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Falha no upload",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar as imagens agora.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            {helpText || "Adicione uma foto por vez e continue se quiser mostrar mais detalhes."}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {urls.length}/{maxItems}
        </span>
      </div>

      {urls.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {urls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${label} ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => syncUrls(urls.filter((_, itemIndex) => itemIndex !== index))}
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-slate-950/72 text-white backdrop-blur"
                aria-label={`Remover imagem ${index + 1}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-slate-300 bg-white px-4 text-center text-slate-500">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <ImagePlus className="size-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Adicione a primeira foto</p>
        </div>
      )}

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || urls.length >= maxItems}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          {isUploading
            ? "Enviando..."
            : urls.length
              ? "Adicionar outra foto"
              : "Adicionar foto"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.currentTarget.files);
          }}
        />

        <p className="text-xs leading-5 text-slate-500">
          As fotos são enviadas e ficam organizadas automaticamente para o catálogo.
        </p>
      </div>

      <input type="hidden" name={name} value={urls.join("\n")} />
    </div>
  );
}
