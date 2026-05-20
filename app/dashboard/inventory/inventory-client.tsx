"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { LocaleToggleButtons } from "../locale-toggle-buttons";
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  type InventoryCategory,
  type InventoryItem,
} from "./actions";

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

  const category = categories.find((item) => item.id === activeCategory) ?? categories[0];
  const filteredItems = useMemo(
    () => items.filter((item) => item.category === activeCategory),
    [activeCategory, items],
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
  }

  return (
    <div className="relative min-h-screen bg-[#03080F] px-6 py-10 text-[#E8EEF7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,201,167,0.12),transparent)]"
        aria-hidden
      />

      <main className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-[#8B9CB3] transition-colors hover:text-[#00C9A7]"
          >
            ← {t.backToDashboard}
          </Link>
          <LocaleToggleButtons className="bg-white/[0.04]" />
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00C9A7]">
            {t.inventoryEyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.inventoryTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-[#8B9CB3]">{t.inventorySubtitle}</p>
        </section>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectCategory(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeCategory === item.id
                      ? "bg-[#00C9A7] text-[#03080F]"
                      : "border border-white/10 bg-white/[0.04] text-[#8B9CB3] hover:text-white"
                  }`}
                >
                  {locale === "es" ? item.es : item.en}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsAdding((current) => !current)}
              className="rounded-xl bg-[#00C9A7] px-5 py-2.5 text-sm font-semibold text-[#03080F] transition-colors hover:bg-[#00E5BB]"
            >
              {isAdding ? t.inventoryClose : t.inventoryAddNew}
            </button>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-4 py-3 text-sm text-[#FF6B35]">
              {error}
            </div>
          ) : null}

          {isAdding ? (
            <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#03080F]/50 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-[#E8EEF7]">
                    {t.inventoryNameLabel}
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-[#E8EEF7] outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
                  />
                </label>
                {category.fields.map((field) => (
                  <label key={field.key}>
                    <span className="mb-2 block text-sm font-medium text-[#E8EEF7]">
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
                      className="w-full rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-[#E8EEF7] outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="mt-5 rounded-xl bg-[#00C9A7] px-6 py-3 text-sm font-semibold text-[#03080F] transition-colors hover:bg-[#00E5BB]"
              >
                {t.inventorySaveItem}
              </button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.04] text-[#8B9CB3]">
                <tr>
                  <th className="px-4 py-3 font-medium">{t.inventoryNameLabel}</th>
                  <th className="px-4 py-3 font-medium">{t.inventoryDetails}</th>
                  <th className="px-4 py-3 font-medium">{t.inventoryCreated}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t.inventoryActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#8B9CB3]">
                      {t.inventoryLoading}
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="bg-[#03080F]/30">
                      <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                      <td className="px-4 py-4 text-[#8B9CB3]">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.data).map(([key, value]) =>
                            value ? (
                              <span
                                key={key}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs"
                              >
                                {key}: {value}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#8B9CB3]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-3 py-1.5 text-xs font-semibold text-[#FF6B35] transition-colors hover:bg-[#FF6B35]/15"
                        >
                          {t.inventoryDelete}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#8B9CB3]">
                      {t.inventoryEmpty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
