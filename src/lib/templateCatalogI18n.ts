import type { TFunction } from "i18next";
import type { Template } from "@/hooks/useTemplates";

export type TemplateCatalogMeta = {
  key: string;
  title: string;
  description?: string;
  categoryLabel: string;
};

function toStableKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapTemplateNameToKey(name: string): string {
  const n = name.trim();

  const map: Record<string, string> = {
    // Core list templates (DB identifiers)
    "Unit Economics": "unit_economics",
    "Fundraising Readiness": "fundraising_readiness",
    "Investor Meeting Prep": "investor_meeting_prep",
    "Pitch Deck Checklist": "pitch_deck_checklist",

    // Canvas templates (DB identifiers)
    "Business Model Canvas": "bmc",
    "Lean Canvas": "lean",
    "Value Proposition Canvas": "value_prop",
    "Empathy Map": "empathy",
    "SWOT Analysis": "swot",
    "Go-To-Market Canvas": "gtm",
    "Go-to-Market Canvas": "gtm",
    "ICP & Persona Board": "icp",
    "OKRs & North Star Canvas": "okrs",
    "OKRs & North Star": "okrs",
    "Fundraising Canvas": "fundraising",
    "Fundraise Readiness Canvas": "fundraising_readiness_canvas",
    "Sales Pipeline Canvas": "pipeline",
    "Product Roadmap Canvas": "roadmap",

    // Common aliases
    "GTM Canvas": "gtm",
    "ICP": "icp",
    "OKRs": "okrs",
    "BMC": "bmc",
  };

  return map[n] ?? toStableKey(n);
}

function mapCategoryToKey(category: string): string {
  const c = category.trim();
  const map: Record<string, string> = {
    Finance: "Finance",
    Fundraising: "Fundraising",
    Goals: "Goals",
    Growth: "Growth",
    Product: "Product",
    Progress: "Progress",
    Sales: "Sales",
    Strategy: "Strategy",
    Team: "Team",
    Validation: "Validation",
    Customer: "Customer",
    Marketing: "Marketing",
    Operations: "Operations",
    Funding: "Fundraising",
    Other: "Other",
  };
  return map[c] ?? c;
}

export function getLocalizedTemplateMeta(
  template: Pick<Template, "name" | "description" | "category">,
  t: TFunction,
  language: string
): TemplateCatalogMeta {
  const key = mapTemplateNameToKey(template.name);
  const categoryKey = mapCategoryToKey(template.category || "Other");

  const title = t(`templates.catalog.${key}.title`, {
    defaultValue: t(`templates.names.${template.name}`, { defaultValue: template.name }),
  });

  const description = t(`templates.catalog.${key}.desc`, {
    defaultValue: template.description
      ? t(`templates.descriptions.${template.name}`, { defaultValue: template.description })
      : "",
  });

  const categoryLabel = t(`templates.categories.${categoryKey}`, {
    defaultValue: template.category || t("templates.categories.Other", { defaultValue: "Other" }),
  });

  return {
    key,
    title,
    description: description || undefined,
    categoryLabel,
  };
}
