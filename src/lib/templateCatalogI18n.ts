import type { TFunction } from "i18next";
import type { Template } from "@/hooks/useTemplates";

export type TemplateCatalogMeta = {
  key: string;
  title: string;
  description?: string;
  categoryKey: string;
  categoryLabel: string;
};

/**
 * Convert any template name to a stable i18n key (snake_case)
 * This enables i18n-driven UI without changing DB identifiers.
 */
export function toStableKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Get localized metadata for a template catalog entry.
 * Uses stable keys derived from template name, with i18n lookup and DB fallback.
 * 
 * Lookup order:
 * 1. templates.catalog.<stableKey>.title  (preferred - fully localized)
 * 2. templates.names.<exactDbName>        (legacy fallback)
 * 3. DB raw value                         (final fallback)
 */
export function getLocalizedTemplateMeta(
  template: Pick<Template, "name" | "description" | "category">,
  t: TFunction
): TemplateCatalogMeta {
  const key = toStableKey(template.name);
  const categoryKey = template.category || "Other";

  // Title lookup: catalog key first, then legacy names, then raw DB
  const catalogTitle = t(`templates.catalog.${key}.title`, { defaultValue: "" });
  const legacyTitle = t(`templates.names.${template.name}`, { defaultValue: "" });
  const title = catalogTitle || legacyTitle || template.name;

  // Description lookup: similar cascade
  const rawDesc = template.description || "";
  const catalogDesc = t(`templates.catalog.${key}.desc`, { defaultValue: "" });
  const legacyDesc = t(`templates.descriptions.${template.name}`, { defaultValue: "" });
  const description = catalogDesc || legacyDesc || rawDesc || undefined;

  // Category lookup: exact case first, then lowercase
  const categoryExact = t(`templates.categories.${categoryKey}`, { defaultValue: "" });
  const categoryLower = t(`templates.categories.${categoryKey.toLowerCase()}`, { defaultValue: "" });
  const categoryLabel = categoryExact || categoryLower || categoryKey;

  return {
    key,
    title,
    description,
    categoryKey,
    categoryLabel,
  };
}

/**
 * Get localized category label directly from a raw category string
 */
export function getLocalizedCategoryLabel(category: string, t: TFunction): string {
  const cat = category || "Other";
  const exact = t(`templates.categories.${cat}`, { defaultValue: "" });
  const lower = t(`templates.categories.${cat.toLowerCase()}`, { defaultValue: "" });
  return exact || lower || cat;
}
