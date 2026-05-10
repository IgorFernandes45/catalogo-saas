"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud, X } from "lucide-react";

import { useNotify } from "@/components/shared/notify-provider";

type UploadPurpose = "product" | "category" | "store-logo" | "store-banner";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  purpose: UploadPurpose;
  initialUrl?: string | null;
  helpText?: string;
  previewAspect?: "square" | "wide";
};

export function ImageUploadField({
  name,
  label,
  purpose,
  initialUrl = "",
  helpText,
  previewAspect = "square",
}: ImageUploadFieldProps) {
  const notify = useNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
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
        throw new Error(payload.error || "Nao foi possivel enviar a imagem.");
      }

      setValue(payload.url);
      notify({
        tone: "success",
        title: "Imagem enviada",
        message: "Upload concluido no Cloudinary.",
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Falha no upload",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel enviar a imagem agora.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const previewHeightClass =
    previewAspect === "wide" ? "h-40 sm:h-48" : "h-40 sm:h-44";

  return (
    <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            {helpText || "Envie uma foto. O arquivo sera preparado automaticamente."}
          </p>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
          >
            <X className="size-3.5" />
            Limpar
          </button>
        ) : null}
      </div>

      <div
        className={`overflow-hidden rounded-[24px] border border-dashed border-slate-300 bg-white ${previewHeightClass}`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-full w-full object-cover" />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-slate-500">
            <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <ImagePlus className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Sem imagem enviada</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                A loja pode trocar essa imagem a qualquer momento.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto,1fr] sm:items-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          {isUploading ? "Enviando..." : "Enviar arquivo"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] || null;
            void handleFileChange(file);
          }}
        />

        <p className="text-xs leading-5 text-slate-500">
          A imagem fica salva com seguranca e aparece no catalogo automaticamente.
        </p>
      </div>

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
