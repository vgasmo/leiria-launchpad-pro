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
 */
function toStableKey(input: string): string {
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
 */
export function getLocalizedTemplateMeta(
  template: Pick<Template, "name" | "description" | "category">,
  t: TFunction
): TemplateCatalogMeta {
  const key = toStableKey(template.name);
  // Keep the original category case for lookup since JSON keys are case-sensitive
  const categoryKey = template.category || "Other";

  // Try catalog-based keys first (snake_case), then names with original name, then raw DB value
  const title = t(`templates.catalog.${key}.title`, {
    defaultValue: t(`templates.names.${template.name}`, {
      defaultValue: template.name,
    }),
  });

  const rawDesc = template.description || "";
  const description = rawDesc
    ? t(`templates.catalog.${key}.desc`, {
        defaultValue: t(`templates.descriptions.${template.name}`, {
          defaultValue: rawDesc,
        }),
      })
    : undefined;

  // Category lookup: try exact case first (e.g., "Finance"), then lowercase
  const categoryLabel = t(`templates.categories.${categoryKey}`, {
    defaultValue: t(`templates.categories.${categoryKey.toLowerCase()}`, {
      defaultValue: categoryKey,
    }),
  });

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
  // Try exact case first, then lowercase
  return t(`templates.categories.${cat}`, {
    defaultValue: t(`templates.categories.${cat.toLowerCase()}`, {
      defaultValue: cat,
    }),
  });
}
