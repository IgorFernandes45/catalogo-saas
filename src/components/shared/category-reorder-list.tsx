"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical, LoaderCircle } from "lucide-react";

import { reorderCategoriesAction } from "@/app/painel/actions";
import { useNotify } from "@/components/shared/notify-provider";

type CategoryItem = {
  id: string;
  name: string;
  sortOrder: number;
};

export function CategoryReorderList({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const notify = useNotify();
  const [items, setItems] = useState(
    [...initialCategories].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [isPending, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(dropIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    setItems(next);
    dragIndex.current = null;
    setDragOverIndex(null);

    startTransition(async () => {
      const result = await reorderCategoriesAction(next.map((item) => item.id));
      if (result.status === "error") {
        notify({ tone: "error", title: "Erro ao salvar ordem", message: result.message });
        setItems([...initialCategories].sort((a, b) => a.sortOrder - b.sortOrder));
      }
    });
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="mt-6 grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Arraste para reordenar</p>
        {isPending ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <LoaderCircle className="size-3.5 animate-spin" />
            Salvando ordem...
          </span>
        ) : null}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`flex cursor-grab items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition active:cursor-grabbing ${
            dragOverIndex === index
              ? "border-orange-400 bg-orange-50"
              : "border-slate-200"
          }`}
        >
          <GripVertical className="size-4 shrink-0 text-slate-400" />
          <span className="min-w-5 text-xs font-bold text-slate-400">{index + 1}</span>
          <span className="flex-1">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
