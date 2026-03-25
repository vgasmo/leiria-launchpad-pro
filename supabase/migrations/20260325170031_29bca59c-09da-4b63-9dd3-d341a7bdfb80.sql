
-- ============================================================
-- V11 Official Regulation Pricing Seed — March 2026
-- Source: Anexo I – Regulamento Interno Startup Leiria V11
-- ============================================================

-- 1. Create the pricing version
INSERT INTO public.pricing_table_versions (
  id, version_code, effective_date, approved_by, regulation_reference, notes, is_current
) VALUES (
  'a0000001-0001-4000-8000-000000000001',
  'V11-2026-03',
  '2026-03-01',
  'Conselho de Administração',
  'Anexo I – Regulamento Interno Startup Leiria V11',
  'Tabela de preços oficial em vigor desde março 2026. Valores sem IVA. Fonte: Regulamento V11, páginas 5-6.',
  true
) ON CONFLICT (version_code) DO UPDATE SET is_current = true, updated_at = now();

-- Mark any other versions as not current
UPDATE public.pricing_table_versions
SET is_current = false, updated_at = now()
WHERE version_code != 'V11-2026-03' AND is_current = true;

-- 2. Seed pricing lines from the official regulation table
-- Note: Using deterministic UUIDs for idempotent re-runs

-- 2a. Incubação e Aceleração de Ideias (Pré-Incubação)
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Incubação e Aceleração de Ideias',
   'Até duas reuniões por mês de tutoria; Facilitação de rede de contactos para realização de MVP (Minimum Viable Product). Oferta das 2 primeiras reuniões com consultores.',
   'N/A', NULL, 50.00, NULL, NULL, NULL, false, 6, false, 1,
   'Nota 1: A incubação de Ideias apenas poderá ser usufruída por um período máximo de 6 meses.')
ON CONFLICT (id) DO NOTHING;

-- 2b. Serviço de Domiciliação
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0002-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Serviço de Domiciliação',
   'Domiciliação, caixa de correio e receção de encomendas.',
   'N/A', NULL, 49.00, NULL, NULL, NULL, false, NULL, false, 2, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2c. Incubação e Aceleração Virtual
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0003-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Incubação e Aceleração Virtual',
   'Apoio de ecossistema, sede, acesso às salas comuns, serviços básicos.',
   'N/A', NULL, 74.00, NULL, NULL, NULL, false, NULL, false, 3, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2d. Co-Work / Incubadora Social — 15 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0004-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Leiria Mercado Co-Work / Incubadora Social – 15 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Incubadora Social', 15, 190.00, 213.00, 5.00, 7.50, false, NULL, false, 4, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2e. Gabinete 20 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0005-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 20 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Parceiros-Sede', 20, 290.00, 325.00, 5.00, 7.50, false, NULL, false, 5, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2f. Gabinete 23 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0006-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 23 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Parceiros-Sede', 23, 325.00, 360.00, 5.00, 7.50, false, NULL, false, 6, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2g. Gabinete 25 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0007-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 25 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Leiria Mercado', 25, 295.00, 330.00, 5.00, 7.50, false, NULL, false, 7, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2h. Gabinete 30 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0008-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 30 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Parceiros-Sede', 30, 380.00, 430.00, 5.00, 7.50, false, NULL, false, 8, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2i. Gabinete 40 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-0009-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 40 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Parceiros-Sede / Leiria Mercado', 40, 505.00, 570.00, 5.00, 7.50, false, NULL, false, 9, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2j. Gabinete 46 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-000a-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 46 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos.',
   'Parceiros-Sede', 46, 580.00, 645.00, 5.00, 7.50, false, NULL, false, 10, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2k. Gabinete 60 m²
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-000b-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Gabinete – 60 m²',
   'Incubação física com espaço próprio mobilado, ar condicionado, rede informática, serviços básicos. Inclui mesa de reuniões redonda.',
   'Parceiros-Sede', 60, 750.00, 850.00, 5.00, 7.50, false, NULL, false, 11, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2l. Espaço Customizável (per m²)
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-000c-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Espaço Customizável',
   'Espaço customizável sob aceitação e coordenação com a Startup Leiria.',
   'Leiria Mercado', NULL, 14.00, 12.00, 5.00, 7.50, true, NULL, false, 12,
   'Nota 4: O Espaço Customizável depende de aceitação e coordenação com a Startup Leiria. Preço por m²/mês.')
