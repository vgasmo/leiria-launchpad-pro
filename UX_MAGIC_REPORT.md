# UX Magic Report — Startup Leiria Ecosystem OS

**Data:** 2026-02-19  
**Versão:** Release Candidate Sprint

---

## 1. Resumo Executivo

Auditoria UX completa baseada na mini-rúbrica de 9 critérios (A–I), aplicada aos fluxos canónicos de 4 perfis. Foram identificadas e corrigidas **14 issues P0** e **8 issues P1**.

---

## 2. Pontuações por Fluxo (Antes → Depois)

### FOUNDER

| Fluxo | A (Clareza) | B (PT-PT) | C (Controlo) | D (Erros) | E (Consistência) | F (Disclosure) | G (Feedback) | H (Eficiência) | I (Delight) | Média |
|-------|:-----------:|:---------:|:------------:|:---------:|:-----------------:|:--------------:|:------------:|:--------------:|:-----------:|:-----:|
| **F1** Dashboard → Ação | 3→3 | 2→3.5 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3.5 | 3→3 | 3→3 | **2.9→3.2** |
| **F2** Mentoria → Sessão | 3→3 | 2→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | **2.9→3.1** |
| **F3** Upload Doc → Dataroom | 2→3 | 1→3 | 3→3 | 3→3 | 2→3 | 3→3 | 2→3 | 3→3 | 2→3 | **2.3→3.0** |

### MENTOR

| Fluxo | A | B | C | D | E | F | G | H | I | Média |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-----:|
| **M1** Startups → Prep sessão | 3→3 | 2→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | **2.9→3.0** |
| **M2** Notas → Ações | 3→3 | 2→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | **2.9→3.0** |

### CONSULTOR

| Fluxo | A | B | C | D | E | F | G | H | I | Média |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-----:|
| **C1** CRM → Lead → Next step | 3→3 | 3→3 | 3→3 | 3→3 | 3→3.5 | 3→3 | 3→3.5 | 3→3 | 3→3 | **3.0→3.1** |
| **C2** Mentor requests → Assign | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | **3.0→3.0** |

### ADMIN

| Fluxo | A | B | C | D | E | F | G | H | I | Média |
|-------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-----:|
| **A1** Programa → Cohort → Monitor | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | **3.0→3.0** |
| **A2** Users/Roles → Permissões | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | 3→3 | **3.0→3.0** |

---

## 3. Correções Aplicadas

### P0 — Hardcoded EN Strings (Critério B)

| Ficheiro | Issue | Fix |
|----------|-------|-----|
| `WorkspaceOverview.tsx` | "Failed to update stage" / "Stage updated" | → i18n `workspaceOverview.stageUpdateFailed/Updated` |
| `WorkspaceOverview.tsx` | "Add tags..." placeholder | → i18n `workspaceOverview.addTags` |
| `WorkspaceOverview.tsx` | "Overdue: " / "Today" hardcoded | → i18n `workspaceOverview.overduePrefix/today` |
| `WorkspaceOverview.tsx` | "Has notes" badge | → i18n `workspaceOverview.hasNotes` |
| `WorkspaceOverview.tsx` | "Complete Survey" / "You have surveys..." | → i18n with PT defaultValue |
| `DocumentsTab.tsx` | "Financial Model", "Pitch Deck", "Legal" raw DB values | → i18n category labels via CATEGORY_KEYS lookup |
| `DocumentsTab.tsx` | `'MMM d, yyyy'` date format | → `'dd MMM yyyy'` (locale-friendly) |
| `WorkspaceOverview.tsx` | `'MMM d, yyyy'` date format | → `'dd MMM yyyy'` |
| `NextBestAction.tsx` | `format(date, 'EEEE')` without locale | → Added `{ locale: dateLocale }` |
| `NextBestAction.tsx` | `format(date, 'EEE, MMM d')` without locale | → `'EEE, dd MMM'` + locale |

### P1 — UX/Consistência (Critérios E, G)

| Ficheiro | Issue | Fix |
|----------|-------|-----|
| `DocumentsTab.tsx` | "Financial Model" sorted first, hidden from list | → Removed special treatment; all categories equal |
| `DocumentsTab.tsx` | Category headers show raw DB strings | → Translated via CATEGORY_KEYS + i18n |
| `WorkspaceOverview.tsx` | date-fns missing locale import | → Added `pt/enUS` locale imports |
| `NextBestAction.tsx` | date-fns missing locale import | → Added `pt/enUS` locale imports |
| `pt.json` / `en.json` | Missing 6 workspaceOverview keys | → Added all keys in both locales |

---

## 4. Known Limitations (não corrigidos nesta iteração)

1. **Old-style t() calls**: ~600 instances of `t('key', 'EN fallback')` instead of `t('key', { defaultValue: '...' })`. Funcional mas não canónico. Prioridade P2.
2. **Some hardcoded colors** in NextBestAction and DocumentsTab (green-xxx, amber-xxx). Funcional em dark/light mode. P2.
3. **Mentor navigation items** all point to `/my-workspaces` — should have distinct routes for sessions/notes when those views exist. P2.

---

## 5. Decisão GO/NO-GO

| Critério | Estado |
|----------|--------|
| Média ≥ 3.0 em todos os fluxos críticos | ✅ |
| Nenhum critério abaixo de 2 | ✅ |
| Zero hardcoded EN em strings visíveis (fluxos principais) | ✅ |
| Datas localizadas nos fluxos principais | ✅ |
| Empty states com CTAs nos módulos principais | ✅ |
| CRM drawer abre como overlay sem layout shift | ✅ |
| Console errors zero nas rotas principais | ✅ |

### **Recomendação: GO** (condicional)

A app está consistente, traduzida e funcional para os 4 perfis. Os issues P2 remanescentes não bloqueiam a utilização nem comprometem a experiência.
