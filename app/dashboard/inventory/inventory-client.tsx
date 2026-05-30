"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { formatMessage } from "../format-message";
import { LocaleToggleButtons } from "../locale-toggle-buttons";
import type { ImportParseResponse } from "@/lib/inventory/types";
import {
  createInventoryItem,
  deleteInventoryItem,
  deleteInventoryItemsBatch,
  getInventoryItems,
  type InventoryCategory,
  type InventoryItem,
} from "./actions";
import { InventoryImportDialog } from "./inventory-import-dialog";

type Field = {
  key: string;
  label: string;
  type?: string;
};

const categories: Array<{
  id: InventoryCategory;
  es: string;
  en: string;
  fields: Field[];
}> = [
  {
    id: "hotels",
    es: "Hoteles",
    en: "Hotels",
    fields: [
      { key: "city", label: "City" },
      { key: "stars", label: "Stars", type: "number" },
      { key: "netPrice", label: "Net price", type: "number" },
      { key: "contractDetails", label: "Contract details" },
    ],
  },
  {
    id: "experiences",
    es: "Experiencias",
    en: "Experiences",
    fields: [
      { key: "city", label: "City" },
      { key: "duration", label: "Duration" },
      { key: "netPrice", label: "Net price", type: "number" },
      { key: "supplier", label: "Supplier" },
    ],
  },
  {
    id: "suppliers",
    es: "Proveedores",
    en: "Suppliers",
    fields: [
      { key: "contact", label: "Contact" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone" },
      { key: "contractDetails", label: "Contract details" },
    ],
  },
  {
    id: "tour_operators",
    es: "Tour operadores",
    en: "Tour Operators",
    fields: [
      { key: "destination", label: "Destination" },
      { key: "contact", label: "Contact" },
      { key: "commission", label: "Commission" },
      { key: "contractDetails", label: "Contract details" },
    ],
  },
];

function emptyForm(fields: Field[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});
}

const backLinkClass =
  "inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent";

const inputClass =
  "w-full rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-tquot-text outline-none transition-colors focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20";

const tealOutlineButtonClass =
  "rounded-xl border border-tquot-teal/30 bg-tquot-teal/10 px-5 py-2.5 text-sm font-semibold text-tquot-teal transition-colors hover:bg-tquot-teal/15 disabled:cursor-not-allowed disabled:opacity-50";