ON CONFLICT (id) DO NOTHING;

-- 2m. Incubação e Aceleração Virtual (Pós-Incubação / standalone 150€)
INSERT INTO public.pricing_lines (id, pricing_version_id, designation, services_description, location_type, area_sqm, startup_monthly_fee, non_startup_monthly_fee, startup_annual_increase_pct, non_startup_annual_increase_pct, is_per_sqm, max_duration_months, is_post_incubation, sort_order, notes)
VALUES
  ('b0000001-000d-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Incubação e Aceleração Virtual (Apoio Ecossistema)',
   'Apoio de ecossistema e facilitação de rede de contactos.',
   'N/A', NULL, 150.00, NULL, NULL, NULL, false, NULL, true, 13,
   'Modalidade virtual com apoio de ecossistema, tipicamente pós-incubação.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Seed complementary services (separate from base pricing)
-- Source: V11 Regulation pages 5-6
-- ============================================================

-- 3a. Telefone VOIP
INSERT INTO public.complementary_services (id, pricing_version_id, category, name, description, unit, unit_price, is_included, sort_order, notes)
VALUES
  ('c0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Comunicações', 'Telefone VOIP – Rede fixa PT/ES', 'Chamadas para a rede fixa de Portugal e Espanha', 'min', 0.0110, false, 1, NULL),
  ('c0000001-0002-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Comunicações', 'Telefone VOIP – Redes móveis PT', 'Chamadas para as redes móveis de Portugal', 'min', 0.0390, false, 2, NULL),
  ('c0000001-0003-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Comunicações', 'Internet por cabo e wireless', 'Acesso à ligação partilhada por cabo e wireless, 1 IP fixo, 1 VLAN própria, sem período de fidelização', NULL, NULL, true, 3, 'Incluído na mensalidade'),
  ('c0000001-0004-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Comunicações', 'Internet – Largura de banda garantida', 'Todos os serviços incluídos no valor mensal e largura de banda mínima garantida', NULL, NULL, false, 4, 'Sob orçamento')
ON CONFLICT (id) DO NOTHING;

-- 3b. Impressões e fotocópias
INSERT INTO public.complementary_services (id, pricing_version_id, category, name, description, unit, unit_price, is_included, sort_order, notes)
VALUES
  ('c0000001-0005-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Impressões', 'Impressão / Fotocópia – Preto e branco', 'Impressão ou fotocópia a preto e branco', 'un', 0.0200, false, 5, NULL),
  ('c0000001-0006-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Impressões', 'Impressão / Fotocópia – Cor', 'Impressão ou fotocópia a cor', 'un', 0.0900, false, 6, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3c. Equipamento extra
INSERT INTO public.complementary_services (id, pricing_version_id, category, name, description, unit, unit_price, is_included, sort_order, notes)
VALUES
  ('c0000001-0007-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Secretária', 'Secretária adicional', 'mês', 7.0000, false, 7, NULL),
  ('c0000001-0008-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Bloco de gavetas', 'Bloco de gavetas adicional', 'mês', 6.0000, false, 8, NULL),
  ('c0000001-0009-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Cadeira de executivo', 'Cadeira de executivo adicional', 'mês', 4.0000, false, 9, NULL),
  ('c0000001-000a-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Cadeira de visitante', 'Cadeira de visitante adicional', 'mês', 2.0000, false, 10, NULL),
  ('c0000001-000b-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Mesa de reuniões redonda', 'Mesa de reuniões redonda adicional', 'mês', 5.0000, false, 11, NULL),
  ('c0000001-000c-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Mesa de apoio', 'Mesa de apoio adicional', 'mês', 4.0000, false, 12, NULL),
  ('c0000001-000d-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Bancada', 'Bancada adicional', 'mês', 5.0000, false, 13, NULL),
  ('c0000001-000e-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Telefone', 'Equipamento de telefone', 'mês', 6.0000, false, 14, NULL),
  ('c0000001-000f-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Equipamento Extra', 'Ponto de rede', 'Ponto de rede adicional', 'mês', 2.0000, false, 15, NULL)
ON CONFLICT (id) DO NOTHING;
