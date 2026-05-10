"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
  frameClassName?: string;
  imageSizes: string;
  thumbnailSizes?: string;
  thumbnailClassName?: string;
  thumbnailsClassName?: string;
  imageClassName?: string;
  preloadFirst?: boolean;
  disableThumbnailSelection?: boolean;
};

export function ProductImageGallery({
  images,
  productName,
  frameClassName,
  imageSizes,
  thumbnailSizes = "72px",
  thumbnailClassName,
  thumbnailsClassName,
  imageClassName,
  preloadFirst = false,
  disableThumbnailSelection = false,
}: ProductImageGalleryProps) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = disableThumbnailSelection
    ? 0
    : safeImages[activeIndex]
      ? activeIndex
      : 0;
  const activeImage = safeImages[currentIndex] || safeImages[0] || "";

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-[30px] bg-slate-100",
          frameClassName,
        )}
      >
        {activeImage ? (
          <Image
            src={activeImage}
            alt={productName}
            fill
            sizes={imageSizes}
            preload={preloadFirst && currentIndex === 0}
            loading={currentIndex === 0 ? "eager" : "lazy"}
            fetchPriority={currentIndex === 0 ? "high" : "auto"}
            decoding="async"
            className={cn("object-cover", imageClassName)}
          />
        ) : null}

        {safeImages.length > 1 ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-slate-950/68 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
            {currentIndex + 1}/{safeImages.length}
          </div>
        ) : null}
      </div>

      {safeImages.length > 1 ? (
        <div
          className={cn(
            "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            thumbnailsClassName,
          )}
        >
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => {
                if (!disableThumbnailSelection) {
                  setActiveIndex(index);
                }
              }}
              disabled={disableThumbnailSelection}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-[20px] border bg-slate-100 transition",
                index === currentIndex
                  ? "border-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                  : "border-slate-200",
                disableThumbnailSelection
                  ? "cursor-not-allowed opacity-45"
                  : "",
                thumbnailClassName,
              )}
              aria-label={
                disableThumbnailSelection
                  ? `Imagem travada enquanto ${productName} esta sem estoque`
                  : `Ver imagem ${index + 1} de ${productName}`
              }
            >
              <Image
                src={image}
                alt={`${productName} ${index + 1}`}
                fill
                sizes={thumbnailSizes}
                loading="lazy"
                decoding="async"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