export function InventoryClient() {
  const { locale, t } = useDashboardLanguage();
  const [activeCategory, setActiveCategory] =
    useState<InventoryCategory>("hotels");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>(
    emptyForm(categories[0].fields),
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importParseResult, setImportParseResult] =
    useState<ImportParseResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const category = categories.find((item) => item.id === activeCategory) ?? categories[0];
  const filteredItems = useMemo(
    () => items.filter((item) => item.category === activeCategory),
    [activeCategory, items],
  );
  const selectedInViewCount = useMemo(
    () => filteredItems.filter((item) => selectedIds.has(item.id)).length,
    [filteredItems, selectedIds],
  );
  const allInViewSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.has(item.id));
  const someInViewSelected = filteredItems.some((item) =>
    selectedIds.has(item.id),
  );

  useEffect(() => {
    refreshItems();
  }, []);

  function selectCategory(nextCategory: InventoryCategory) {
    const next = categories.find((item) => item.id === nextCategory) ?? categories[0];
    setActiveCategory(nextCategory);
    setName("");
    setFormData(emptyForm(next.fields));
    setIsAdding(false);
    setSelectedIds(new Set());
  }

  function toggleSelectItem(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAllInView() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allInViewSelected) {
        for (const item of filteredItems) {
          next.delete(item.id);
        }
      } else {
        for (const item of filteredItems) {
          next.add(item.id);
        }
      }
      return next;
    });
  }

  async function refreshItems() {
    setIsLoading(true);
    const result = await getInventoryItems();
    setItems(result.items);
    setError(result.error);
    setIsLoading(false);
  }

  async function handleAdd() {
    if (!name.trim()) {
      setError(t.inventoryNameRequired);
      return;
    }

    const result = await createInventoryItem({
      category: activeCategory,
      name: name.trim(),
      data: formData,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.item) {
      setItems((current) => [result.item, ...current]);
    }

    setError("");
    setName("");
    setFormData(emptyForm(category.fields));
    setIsAdding(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteInventoryItem(id);
    if (result.error) {
      setError(result.error);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    const ids = filteredItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.id);
    if (ids.length === 0) return;

    setIsDeletingSelected(true);
    setError("");

    const result = await deleteInventoryItemsBatch(ids);
    setIsDeletingSelected(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const idSet = new Set(ids);
    setItems((current) => current.filter((item) => !idSet.has(item.id)));
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) {
        next.delete(id);
      }
      return next;
    });
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(file: File) {
    setIsImporting(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("defaultCategory", activeCategory);

    try {
      const response = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ImportParseResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? t.inventoryImportError);
        return;
      }

      setImportFileName(file.name);
      setImportParseResult(data);
      setImportDialogOpen(true);
    } catch {
      setError(t.inventoryImportError);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function closeImportDialog() {
    setImportDialogOpen(false);
    setImportParseResult(null);
    setImportFileName("");
  }

  async function handleImportComplete() {
    await refreshItems();
    closeImportDialog();
  }

  return (
    <div className="min-h-screen px-6 py-10 text-tquot-text">
      <main className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/dashboard" className={backLinkClass}>
            ← {t.backToDashboard}
          </Link>
          <LocaleToggleButtons />
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tquot-teal">
            {t.inventoryEyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-tquot-text sm:text-4xl">
            {t.inventoryTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-tquot-muted">{t.inventorySubtitle}</p>
        </section>

        <section className="rounded-xl border border-tquot-border bg-tquot-surface p-6 shadow-md">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectCategory(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeCategory === item.id
                      ? "bg-tquot-teal text-white"
                      : "border border-tquot-border bg-tquot-surface text-tquot-muted hover:text-tquot-text"
                  }`}
                >
                  {locale === "es" ? item.es : item.en}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isImporting}
                className={tealOutlineButtonClass}
              >
                {isImporting ? t.inventoryImporting : t.inventoryImport}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding((current) => !current)}
                className="rounded-xl bg-tquot-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#00b396]"
              >
                {isAdding ? t.inventoryClose : t.inventoryAddNew}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-tquot-warm/30 bg-amber-50 px-4 py-3 text-sm text-tquot-warm">
              {error}
            </div>
          ) : null}

          {isAdding ? (
            <div className="mb-6 rounded-xl border border-tquot-border bg-tquot-bg p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-tquot-text">
                    {t.inventoryNameLabel}
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                  />
                </label>
                {category.fields.map((field) => (
                  <label key={field.key}>
                    <span className="mb-2 block text-sm font-medium text-tquot-text">
                      {field.label}
                    </span>
                    <input
                      type={field.type ?? "text"}
                      value={formData[field.key] ?? ""}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="mt-5 rounded-xl bg-tquot-teal px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00b396]"
              >
                {t.inventorySaveItem}
              </button>
            </div>
          ) : null}

          {selectedInViewCount > 0 ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                disabled={isDeletingSelected}
                className="rounded-xl border border-tquot-warm/30 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-tquot-warm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingSelected
                  ? t.inventoryDeletingSelected
                  : formatMessage(t.inventoryDeleteSelected, {
                      count: String(selectedInViewCount),
                    })}
              </button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-tquot-border">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-tquot-border bg-tquot-bg text-tquot-muted">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allInViewSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate =
                              someInViewSelected && !allInViewSelected;
                          }
                        }}
                        onChange={toggleSelectAllInView}
                        disabled={isLoading || filteredItems.length === 0}
                        className="h-4 w-4 rounded accent-tquot-teal"
                        aria-label={t.inventorySelectAll}
                      />
                      <span className="sr-only">{t.inventorySelectAll}</span>
                    </label>
                  </th>
                  <th className="px-4 py-3 font-medium">{t.inventoryNameLabel}</th>
                  <th className="px-4 py-3 font-medium">{t.inventoryDetails}</th>
                  <th className="px-4 py-3 font-medium">{t.inventoryCreated}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t.inventoryActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tquot-border bg-tquot-surface">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-tquot-muted">
                      {t.inventoryLoading}
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          className="h-4 w-4 rounded accent-tquot-teal"
                          aria-label={item.name}
                        />
                      </td>
                      <td className="px-4 py-4 font-medium text-tquot-text">{item.name}</td>
                      <td className="px-4 py-4 text-tquot-muted">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.data).map(([key, value]) =>
                            value ? (
                              <span
                                key={key}
                                className="rounded-full border border-tquot-border bg-tquot-bg px-2.5 py-1 text-xs text-tquot-muted"
                              >
                                {key}: {value}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-tquot-muted">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg border border-tquot-warm/30 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-tquot-warm transition-colors hover:bg-amber-100"
                        >
                          {t.inventoryDelete}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-tquot-muted">
                      {t.inventoryEmpty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <InventoryImportDialog
        open={importDialogOpen}
        fileName={importFileName}
        parseResult={importParseResult}
        onClose={closeImportDialog}
        onImported={handleImportComplete}
      />
    </div>
  );
}
