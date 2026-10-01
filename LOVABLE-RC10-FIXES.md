# PROMPT LOVABLE — RC10 · PARTE 1 de 4 — Cadeia central no servidor: contrato assinado → workspace → conta do founder

Olá. Esta ronda valida de ponta a ponta os três fluxos que vão ser usados no arranque: **CRM** (captação até contrato), **onboarding** (registo, aprovação, claim, convites, founder criado por contrato) e **assinatura de contratos** (rota nativa, manual, PandaDoc, DocuSign e ciclo de vida).

Primeiro, o reconhecimento: **as Partes 1 a 4 do RC9 estão aplicadas**. O SQL das quatro migrações está linha a linha igual ao prompt e as 26 validações passam no replay. No código, 71 itens estão aplicados, 4 com desvio menor (P2.7, P2.8, P3.4 e P3.10) e 4 ficaram por aplicar (P3.5, o código da P3.7, a P3.8 e o cliente da P3.11). Estes 8 vão incluídos aqui. A Parte 5 do RC9 continua por aplicar e continua válida.

Percorremos cada fluxo papel a papel (admin, consultor, backoffice, founder, team_member, mentor, anónimo) na base replayada do RC10, no PostgREST 12.2.3 e no código. Saíram 4 defeitos HIGH, todos na mesma cadeia: **o contrato assinado não chega a dar um founder com acesso a um workspace ativo**. O caminho que a própria UI anuncia (lead nova → intake → contrato "sem workspace, será criado ao assinar" → assinatura) termina com o contrato ativo e sem startup, sem workspace e sem conta, em silêncio. Quando a conta é criada, o founder nunca recebe forma de entrar. E o link público de assinatura continua a aceitar escritas depois de assinado ou terminado.

Cada correção deste prompt foi aplicada a uma cópia do RC10 e validada antes de entrar aqui:
- SQL: replay limpo de todas as migrações (0 ficheiros a falhar, depois de resolver a A0), as 25 suites pgTAP do repositório a passar e um cenário ponta a ponta com 68 verificações (contrato → workspace → founder → ativação, conversão pelo backoffice, contas suspensas, convites, CRM do backoffice). As três migrações novas correm duas vezes sem erro;
- código: `tsc --noEmit -p tsconfig.typecheck.json` sem erros, `eslint` sem avisos nos 36 ficheiros de interface alterados, `vitest run` com 206/206 testes, e `deno check` em todas as edge functions alteradas;
- pedidos novos do cliente e das edge functions: executados no PostgREST 12.2.3 (200/204).

O prompt tem **4 partes**: 1. cadeia central no servidor (SQL e edge functions); 2. cadeia central no cliente; 3. restantes defeitos MED; 4. defeitos LOW e textos (anexo `LOVABLE-RC10-I18N-PATCH.json`). **Aplique uma parte de cada vez** e, no fim de cada uma, corra `bash scripts/rc5/local-pg-harness.sh`, `bun run typecheck` e `bun run rc5:verify`. Depois da Parte 4, cole a Parte 5 do RC9 (a ordem dos dois anexos de textos é indiferente: validámos as duas).

## Regras (valem para as 4 partes)

1. Não altere nada fora do que está listado. Sem refactors.
2. Cada bloco SQL vai numa **migração nova**. Nunca edite migrações aplicadas (a única exceção é a A0, que trata de um ficheiro que nunca correu).
3. Os blocos `DO` desta ronda são idempotentes: verificam se a alteração já foi feita e só lançam `texto esperado não encontrado` se a função em produção for diferente da do repositório. Se isso acontecer, **pare e avise**; não adapte o texto.
4. `supabase-js` não lança: devolve `{ data, error }`. Um `UPDATE` bloqueado pela RLS devolve 0 linhas e nenhum erro.
5. Todos os `ficheiro:linha` são do RC10 (commit `a9e8d3d`), antes de qualquer item desta ronda. Se um item anterior já mexeu no ficheiro, localize o trecho pelo código citado.
6. Não acrescente `as any` em payloads de `update`/`insert`. As únicas conversões novas são `'ensure_contract_workspace' as never` na Parte 2, até regenerar o `types.ts` (pode retirá-las depois).
7. Depois da migração desta parte, **regenere `src/integrations/supabase/types.ts`**.

---

## A0 — Migração duplicada que parte o replay

`supabase/migrations/20261001090000_rc9_part2_flows.sql` é uma cópia da Parte 2 do RC9, que já está em `20261001084200_*.sql`. Num replay limpo falha (`approve_startup_claim: texto esperado não encontrado` e `guard not found in staff_rotate_intake_token`), porque os blocos `DO` encontram as funções já alteradas. Por isso o harness (`scripts/rc5/local-pg-harness.sh`) e qualquer replay limpo (por exemplo, um branch novo do Supabase) falham.

1. No SQL editor de produção, corra: `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version LIKE '20261001%' ORDER BY version;`
2. Se a lista **não** tiver `20261001090000`, apague o ficheiro. É o caso esperado: a migração falharia em produção pela mesma razão.
3. Se a lista tiver `20261001090000`, não apague: substitua o conteúdo do ficheiro por `-- Duplicado da 20261001084200 (Parte 2 do RC9). Conteúdo removido: já aplicado; repetido falha no replay.`

Validação: sem o ficheiro, o replay das migrações do RC10 mais as três desta ronda termina com 0 ficheiros a falhar.

---

## Migração da Parte 1 (A1, A2, A3, A5, A6, A8 e A10)

Crie **uma migração nova** com o conteúdo abaixo. Cada bloco está explicado no item respetivo. Tudo é `CREATE OR REPLACE` ou `UPDATE` com guarda, por isso pode correr duas vezes.

```sql
-- RC10 · Parte A — cadeia contrato assinado → workspace → conta do founder → onboarding
-- Migração nova. Só CREATE OR REPLACE e UPDATEs com guarda: pode correr duas vezes sem erro.

-- ── A1. Contrato do CRM sem workspace: criar ou reutilizar startup + workspace (idempotente) ──
CREATE OR REPLACE FUNCTION public.ensure_contract_workspace(p_contract_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_c public.startup_contracts%ROWTYPE; v_i public.contract_intakes%ROWTYPE; v_f public.funnel_items%ROWTYPE;
  v_prog uuid; v_startup uuid; v_ws uuid; v_owner uuid;
BEGIN
  IF NOT (public.is_staff() OR public.is_backoffice() OR coalesce(auth.role(), '') = 'service_role') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_c FROM public.startup_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'contract_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_c.workspace_id IS NOT NULL THEN RETURN v_c.workspace_id; END IF;
  SELECT * INTO v_i FROM public.contract_intakes WHERE contract_id = p_contract_id ORDER BY created_at DESC LIMIT 1;
  IF COALESCE(v_c.funnel_item_id, v_i.funnel_item_id) IS NOT NULL THEN
    SELECT * INTO v_f FROM public.funnel_items WHERE id = COALESCE(v_c.funnel_item_id, v_i.funnel_item_id) FOR UPDATE;
  END IF;
  IF v_f.linked_workspace_id IS NOT NULL THEN
    v_ws := v_f.linked_workspace_id;  -- lead já convertida: reutilizar o workspace dela
  ELSE
    v_prog := v_f.program_id;
    IF v_prog IS NULL THEN
      SELECT CASE WHEN count(*) = 1 THEN (array_agg(id))[1] END INTO v_prog FROM public.programs WHERE is_active;
    END IF;
    IF v_prog IS NULL THEN
      RAISE EXCEPTION 'auto_mint_no_program: associe a lead a um programa e volte a sincronizar' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.startups (name, nif, address, website, description, main_contact_name, main_contact_email, main_contact_phone)
    VALUES (
      COALESCE(NULLIF(btrim(COALESCE(v_c.organization_name, v_i.organization_name, v_f.organization_name, '')), ''), 'Startup'),
      COALESCE(v_c.company_nif, v_i.company_nif),
      NULLIF(concat_ws(', ', COALESCE(v_c.company_address, v_i.company_address), COALESCE(v_c.company_postal_code, v_i.company_postal_code), COALESCE(v_c.company_city, v_i.company_city)), ''),
      CASE WHEN v_i.website ~* '^https?://' THEN v_i.website END,
      v_i.startup_description,
      COALESCE(v_c.legal_representative_name, v_i.legal_representative_name, v_f.contact_name),
      COALESCE(v_c.legal_representative_email, v_i.legal_representative_email, v_f.contact_email),
      COALESCE(v_c.legal_representative_phone, v_i.legal_representative_phone, v_f.contact_phone))
    RETURNING id INTO v_startup;
    -- só um consultor/admin fica como consultor atribuído (sync_assigned_consultor_to_members cria o membro)
    IF v_f.owner_consultant_id IS NOT NULL
       AND (public.has_role(v_f.owner_consultant_id, 'consultor'::public.app_role)
            OR public.has_role(v_f.owner_consultant_id, 'admin'::public.app_role)) THEN
      v_owner := v_f.owner_consultant_id;
    END IF;
    INSERT INTO public.workspaces (startup_id, program_id, status, needs_onboarding, assigned_consultor_id, created_by)
    VALUES (v_startup, v_prog, 'pending', true, v_owner, auth.uid()) RETURNING id INTO v_ws;
    IF v_f.id IS NOT NULL THEN
      UPDATE public.funnel_items SET linked_workspace_id = v_ws, linked_startup_id = v_startup, updated_at = now() WHERE id = v_f.id;
    END IF;
  END IF;
  UPDATE public.startup_contracts SET workspace_id = v_ws, updated_at = now() WHERE id = p_contract_id;
  RETURN v_ws;
END; $function$;
REVOKE ALL ON FUNCTION public.ensure_contract_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_contract_workspace(uuid) TO authenticated, service_role;

-- ── A1. 'Marcar como assinado': ligar já o founder e não rebentar num workspace sem membros ──
CREATE OR REPLACE FUNCTION public.activate_workspace_for_signed_contract(p_contract_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_status text;
BEGIN
  IF NOT (public.is_staff() OR public.is_backoffice()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT workspace_id INTO v_ws FROM public.startup_contracts
   WHERE id = p_contract_id AND status = 'active' AND signed_at IS NOT NULL;
  IF v_ws IS NULL THEN RETURN 'no_signed_contract'; END IF;
  -- liga já o representante legal, se tiver conta (idempotente; o cron horário faz o mesmo)
  PERFORM public.reconcile_contract_founders(p_contract_id);
  -- validate_workspace_status_transition recusa ativar sem membros: avisar em vez de rebentar
  IF NOT EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.workspace_id = v_ws AND wu.active) THEN
    RETURN 'awaiting_founder';
  END IF;
  UPDATE public.workspaces SET status = 'active', updated_at = now()
   WHERE id = v_ws AND status IN ('pending','claimed','imported_unclaimed')
  RETURNING status INTO v_status;
  RETURN COALESCE(v_status, 'unchanged');
END; $$;
REVOKE ALL ON FUNCTION public.activate_workspace_for_signed_contract(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_workspace_for_signed_contract(uuid) TO authenticated;
-- ── A2. Reconciliação horária: um founder que já se tinha registado (pendente) fica aprovado ──
CREATE OR REPLACE FUNCTION public.reconcile_contract_founders(p_contract_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_auth_id uuid;
  v_email text;
  v_name text;
  v_checked int := 0;
  v_linked int := 0;
  v_invited int := 0;
  v_missing int := 0;
BEGIN
  FOR r IN
    SELECT c.id,
           c.workspace_id,
           lower(trim(c.legal_representative_email)) AS email,
           COALESCE(NULLIF(trim(c.legal_representative_name), ''), 'Founder') AS full_name
    FROM public.startup_contracts c
    WHERE c.status = 'active'
      AND c.workspace_id IS NOT NULL
      AND c.legal_representative_email IS NOT NULL
      AND c.legal_representative_email <> ''
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
  LOOP
    v_checked := v_checked + 1;
    v_email := r.email;
    v_name := r.full_name;

    SELECT id INTO v_auth_id
    FROM auth.users
    WHERE lower(email) = v_email
    LIMIT 1;

    IF v_auth_id IS NULL THEN
      -- No auth account yet: enqueue triage so staff invites the founder.
      v_missing := v_missing + 1;
      BEGIN
        INSERT INTO public.staff_work_queue_items (
          workspace_id, type, title, description, priority, status, evidence_json
        ) VALUES (
          r.workspace_id,
          'triage',
          'Convidar founder — ' || v_name,
          'Contrato ativo sem conta de auth para ' || v_email || '. Convite manual necessário.',
          'high',
          'open',
          jsonb_build_object(
            'purpose', 'invite_founder',
            'contract_id', r.id,
            'reason', 'missing_auth_user',
            'email', v_email
          )
        );
      EXCEPTION WHEN unique_violation THEN
        -- Already queued (idx_work_queue_unique_active) — leave the open task in place.
        NULL;
      END;
      CONTINUE;
    END IF;

    -- Profile
    -- Perfil: cria aprovado; um perfil 'pending' (founder que se registou antes) passa a aprovado.
    -- Nunca reativa contas suspensas (só o admin, P1.1/P2.1).
    INSERT INTO public.profiles (id, email, full_name, account_status)
    VALUES (v_auth_id, v_email, v_name, 'approved'::account_status)
    ON CONFLICT (id) DO UPDATE SET account_status = 'approved'::account_status, updated_at = now()
      WHERE public.profiles.account_status = 'pending'::account_status;

    -- Founder role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_auth_id, 'founder')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Workspace membership (active)
    INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
    VALUES (r.workspace_id, v_auth_id, 'founder', true)
    ON CONFLICT (workspace_id, user_id) DO UPDATE
      SET active = true,
          role = COALESCE(public.workspace_users.role, 'founder');

    v_linked := v_linked + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'checked', v_checked,
    'linked', v_linked,
    'invited', v_invited,
    'missing_auth', v_missing,
    'ran_at', now()
  );
END;
$function$;
-- ── A3. Links públicos de assinatura de contratos já fechados deixam de servir ──
UPDATE public.startup_contracts
   SET onboarding_token_hash = NULL, onboarding_token_expires_at = NULL, updated_at = now()
 WHERE onboarding_token_hash IS NOT NULL
   AND (status IN ('active', 'terminated', 'expired', 'suspended')
        OR signature_status IN ('completed', 'signed', 'partially_signed', 'declined', 'voided'));

-- ── A5. Links de assinatura já enviados sem fornecedor: são da assinatura nativa ──
UPDATE public.startup_contracts
   SET signature_provider = 'assinatura_digital', updated_at = now()
 WHERE signature_provider IS NULL AND onboarding_token_hash IS NOT NULL
   AND signed_at IS NULL AND status IN ('draft', 'pending_signature');

-- ── A6. Conversão em workspace: reaproveita o contrato da lead e só a marca como ganha com contrato assinado ──
CREATE OR REPLACE FUNCTION public.staff_convert_funnel_item_to_startup(p_funnel_item_id uuid, p_program_id uuid, p_stage text, p_incubation_type_id uuid DEFAULT NULL::uuid, p_building_id uuid DEFAULT NULL::uuid, p_square_meters numeric DEFAULT NULL::numeric, p_monthly_fee numeric DEFAULT NULL::numeric, p_project_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_health_notes text DEFAULT NULL::text, p_inferred_stage text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_item public.funnel_items%ROWTYPE;
  v_startup_id uuid;
  v_workspace_id uuid;
  v_contract_id uuid;
  v_final_stage text;
  v_project_name text;
  v_owner uuid;
  v_signed boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_staff() OR public.is_backoffice()) THEN
    RAISE EXCEPTION 'staff_only' USING ERRCODE = '42501';
  END IF;

  -- Lock the funnel row so a concurrent conversion of the same lead serialises behind us.
  SELECT * INTO v_item FROM public.funnel_items WHERE id = p_funnel_item_id FOR UPDATE;
  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'funnel_item_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency: if this lead already resolved to a workspace, return it unchanged.
  IF v_item.linked_workspace_id IS NOT NULL THEN
    RETURN jsonb_build_object('startup_id', v_item.linked_startup_id, 'workspace_id', v_item.linked_workspace_id,
                              'contract_id', v_item.linked_contract_id, 'was_existing', true);
  END IF;

  v_project_name := COALESCE(NULLIF(trim(p_project_name), ''), v_item.organization_name, v_item.contact_name, 'New Startup');
  v_final_stage := COALESCE(NULLIF(trim(p_inferred_stage), ''), p_stage);
  -- só um consultor/admin pode ficar como consultor atribuído (o dono da lead pode ser do backoffice)
  v_owner := CASE WHEN v_item.owner_consultant_id IS NOT NULL
                   AND (public.has_role(v_item.owner_consultant_id, 'consultor'::public.app_role)
                        OR public.has_role(v_item.owner_consultant_id, 'admin'::public.app_role))
                  THEN v_item.owner_consultant_id END;

  -- 1. Startup
  INSERT INTO public.startups (name, description, main_contact_name, main_contact_email, main_contact_phone)
  VALUES (v_project_name, p_description, v_item.contact_name, v_item.contact_email, v_item.contact_phone)
  RETURNING id INTO v_startup_id;

  -- 2. Workspace (pending — activation happens on contract signing)
  INSERT INTO public.workspaces (startup_id, program_id, stage, status, assigned_consultor_id, health_notes, created_by)
  VALUES (v_startup_id, p_program_id, v_final_stage::public.startup_stage, 'pending', v_owner, p_health_notes, v_user)
  RETURNING id INTO v_workspace_id;

  -- 3. Staff membership so the workspace has an operational owner (o backoffice não fica membro, P2.2)
  INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
  SELECT v_workspace_id, v_user, 'consultor'::public.app_role, true WHERE public.is_staff()
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET active = true, role = 'consultor';

  -- 4. Contrato: reaproveitar o contrato em curso da lead (o ligado primeiro), ainda sem workspace e
  --    não arquivado/terminado, e ligá-lo ao workspace novo; senão, stub opcional como antes
  SELECT c.id INTO v_contract_id FROM public.startup_contracts c
   WHERE c.workspace_id IS NULL AND c.archived_at IS NULL
     AND c.status IN ('draft','pending_signature','active')
     AND (c.id = v_item.linked_contract_id OR c.funnel_item_id = p_funnel_item_id)
   ORDER BY (c.id IS NOT DISTINCT FROM v_item.linked_contract_id) DESC, c.created_at DESC
   LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE public.startup_contracts SET workspace_id = v_workspace_id
     WHERE id = v_contract_id AND workspace_id IS NULL;
  ELSIF p_incubation_type_id IS NOT NULL THEN
    INSERT INTO public.startup_contracts (workspace_id, incubation_type_id, building_id, square_meters, monthly_fee,
                                          start_date, status, funnel_item_id, created_by)
    VALUES (v_workspace_id, p_incubation_type_id, p_building_id, p_square_meters, COALESCE(p_monthly_fee, 0),
            CURRENT_DATE, 'draft', p_funnel_item_id, v_user)
    RETURNING id INTO v_contract_id;
  END IF;

  -- 5. Lead: com contrato por assinar mantém a fase (a assinatura põe-na em 'contracted');
  --    sem contrato, ou com contrato assinado, conta como ganha (como antes)
  SELECT EXISTS (SELECT 1 FROM public.startup_contracts c
                  WHERE c.id = v_contract_id AND (c.signed_at IS NOT NULL OR c.signature_status IN ('completed','signed')))
    INTO v_signed;
  UPDATE public.funnel_items
     SET stage = CASE WHEN v_contract_id IS NOT NULL AND NOT v_signed THEN stage
                      ELSE (CASE WHEN p_stage = 'ideation' THEN 'incubating' ELSE 'accelerating' END) END,
         type = 'startup_active',
         linked_startup_id = v_startup_id,
         linked_workspace_id = v_workspace_id,
         linked_contract_id = COALESCE(v_contract_id, v_item.linked_contract_id),
         converted_at = now(),
         updated_at = now()
   WHERE id = p_funnel_item_id;

  -- 6. Event log
  INSERT INTO public.funnel_events (funnel_item_id, event_type, performed_by, metadata)
  VALUES (p_funnel_item_id, 'converted_to_startup', v_user,
          jsonb_build_object('startup_id', v_startup_id, 'workspace_id', v_workspace_id, 'contract_id', v_contract_id, 'signed', v_signed));

  RETURN jsonb_build_object('startup_id', v_startup_id, 'workspace_id', v_workspace_id, 'contract_id', v_contract_id, 'was_existing', false);
END;
$function$;

-- ── A8. Só os workspaces importados (claim) dispensam o assistente de onboarding ──
CREATE OR REPLACE FUNCTION public.auto_activate_workspace_on_founder()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'founder' AND NEW.active = true THEN
    UPDATE public.workspaces
       SET status = 'active',
           -- os criados por contrato, conversão ou atribuição mantêm needs_onboarding
           needs_onboarding = CASE WHEN status = 'imported_unclaimed' THEN false ELSE needs_onboarding END,
           updated_at = now()
     WHERE id = NEW.workspace_id
       AND status IN ('claimed', 'imported_unclaimed');
  END IF;
  RETURN NEW;
END;
$function$;

-- ── A8. P4.2: os dados legais de uma startup com contrato assinado só mudam por pedido de alteração ──
CREATE OR REPLACE FUNCTION public.startup_is_established(p_startup_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.startup_id = p_startup_id
                   AND w.status IN ('active','archived') AND w.needs_onboarding IS NOT TRUE)
      OR EXISTS (SELECT 1 FROM public.startup_contracts c JOIN public.workspaces w ON w.id = c.workspace_id
                  WHERE w.startup_id = p_startup_id
                    AND c.status IN ('active','suspended','terminated','expired'));
$$;
REVOKE ALL ON FUNCTION public.startup_is_established(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.startup_is_established(uuid) TO authenticated;

-- ── A10. Intakes presos em 'signature_sent' com o contrato recusado/anulado: fechar (param os lembretes) ──
UPDATE public.contract_intakes ci
   SET status = 'cancelled', updated_at = now()
  FROM public.startup_contracts c
 WHERE c.id = ci.contract_id
   AND ci.status = 'signature_sent'
   AND c.signature_status IN ('declined', 'voided');
```

pgTAP a acrescentar em `supabase/tests/rc10_contract_chain.test.sql` (o cenário que usámos tem 68 verificações; estas são as essenciais):
- contrato ativo com intake e sem workspace → `ensure_contract_workspace` como `service_role` cria um workspace `pending` com a startup (NIF e morada do contrato) e o consultor da lead como membro, e liga o contrato e a lead; a segunda chamada devolve o mesmo id; como founder → `throws_ok(..., '42501')`; `anon` sem `EXECUTE`;
- `activate_workspace_for_signed_contract` num workspace sem membros → `'awaiting_founder'`; com uma conta para o email do representante → `'active'` e a conta `pending` passa a `approved`; uma conta `suspended` continua `suspended`;
- `staff_convert_funnel_item_to_startup` de uma lead com contrato em curso → o contrato fica ligado ao workspace novo e a lead mantém a fase; com o contrato terminado → o contrato não é tocado;
- um founder inserido num workspace `claimed` → o workspace fica `active` e `needs_onboarding` mantém-se `true`; no claim de um `imported_unclaimed` → `false` (como hoje).

---

## A1 — Contrato assinado sem workspace, e workspace sem membros (HIGH)

Achados E2E-01, CRM-01, CONF-03, SIGN-04, ONB-4, E2E-12 e E2E-15.

**O que acontece.** `_shared/lifecycleSync.ts:136` só cria startup e workspace quando o contrato **não tem intake** (`if (!intake) {`, auto-mint da P3.6). Mas um contrato do fluxo de intake tem sempre intake: a aprovação exige `contract_id` (`useContractIntakes.ts:317` e o trigger `validate_intake_contract_link`), e o "Criar contrato agora" do `IntakeReviewPanel.tsx:243-258` cria-o sem workspace ("será criado ao assinar", `BackofficeContractsTab.tsx:483`). Na assinatura, por qualquer rota (nativa `:1422-1423`, DocuSign `:367`, PandaDoc `:315`, manual `contractLifecycleSync.ts:174`), o contrato fica `active` e `workspace_id` fica `NULL`: sem startup, sem workspace, sem conta do founder, sem tarefa e sem alerta. Prova na base: `contract|active|completed|assinatura_digital|t||ana.founder@…`, 0 workspaces, 0 contas.

O mesmo efeito, por outra causa, quando o workspace existe mas não tem membros (lead convertida pelo backoffice sem consultor, P2.2): o trigger `validate_workspace_status_transition` recusa a ativação. Na assinatura nativa a função responde **502** ao founder (`public-contract-onboarding/index.ts:1428-1436`) **antes** de criar a conta (`:1438-1457`); no "Marcar como assinado" a RPC rebenta com `no active members found`.

**Correção.**
- SQL (migração acima): `ensure_contract_workspace(p_contract_id)` cria ou reutiliza startup e workspace a partir do contrato, do intake e da lead (reutiliza o workspace da lead já convertida), põe o consultor da lead como consultor atribuído (só se for consultor ou admin) e liga contrato e lead. É idempotente e só a chamam staff, backoffice ou `service_role`. `activate_workspace_for_signed_contract` passa a ligar já o representante legal que tenha conta (`reconcile_contract_founders`) e a devolver `'awaiting_founder'` em vez de rebentar num workspace sem membros.
- `_shared/lifecycleSync.ts`: workspace garantido pela RPC, conta e membro do founder criados **antes** de ativar, e sem membros ativos o workspace fica pendente (com a triagem "Convidar founder") em vez de falhar a assinatura. Substitua a linha 1 por:
```ts
import { autoCreateFounderAccount, enqueueFounderInviteTask } from './founderAccount.ts'
```
e substitua a função `syncIntakeOnCompleted` inteira (`:101-287`, do comentário `/** When a contract is completed/signed:` até ao `}` que fecha a função) por:
```ts
/**
 * When a contract is completed/signed:
 * 1. Contrato sem workspace: criar ou reutilizar startup + workspace (RPC ensure_contract_workspace)
 * 2. Workspace ainda por ativar: criar a conta + membro founder antes de ativar
 * 3. Update linked intake: current → signed → activated (+ audit events)
 * 4. Sync CRM funnel_item.stage to 'contracted' (valid fine-grained DB stage)
 * 5. Activate workspace (only from pre-active states); sem membros ativos fica pendente
 *    (awaitingFounder) com a triagem 'Convidar founder', em vez de falhar a assinatura
 *
 * Errors are captured and returned. Workspace activation is attempted even if intake
 * sync partially fails so a signed contract is not left without an active workspace.
 */
export async function syncIntakeOnCompleted(
  supabase: any,
  contractId: string,
  workspaceId: string | null,
  performedBy: string | null,
  source: string,
): Promise<SyncResult & { workspaceId?: string | null; awaitingFounder?: boolean }> {
  const errors: string[] = []
  let effectiveWorkspaceId = workspaceId
  let awaitingFounder = false

  const { data: intake, error: findErr } = await supabase
    .from('contract_intakes')
    .select('id, status, funnel_item_id')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findErr) {
    console.warn('[lifecycleSync] syncIntakeOnCompleted find error', { contractId, error: findErr.message })
    errors.push(`find_intake: ${findErr.message}`)
  }

  // ── Contratos sem intake (CRM direto): a lead resolve-se pelo contrato
  let fallbackFunnelItemId: string | null = null
  if (!intake) {
    const { data: contractRow } = await supabase
      .from('startup_contracts')
      .select('funnel_item_id')
      .eq('id', contractId)
      .maybeSingle()
    fallbackFunnelItemId = contractRow?.funnel_item_id ?? null
  }

  // ── Contrato sem workspace (lead do CRM, com ou sem intake): criar ou reutilizar startup + workspace.
  //    A RPC é idempotente: lê o workspace do contrato, reutiliza o da lead já convertida ou cria um 'pending'.
  if (!effectiveWorkspaceId) {
    const { data: mintedWs, error: mintErr } = await supabase.rpc('ensure_contract_workspace', { p_contract_id: contractId })
    if (mintErr) {
      console.error('[lifecycleSync] ensure_contract_workspace failed', { contractId, error: mintErr.message })
      errors.push(`auto_mint_workspace: ${mintErr.message}`)
    } else {
      effectiveWorkspaceId = (mintedWs as string | null) ?? null
    }
  }

  // ── A ativação exige um membro ativo (trigger validate_workspace_status_transition): com o workspace
  //    ainda por ativar, criar já a conta + membro founder (idempotente) ANTES de ativar
  if (effectiveWorkspaceId) {
    const { data: wsNow } = await supabase
      .from('workspaces')
      .select('status')
      .eq('id', effectiveWorkspaceId)
      .maybeSingle()
    if (wsNow && ['pending', 'claimed', 'imported_unclaimed', 'draft'].includes(wsNow.status)) {
      const { data: signer } = await supabase
        .from('startup_contracts')
        .select('legal_representative_email, legal_representative_name')
        .eq('id', contractId)
        .maybeSingle()
      const founderInput = {
        id: contractId,
        workspace_id: effectiveWorkspaceId,
        legal_representative_email: signer?.legal_representative_email ?? null,
        legal_representative_name: signer?.legal_representative_name ?? null,
      }
      const acct = await autoCreateFounderAccount(supabase, founderInput)
      if (!acct.ok) await enqueueFounderInviteTask(supabase, founderInput, acct.reason || 'unknown')
    }
  }

  if (intake) {
    // Transition: current → signed (skip if already past)
    const PAST_SIGNED = ['signed', 'activated']
    if (!PAST_SIGNED.includes(intake.status)) {
      const { error: signErr } = await supabase
        .from('contract_intakes')
        .update({ status: 'signed' })
        .eq('id', intake.id)
      if (signErr) {
        console.error('[lifecycleSync] intake → signed failed', { intakeId: intake.id, error: signErr.message })
        errors.push(`intake_signed: ${signErr.message}`)
      } else {
        await supabase.from('intake_events').insert({
          intake_id: intake.id,
          event_type: 'lifecycle_sync_signed',
          from_status: intake.status,
          to_status: 'signed',
          performed_by: performedBy,
          metadata: { source, contract_id: contractId },
        })
      }
    }

    if (intake.status !== 'activated') {
      const { error: actErr } = await supabase
        .from('contract_intakes')
        .update({ status: 'activated' })
        .eq('id', intake.id)
      if (actErr) {
        console.error('[lifecycleSync] intake → activated failed', { intakeId: intake.id, error: actErr.message })
        errors.push(`intake_activated: ${actErr.message}`)
      } else {
        await supabase.from('intake_events').insert({
          intake_id: intake.id,
          event_type: 'lifecycle_sync_activated',
          from_status: 'signed',
          to_status: 'activated',
          performed_by: performedBy,
          metadata: { source, contract_id: contractId },
        })
      }
    }

    if (intake.funnel_item_id) {
      const { error: crmErr } = await supabase.from('funnel_items')
        .update({ stage: 'contracted' })
        .eq('id', intake.funnel_item_id)
      if (crmErr) {
        console.warn('[lifecycleSync] funnel_items contracted update failed', {
          funnelItemId: intake.funnel_item_id, error: crmErr.message,
        })
        errors.push(`funnel_stage: ${crmErr.message}`)
      }
    }
  } else if (fallbackFunnelItemId) {
    // CRM-direct fallback: still advance the funnel stage
    const { error: crmErr } = await supabase.from('funnel_items')
      .update({ stage: 'contracted' })
      .eq('id', fallbackFunnelItemId)
    if (crmErr) errors.push(`funnel_stage_fallback: ${crmErr.message}`)
  }

  if (effectiveWorkspaceId) {
    // Sem membros ativos (sem email do representante, conta suspensa) o trigger recusaria a ativação:
    // o workspace fica pendente com a triagem 'Convidar founder' em vez de falhar a assinatura.
    const { count: activeMembers, error: membersErr } = await supabase
      .from('workspace_users')
      .select('user_id', { count: 'exact', head: true })
      .eq('workspace_id', effectiveWorkspaceId)
      .eq('active', true)
    if (!membersErr && (activeMembers ?? 0) === 0) {
      console.warn('[lifecycleSync] workspace without active members, activation deferred', { workspaceId: effectiveWorkspaceId })
      awaitingFounder = true
    } else {
      const { error: wsErr } = await supabase.from('workspaces')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', effectiveWorkspaceId)
        .in('status', ['pending', 'claimed', 'imported_unclaimed'])
      if (wsErr) {
        console.error('[lifecycleSync] workspace activation failed', { workspaceId: effectiveWorkspaceId, error: wsErr.message })
        errors.push(`workspace_activate: ${wsErr.message}`)
      }
    }
  }

  return {
    synced: errors.length === 0,
    intakeId: intake?.id,
    workspaceId: effectiveWorkspaceId,
    awaitingFounder,
    errors: errors.length ? errors : undefined,
  }
}
```
- `staff-assign-workspace-to-contract/index.ts` (remediação "Atribuir/criar workspace" do painel de incoerências): passa a ligar também a lead do CRM ao workspace. Em `:66` acrescente `funnel_item_id` ao select:
```ts
      .select('id, status, workspace_id, funnel_item_id, organization_name, legal_representative_email, legal_representative_name')
```
e logo a seguir a `log.info('contract_workspace_assigned', …)` (`:167`) acrescente:
```ts
    // Ligar a lead do CRM ao workspace (senão o CRM continua a tratar a lead como não convertida)
    if (contract.funnel_item_id) {
      const { data: wsRow } = await admin.from('workspaces').select('startup_id').eq('id', workspaceId).maybeSingle();
      const { error: leadErr } = await admin
        .from('funnel_items')
        .update({ linked_workspace_id: workspaceId, linked_startup_id: wsRow?.startup_id ?? null, updated_at: new Date().toISOString() })
        .eq('id', contract.funnel_item_id)
        .is('linked_workspace_id', null);
      if (leadErr) log.warn('funnel_link_failed', { error: leadErr.message });
    }
```
- O cliente ("Marcar como assinado") está na Parte 2 (A1, A4).

Com isto, a chamada que as rotas fazem a seguir a `autoCreateFounderAccount` (nativa `:1438`, DocuSign `:418`, PandaDoc `:394`) fica idempotente e inofensiva. Validado: deno check em `public-contract-onboarding`, `docusign-webhook`, `pandadoc-webhook` e `staff-assign-workspace-to-contract`; cenário na base: intake → contrato sem workspace → assinatura → workspace `pending` com startup e consultor → conta e membro founder → `active` com `needs_onboarding=true` e a triagem fechada.

**Dados já afetados** (só leitura; corrija cada um com "Atribuir workspace" no painel de incoerências do backoffice, que depois desta ronda cria também a conta do founder e envia o acesso):
```sql
SELECT id, contract_number, organization_name, legal_representative_email, signed_at
  FROM public.startup_contracts
 WHERE status = 'active' AND workspace_id IS NULL
 ORDER BY signed_at;
```

---

## A2 — O founder criado pelo contrato nunca recebe acesso (HIGH)

Achados ONB-1, SIGN-09, E2E-03, SIGN-13, E2E-11, E2E-12, ONB-8 e E2E-10.

**O que acontece.** `_shared/founderAccount.ts:79-89` chama `auth.admin.generateLink({ type: 'recovery' })` e deita fora o resultado: no auth-js isso só gera o link, não envia nada. O founder fica com uma conta com password aleatória e nenhum email (o registo próprio está fechado: `check_signup_allowed` devolve `false` para o email dele). Mesmo que recebesse o link de recuperação, o cliente de auth é PKCE (`src/lib/supabaseClient.ts:40`) e rejeita o link implícito. Além disso:
- o upsert do perfil (`:95-100`) grava `account_status: 'approved'` também em contas existentes: **reativa contas suspensas** e reescreve o nome;
- a triagem "Convidar founder" que o trigger `trg_reconcile_contract_founder` abre quando o contrato fica ativo (`missing_auth_user`) nunca fecha, e o índice único `idx_work_queue_unique_active (workspace_id, type)` bloqueia qualquer outra triagem desse workspace;
- um founder que já se tinha registado (conta `pending`) fica `pending` depois da assinatura pelos caminhos só-BD (`reconcile_contract_founders` faz `ON CONFLICT (id) DO NOTHING`).

**Correção.**
- Substitua `supabase/functions/_shared/founderAccount.ts` **inteiro** por:
```ts
/**
 * Shared: Auto-create founder account after contract signing.
 * Used by docusign-webhook, pandadoc-webhook, and public-contract-onboarding
 * (digital_sign + manual mark-as-signed) so all signing paths behave the same.
 *
 * On failure, callers should enqueue a staff work-queue item so the founder
 * account creation is never silently dropped.
 */

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}

/**
 * Envia ao founder criado agora o email de acesso (definir password).
 * O cliente de auth é PKCE: o link usa o hashed_token e é validado em /reset-password com verifyOtp.
 * Best-effort: nunca lança e devolve false se não enviou.
 */
async function sendFounderAccessEmail(supabase: any, email: string, fullName: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return false
  const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://fb.startupleiria.com'
  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'recovery', email })
  const hashed: string | undefined = link?.properties?.hashed_token
  if (linkErr || !hashed) {
    console.warn('[founderAccount] generateLink failed:', linkErr?.message)
    return false
  }
  const accessUrl = `${appUrl}/reset-password?token_hash=${encodeURIComponent(hashed)}&type=recovery`
  const safeName = fullName.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Startup Leiria <noreply@startupleiria.com>',
        to: [email],
        subject: 'A sua conta na plataforma Startup Leiria',
        html: `<p>Olá ${safeName},</p><p>O contrato foi assinado e a sua conta na plataforma Startup Leiria já está criada.</p><p><a href='${accessUrl}'>Definir a minha password</a></p><p>Se o link expirar, use «Esqueci-me da password» em ${appUrl}/login com este email.</p>`,
      }),
    })
    if (!res.ok) console.warn('[founderAccount] access email failed:', res.status, await res.text())
    return res.ok
  } catch (e) {
    // fetch lança em erro de rede
    console.warn('[founderAccount] access email failed:', String(e))
    return false
  }
}

export type FounderContractInput = {
  id: string
  workspace_id: string | null
  legal_representative_email: string | null
  legal_representative_name: string | null
}

export type FounderAccountResult = {
  ok: boolean
  userId?: string
  reason?: string
  error?: string
}

export async function autoCreateFounderAccount(
  supabase: any,
  contract: FounderContractInput,
): Promise<FounderAccountResult> {
  if (!contract.legal_representative_email) {
    return { ok: false, reason: 'missing_email' }
  }
  if (!contract.workspace_id) {
    return { ok: false, reason: 'missing_workspace' }
  }

  const email = contract.legal_representative_email.toLowerCase().trim()
  const fullName = contract.legal_representative_name || 'Founder'

  try {
    // Paginated lookup: listUsers() defaults to 50 rows per page. Iterate
    // until we find the email or exhaust results, so pre-existing auth
    // accounts are always detected (otherwise createUser throws email_exists
    // and we lose the link between the auth user and the workspace).
    let existingUser: any = null;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const users = data?.users || [];
      existingUser = users.find((u: any) => u.email?.toLowerCase() === email);
      if (existingUser) break;
      if (users.length < 200) break;
    }

    let userId: string
    let createdNow = false
    if (existingUser) {
      userId = existingUser.id
    } else {
      const tempPassword = generateSecurePassword()
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          selected_role: 'founder',
          auto_created: true,
          contract_id: contract.id,
        },
      })
      if (createErr) throw createErr
      userId = newUser.user.id
      createdNow = true
    }

    // Conta existente: nunca reativar uma conta suspensa (só o admin reativa, P1.1/P2.1).
    // Os chamadores abrem a triagem 'Convidar founder' quando ok=false; o staff decide.
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('id', userId)
      .maybeSingle()
    if (currentProfile?.account_status === 'suspended') {
      return { ok: false, userId, reason: 'account_suspended' }
    }

    // Garantir o perfil (a conta pode ser anterior ao trigger on_auth_user_created) sem reescrever
    // o nome de um perfil existente, e aprovar só contas pendentes.
    await supabase
      .from('profiles')
      .upsert(
        { id: userId, email, full_name: fullName, account_status: 'approved' },
        { onConflict: 'id', ignoreDuplicates: true },
      )
    await supabase
      .from('profiles')
      .update({ account_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('account_status', 'pending')

    await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'founder' }, { onConflict: 'user_id,role' })


    await supabase
      .from('workspace_users')
      .upsert(
        { workspace_id: contract.workspace_id, user_id: userId, role: 'founder', active: true },
        { onConflict: 'workspace_id,user_id' },
      )

    const { data: ws } = await supabase
      .from('workspaces')
      .select('status')
      .eq('id', contract.workspace_id)
      .single()

    if (ws && ['pending', 'imported_unclaimed', 'draft'].includes(ws.status)) {
      await supabase
        .from('workspaces')
        .update({ status: 'claimed', updated_at: new Date().toISOString() })
        .eq('id', contract.workspace_id)
    }

    // Fechar a triagem 'Convidar founder' que o reconcile_contract_founders abriu (trigger ao ativar/ligar
    // o contrato) antes de a conta existir. Só a 'missing_auth_user': a de 'access_email_failed' fica aberta.
    await supabase
      .from('staff_work_queue_items')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('workspace_id', contract.workspace_id)
      .eq('type', 'triage')
      .in('status', ['open', 'in_progress'])
      .contains('evidence_json', { purpose: 'invite_founder', contract_id: contract.id, reason: 'missing_auth_user' })

    // Conta criada agora: o founder ainda não tem password, enviar-lhe o acesso.
    // Se o email falhar, o staff recebe a triagem para enviar o acesso à mão.
    if (createdNow) {
      const sent = await sendFounderAccessEmail(supabase, email, fullName)
      if (!sent) await enqueueFounderInviteTask(supabase, contract, 'access_email_failed')
    }

    return { ok: true, userId }
  } catch (err: any) {
    console.error('[founderAccount] failed:', err)
    return { ok: false, reason: 'exception', error: String(err?.message || err) }
  }
}

/**
 * Enqueue a staff work-queue item when auto-creation fails or skips,
 * so a founder without an account is never silently lost.
 */
export async function enqueueFounderInviteTask(
  supabase: any,
  contract: FounderContractInput,
  reason: string,
) {
  try {
    if (!contract.workspace_id) return
    await supabase.from('staff_work_queue_items').insert({
      workspace_id: contract.workspace_id,
      type: 'triage',
      title: `Convidar founder — ${contract.legal_representative_name || contract.legal_representative_email || contract.id.slice(0, 8)}`,
      description: `Auto-criação de conta falhou (${reason}). Convite manual necessário.`,
      priority: 'high',
      status: 'open',
      evidence_json: {
        purpose: 'invite_founder',
        contract_id: contract.id,
        reason,
        email: contract.legal_representative_email,
      },
    })
  } catch (err) {
    console.warn('[founderAccount] enqueue work-queue failed (non-fatal):', err)
  }
}
```
  O email usa a API da Resend com `fetch` dentro da função (nunca instancie o SDK da Resend no topo de um ficheiro `_shared`: sem `RESEND_API_KEY` o construtor lança e derruba as quatro funções que importam este ficheiro, incluindo os webhooks de assinatura). O retorno continua `ok: true` quando a conta e a membership existem, por isso nenhum chamador muda; se o email falhar, o staff recebe a triagem `access_email_failed` para enviar o acesso à mão.
- O link do email é validado em `/reset-password` (Parte 2, A2) com `verifyOtp({ token_hash, type: 'recovery' })`.
- `reconcile_contract_founders` (migração acima): uma conta `pending` passa a `approved`; uma `suspended` não muda.
- **Configuração do Supabase Auth** (painel, não é código): suba "Email OTP Expiration" para 86400 s (24 h). Por omissão o link expira em 1 h; o email indica o recurso "Esqueci-me da password".

**Dados já afetados** (founders criados por contrato que nunca entraram; envie-lhes o acesso com "Esqueci-me da password" ou pela triagem):
```sql
SELECT u.email, u.created_at
  FROM auth.users u
 WHERE (u.raw_user_meta_data->>'auto_created')::boolean IS TRUE
   AND u.last_sign_in_at IS NULL;
```

---

## A3 — O link público de assinatura continua válido depois de assinar ou terminar (HIGH)

Achados SIGN-01 e SIGN-05 (cliente na Parte 2).

**O que acontece.** Em `public-contract-onboarding/index.ts`, depois do lookup pelo hash (`:819-845`) só há a verificação de expiração (`:847-852`). `save_data`, `upload_document`, `submit_signing` e `digital_sign` não olham para o estado do contrato, nem para a rota. A ativação (`:1417-1420`) não tem condição e não anula o token. Provado na base, com o token original de um contrato já assinado: `save_data` com o email de outra conta torna-a founder do workspace; `submit_signing` volta a pôr o contrato em `pending_signature`; num contrato terminado pelo backoffice, assinar de novo põe-no `active` com a razão de terminação ainda gravada. O founder legítimo também cai aqui sem malícia: o botão "Terminar" existe em `pending_signature` e a página salta para o passo de assinatura.

**Correção** em `supabase/functions/public-contract-onboarding/index.ts`:
1. Logo a seguir ao bloco `// Check expiry` (`:847-852`), acrescente:
```ts
    // O link só aceita escritas enquanto o contrato está por assinar
    const linkContractStatus = String((contract as any).status ?? '')
    const linkSigStatus = String((contract as any).signature_status ?? '')
    if (['terminated', 'expired', 'suspended'].includes(linkContractStatus)) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const signingClosed = linkContractStatus === 'active'
      || ['completed', 'signed', 'partially_signed', 'declined', 'voided'].includes(linkSigStatus)
    if (signingClosed && action !== 'get_contract' && action !== 'download_pdf') {
      return new Response(JSON.stringify({ error: 'contract_already_signed' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
```
2. No `upload_document`, a seguir ao teste do `SAFE_KEY_REGEX` (`:872-877`), acrescente:
```ts
      // Só os documentos pedidos na página pública de assinatura
      const ALLOWED_DOC_KEYS = new Set(['certidao_comercial', 'id_representante', 'comprovativo_morada', 'comprovativo_iban', 'pitch_deck', 'docs_associacoes'])
      if (!ALLOWED_DOC_KEYS.has(docKey)) {
        return new Response(JSON.stringify({ error: 'Invalid document key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
```
3. No `digital_sign`, logo a seguir a `const { signatureData, consent } = body` (`:1248`), acrescente (sai no mesmo deploy que a A3 da Parte 2; sem ela a rota "Gerar e enviar link" recebe 409):
```ts
      // Só se assina pela rota nativa depois do submit_signing (dados, documentos e Regulamento aceites)
      if ((contract as any).signature_provider !== 'assinatura_digital'
          || (contract as any).signature_status !== 'sent_for_signature'
          || !(contract as any).regulation_accepted_at) {
        return new Response(JSON.stringify({
          error: 'signing_not_ready',
          message: 'Complete os passos anteriores (dados, documentos e Regulamento) antes de assinar.',
        }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
```
4. Substitua o update de ativação (`:1417-1420`) por:
```ts
      const { error: activateErr } = await supabase
        .from('startup_contracts')
        .update({
          status: 'active',
          onboarding_completed_at: new Date().toISOString(),
          // o link público deixa de servir depois de assinado (como nos webhooks DocuSign/PandaDoc)
          onboarding_token_hash: null,
          onboarding_token_expires_at: null,
        })
        .eq('id', contract.id)
        .in('status', ['draft', 'pending_signature'])
      if (activateErr) console.error('digital_sign: contract activation failed', activateErr.message)
```
5. No `generate_token`, antes de `const onboardingToken = generateToken()` (`:295`), acrescente:
```ts
      // Só se emite link para contratos por assinar (nunca para assinados, terminados ou expirados)
      if (!['draft', 'pending_signature'].includes(String((existing as any).status))) {
        return new Response(JSON.stringify({
          error: 'contract_not_signable',
          message: 'O contrato já não está por assinar.',
        }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
```
6. A terminação e o "Repor e reenviar" passam a anular o token (Parte 2, A3 e A9). A migração acima anula já os tokens dos contratos fechados.

Um refresh da página depois de assinar passa a mostrar "link inválido" (como nos webhooks DocuSign e PandaDoc, que já anulam o token). É aceitável: o ecrã de sucesso não tem download. Validado com deno check.

---

## A5 — Contrato criado no CRM sem fornecedor de assinatura (MED)

Achados CRM-06 e E2E-05.

**O que acontece.** "Criar contrato e enviar" (`RecordDrawer.tsx:583-596`), "Enviar Contrato" (`LinkedContextPanel.tsx:349-357`) e "Gerar link público" (`ContractDetailDrawer.tsx:420-431`) enviam ao founder o link `/contract-signing/…` de um contrato sem `signature_provider` (a coluna não tem default). O founder preenche tudo, o `submit_signing` responde 422 `signature_provider_not_configured` e a página mostra "Assinatura manual em curso. A aguardar contacto da equipa". Nada avisa o staff.

**Correção** (servidor; o cliente está na Parte 2): no `generate_token`, `:281`, acrescente `signature_provider` ao select:
```ts
        .select('id, status, contract_number, organization_name, legal_representative_email, legal_representative_name, signature_provider, workspace:workspaces(startup:startups(name))')
```
e no update do token (`:301-304`) grave o fornecedor quando falta:
```ts
          onboarding_token_hash: onboardingTokenHashStore,
          onboarding_token_expires_at: expiresAt.toISOString(),
          // O link /contract-signing é o da assinatura nativa: sem fornecedor definido, fica 'assinatura_digital'
          ...((existing as any).signature_provider ? {} : { signature_provider: 'assinatura_digital' }),
```
A migração acima corrige os links já enviados sem fornecedor.

---

## A9 (servidor) — A rota nativa herda o contra-assinante de um envio DocuSign/PandaDoc (MED)

Achado SIGN-08 (cliente na Parte 2). `apply_contract_signature_atomic` devolve `partially_signed` sempre que `counter_signer_email` não é nulo, e a rota nativa não tem contra-assinatura: um contrato reenviado pela rota nativa depois de um envio DocuSign/PandaDoc fica para sempre em `partially_signed`. No `submit_signing`, logo a seguir a `finalPatch.company_nif = finalPatch.company_nif ?? contract.company_nif` (`:1089`), acrescente:
```ts
      // A rota nativa não tem contra-assinatura: limpar o contra-assinante herdado de um envio DocuSign/PandaDoc
      if (provider === 'assinatura_digital') {
        finalPatch.counter_signer_email = null
        finalPatch.counter_signer_name = null
        finalPatch.counter_signer_status = null
      }
```

---

## A7 (servidor) — O backoffice converte leads mas não pode convidar o founder (MED)

Achados E2E-02 e CRM-08. Desde a P2.2 o backoffice converte leads, mas `send-workspace-invite/index.ts:118-121` só aceita admin e consultor: o convite automático da conversão (`useFunnel.ts:386-407`) recebe 403 e a falha é silenciosa. Abrir o envio ao backoffice sem mais nada criaria um caminho de auto-adesão contrário à P2.2 (o backoffice convidava o próprio email para qualquer workspace e aceitava). Substitua `:118-121` por:
```ts
    const roles = userRoles?.map(r => r.role) || [];
    const isAdminOrConsultor = roles.includes('admin') || roles.includes('consultor');
    if (!isAdminOrConsultor && !roles.includes('backoffice')) {
      return corsJsonResponse({ error: "Forbidden: Only staff can send invitations" }, req, 403);
    }
```
e, logo a seguir a `const startupName = startup?.name || 'Your Startup';` (`:139`), acrescente:
```ts
    // Backoffice (converte leads, P2.2, mas não é membro das startups): só convida o founder da própria startup,
    // ou seja o contacto principal ou o representante legal de um contrato deste workspace; nunca o próprio
    // email nem uma conta da equipa (seria um auto-convite para ganhar acesso de membro).
    if (!isAdminOrConsultor) {
      const inviteEmail = payload.email.toLowerCase().trim();
      if (payload.role !== 'founder' || inviteEmail === (user.email ?? '').toLowerCase().trim()) {
        return corsJsonResponse({ error: "Forbidden: backoffice can only invite the startup founder" }, req, 403);
      }
      const { data: wsContracts } = await supabaseService
        .from('startup_contracts')
        .select('legal_representative_email')
        .eq('workspace_id', payload.workspaceId);
      const allowed = new Set(
        [startup?.main_contact_email, ...(wsContracts ?? []).map((c: { legal_representative_email: string | null }) => c.legal_representative_email)]
          .filter((e): e is string => !!e)
          .map((e) => e.toLowerCase().trim()),
      );
      if (!allowed.has(inviteEmail)) {
        return corsJsonResponse({ error: "Forbidden: backoffice can only invite the startup founder" }, req, 403);
      }
      const { data: invitedProfile } = await supabaseService
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .maybeSingle();
      if (invitedProfile?.id) {
        const { data: invitedStaffRoles } = await supabaseService
          .from('user_roles')
          .select('role')
          .eq('user_id', invitedProfile.id)
          .in('role', ['admin', 'consultor', 'backoffice', 'mentor_externo']);
        if (invitedStaffRoles?.length) {
          return corsJsonResponse({ error: "Este email pertence a uma conta da equipa." }, req, 403);
        }
      }
    }
```
O convite da conversão continua a passar, porque a conversão grava o email da lead como contacto principal da startup. Validado com deno check; as duas queries novas dão 200 no PostgREST.

---

## A10 (servidor) — Recusar, anular ou terminar nunca fecha o intake (MED)

Achados CONF-04 e SIGN-07. O enum `intake_status` não tem `declined`, `voided` nem `terminated`: `syncIntakeOnClosed` (`_shared/lifecycleSync.ts:322-341`) tenta gravá-los e falha com `22P02`. Cada recusa ou anulação nos webhooks gera um alarme "sincronização falhou" para todo o staff, e o intake fica em `signature_sent`, por isso o founder continua a receber os lembretes semanais de assinatura (`run-intake-reminders`). Substitua o comentário da função (`:290-292`) por:
```ts
 * When a contract is declined / voided / terminated:
 * 1. Close the linked intake as 'cancelled' (the intake_status enum has no declined/voided/terminated;
 *    the outcome goes in the event). An intake already signed/activated is left as is.
 * 2. Log audit event
```
e o bloco `if (intake) { … }` (`:322-344`, até ao `} else {`) por:
```ts
  if (intake) {
    // O enum intake_status não tem declined/voided/terminated: o intake fecha como 'cancelled' e o motivo
    // fica no evento. Um intake já ativado (contrato assinado e depois terminado) mantém 'activated'.
    if (!['cancelled', 'rejected', 'signed', 'activated'].includes(intake.status)) {
      const { error: updErr } = await supabase
        .from('contract_intakes')
        .update({ status: 'cancelled' })
        .eq('id', intake.id)
      if (updErr) {
        console.error('[lifecycleSync] intake close update failed', { intakeId: intake.id, outcome, error: updErr.message })
        errors.push(`intake_${outcome}: ${updErr.message}`)
      } else {
        const { error: evtErr } = await supabase.from('intake_events').insert({
          intake_id: intake.id,
          event_type: `lifecycle_sync_${outcome}`,
          from_status: intake.status,
          to_status: 'cancelled',
          performed_by: performedBy,
          metadata: { source, contract_id: contractId, outcome },
        })
        if (evtErr) errors.push(`intake_event: ${evtErr.message}`)
      }
    }
  } else {
```
`'cancelled'` já é um destino válido de `signature_sent` (`intakeStates.ts:33`) e o "Repor e reenviar" reabre o intake (o trigger `sync_contract_signature_downstream` passa `cancelled` → `signature_sent`). O cliente (terminar) está na Parte 2 e a migração acima fecha os intakes já presos.

---

**Fim da Parte 1.** Corra o harness (0 ficheiros a falhar e todas as suites a passar), regenere o `types.ts` e faça deploy das edge functions alteradas: `public-contract-onboarding`, `staff-assign-workspace-to-contract`, `send-workspace-invite` e, por causa dos ficheiros `_shared`, também `docusign-webhook` e `pandadoc-webhook`. Diga-me o que não aplicou antes de colar a Parte 2.


# PROMPT LOVABLE — RC10 · PARTE 2 de 4 — Cadeia central no cliente: Marcar como assinado, link público, acesso do founder e onboarding

Mesmas regras da Parte 1. Esta parte completa a cadeia do lado da interface. Pressupõe a Parte 1 aplicada (migração, `types.ts` regenerado e edge functions publicadas).

---

## A11 — `invokeWithAuth` transforma qualquer erro de uma edge function em "403: Access denied" (LOW, pré-requisito)

Achado CRM-13. `src/lib/invokeWithAuth.ts:45-57` trata qualquer resposta não-2xx como `403: Access denied (<função>)`, por isso as mensagens de erro desta ronda (por exemplo "O contrato já não está por assinar", o 409 do `generate_token`) nunca chegariam ao staff. Substitua o bloco `if (error) { … }` (`:45-57`) por:
```ts
  if (error) {
    const parsed = parseApiError(error, `invokeWithAuth:${functionName}`);
    // O FunctionsHttpError traz a Response em error.context: usar o status e a mensagem reais do servidor.
    // Só 401/403 viram '403: Access denied' (há chamadores que testam esse texto).
    const ctx = (error as { context?: unknown }).context;
    let status: number | undefined;
    let serverMsg: string | undefined;
    if (ctx instanceof Response) {
      status = ctx.status;
      try {
        const body = await ctx.clone().json();
        serverMsg = typeof body?.message === 'string' ? body.message
          : typeof body?.error === 'string' ? body.error
          : undefined;
      } catch { /* corpo não-JSON */ }
    }
    if (status === 401 || status === 403 || parsed.code === 'FORBIDDEN') {
      return { data: null, error: new Error(`403: Access denied (${functionName})`) };
    }
    return { 
      data: null, 
      error: new Error(serverMsg || parsed.message)
    };
  }
```
Os dois chamadores que testam o texto `403`/`Access denied` (`SignatureProvidersCard.tsx:54` e `useGlobalIntegrations.ts:42`) continuam a funcionar, porque 401 e 403 mantêm a mesma mensagem.

---

## A1 e A4 — "Marcar como assinado": contrato sem workspace, workspace sem membros e rota manual

Achados E2E-01 e CONF-03 (cliente), SIGN-06, E2E-04, CONF-10 e E2E-09.

**O que acontece.**
- `canonicalMarkAsSigned` (`src/lib/contractLifecycleSync.ts:173-181`) só ativa o workspace quando o contrato já o tem. Um contrato do CRM sem workspace fica ativo sem nada; num workspace sem membros a RPC rebenta.
- O único "Marcar como assinado" (`ContractDetailDrawer.tsx:1186`) exige `sigStatus === 'sent_for_signature'`, mas a rota `manual` acaba sempre em `pending_manual` (`staff_submit_signing`, `submit_signing` e o fallback sem chave do DocuSign/PandaDoc). Quem escolhe "Assinatura manual" no seletor do drawer fica com `pending` e sem botão. O único atalho visível ("Editar → Ativo") ativa o contrato sem assinatura e deixa o workspace pendente.
- Um contrato da rota nativa com contra-assinante fica `partially_signed` para sempre (não há ação de contra-assinatura).
- O `onClick` sai antes de invalidar as caches quando há erro, e faltam `['ops-action-prompts']` e `['pending-workspaces']` (pedidas na P2.8).

**Correção.**
1. Em `src/lib/contractLifecycleSync.ts`, a seguir a `import { supabase } from '@/lib/supabaseClient';` (`:21`) acrescente `import { invokeWithAuth } from '@/lib/invokeWithAuth';`. Mude o tipo de retorno de `canonicalMarkAsSigned` (`:153`) para:
```ts
): Promise<{ success: boolean; error?: string; syncError?: string; awaitingFounder?: boolean }> {
```
   Substitua o passo 1 (`:155-165`) por (grava as duas partes da assinatura e retira o `as any`):
```ts
    // 1. Update contract to signed (as duas partes, para não ficar em 'partially_signed')
    const { error: contractErr } = await supabase
      .from('startup_contracts')
      .update({
        signature_status: 'signed',
        signed_at: new Date().toISOString(),
        status: 'active',
        founder_signer_status: 'signed',
        counter_signer_status: 'signed',
      })
      .eq('id', contractId);

    if (contractErr) throw contractErr;

    const syncErrors: string[] = [];
    let awaitingFounder = false;
```
   Substitua o passo 3 (`:173-181`) por:
```ts
    // 3. Contrato do CRM sem workspace: criar/ligar (RPC idempotente). Se o workspace ainda não estiver ativo,
    //    criar a conta + membro founder no servidor ANTES de ativar (a ativação exige um membro ativo).
    let wsId = workspaceId;
    if (!wsId) {
      const { data: mintedWs, error: mintErr } = await supabase.rpc(
        'ensure_contract_workspace' as never,
        { p_contract_id: contractId } as never,
      );
      if (mintErr) syncErrors.push(`workspace_create: ${mintErr.message}`);
      else wsId = (mintedWs as unknown as string | null) ?? null;
    }
    if (wsId) {
      const { data: wsRow } = await supabase.from('workspaces').select('status').eq('id', wsId).maybeSingle();
      if (wsRow?.status !== 'active') {
        const { error: founderErr } = await invokeWithAuth('staff-assign-workspace-to-contract', {
          body: { contract_id: contractId, workspace_id: wsId },
        });
        if (founderErr) syncErrors.push(`founder_account: ${founderErr.message}`);
      }
      const { data: wsResult, error: wsErr } = await supabase.rpc('activate_workspace_for_signed_contract', {
        p_contract_id: contractId,
      });
      if (wsErr) syncErrors.push(`workspace_activate: ${wsErr.message}`);
      else if (wsResult === 'no_signed_contract') syncErrors.push('workspace_activate: no_signed_contract');
      else if (wsResult === 'awaiting_founder') awaitingFounder = true;
    }
```
   e o `return { success: true };` (`:192`) por `return { success: true, awaitingFounder };`. O `staff-assign-workspace-to-contract` cria a conta e o membro founder no servidor (aceita admin, consultor e backoffice) e só é chamado quando o workspace ainda não está ativo, para não mexer em renovações de startups já ativas.
2. Em `src/components/backoffice/contracts/ContractDetailDrawer.tsx`, substitua o bloco do botão (`:1185-1205`, do comentário `{/* Both manual routes: Mark as signed */}` até ao fim do `onClick`) por:
```tsx
        {/* Rotas manuais (incluindo o fallback 'pending_manual' do DocuSign/PandaDoc e a assinatura presencial)
            e contra-assinatura pendente na rota nativa: Marcar como assinado */}
        {['draft', 'pending_signature'].includes(contract.status) && (
          sigStatus === 'pending_manual'
          || ((provider === 'pandadoc_manual' || provider === 'manual') && sigStatus === 'sent_for_signature')
          || (provider === 'manual' && (!sigStatus || ['draft', 'pending'].includes(sigStatus)))
          || (provider === 'assinatura_digital' && sigStatus === 'partially_signed')
        ) && (
          <Button 
            size="sm" 
            variant="default"
            className="w-full gap-2 mt-4 bg-success hover:bg-success"
            onClick={async () => {
              const result = await canonicalMarkAsSigned(contract.id, contract.workspace_id || null);
              // O contrato fica ativo mesmo com falha a jusante: invalidar sempre
              queryClient.invalidateQueries({ queryKey: ['contracts'] });
              queryClient.invalidateQueries({ queryKey: ['contract-intakes'] });
              queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
              queryClient.invalidateQueries({ queryKey: ['workspaces'] });
              queryClient.invalidateQueries({ queryKey: ['ops-action-prompts'] });
              queryClient.invalidateQueries({ queryKey: ['pending-workspaces'] });
              if (!result.success) {
                notify.error(
                  result.error
                    || (result.syncError && `Sincronização parcial: ${result.syncError}`)
                    || 'Erro ao marcar como assinado'
                );
                return;
              }
              if (result.awaitingFounder) {
                notify.warn(t('contractDetail.markedSignedAwaitingFounder', {
                  defaultValue: 'Contrato assinado, mas o workspace continua pendente porque ainda não tem membros ativos. Convide o founder (ou atribua um consultor) e depois aprove o workspace em Aprovações.',
                }));
              } else {
                notify.success(t('contractDetail.markedAsSigned'));
              }
            }}
```
   O resto do botão (ícone e texto) fica igual. Na base, o `signature_status` por omissão de um contrato novo é `'pending'`, por isso o terceiro ramo cobre a assinatura presencial sem envio.

Validado: tsc sem erros; na base, como backoffice, um contrato do CRM sem workspace passa a ter workspace `pending` → founder → `active`; num workspace sem membros a RPC devolve `awaiting_founder` e o aviso explica o passo seguinte.

---

## A9 (cliente) — "Repor e reenviar" e fila de trabalho

Achados SIGN-08, SIGN-16 e CONF-09.
1. `ContractDetailDrawer.tsx:1044-1059`: o reset da P3.3 não limpa o contra-assinante do DocuSign/PandaDoc (reenviado pela rota nativa, o contrato fica `partially_signed` para sempre), não anula o link público e deixa a lead em `rejected` (os triggers de reenvio não a tiram de lá). Substitua o update e as duas verificações seguintes por:
```tsx
                  const { data: resetRows, error } = await supabase
                    .from('startup_contracts')
                    .update({
                      signature_status: 'draft',
                      status: 'draft',
                      provider_document_id: null,
                      docusign_envelope_id: null,
                      provider_last_error: null,
                      provider_last_event: null,
                      founder_signer_status: 'pending',
                      counter_signer_status: null,
                      // o próximo envio volta a resolver o contra-assinante (a rota nativa não contra-assina)
                      counter_signer_email: null,
                      counter_signer_name: null,
                      // o link público anterior deixa de servir
                      onboarding_token_hash: null,
                      onboarding_token_expires_at: null,
                    })
                    .eq('id', contract.id)
                    .select('id, funnel_item_id');
                  if (error) throw error;
                  if (!resetRows?.length) throw new Error(t('contractDetail.resetFailed', { defaultValue: 'Falha ao repor estado' }));
                  // a recusa pôs a lead em 'rejected' e os triggers de reenvio não a tiram de lá
                  if (resetRows[0].funnel_item_id) {
                    const { error: fiErr } = await supabase
                      .from('funnel_items')
                      .update({ stage: 'approved_for_signature' })
                      .eq('id', resetRows[0].funnel_item_id)
                      .eq('stage', 'rejected');
                    if (fiErr) logger.warn('contract_reset_funnel_stage_failed', { error: fiErr.message });
                  }
```
2. `src/components/staff/WorkQueuePanel.tsx:67-78`: a P3.10 criou os tipos `counter_sign_contract`, `financial_assumption_skipped` e `milestone_missed`, mas o painel não os tem em `TYPE_KEYS` (aparecem com o rótulo cru e não se filtram). Acrescente-os ao fim do array:
```ts
const TYPE_KEYS = [
  'triage',
  'outreach',
  'schedule_session',
  'post_session_followup',
  'overdue_actions',
  'missing_kpis',
  'stage_gate_review',
  'escalation',
  'validate_actions',
  'review_checkin',
  'counter_sign_contract',
  'financial_assumption_skipped',
  'milestone_missed',
];
```
   As chaves `workQueue.types.*` vêm no anexo de textos (Parte 4).

---

## A2 (cliente) — Link de acesso do founder em `/reset-password`

O email de acesso da Parte 1 aponta para `/reset-password?token_hash=…&type=recovery`. Em `src/pages/ResetPassword.tsx`, logo a seguir a `const url = new URL(window.location.href);` (`:36`), acrescente:
```tsx
        // Link de acesso do founder criado pelo contrato (token_hash do generateLink; o cliente é PKCE)
        const tokenHash = url.searchParams.get('token_hash');
        if (tokenHash && url.searchParams.get('type') === 'recovery') {
          const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (otpErr) throw otpErr;
          recoveryConfirmed = true;
          window.history.replaceState({}, '', '/reset-password');
          setVerifying(false);
          return;
        }
```
O `verifyOtp` com `type: 'recovery'` emite `PASSWORD_RECOVERY` e cria a sessão de recuperação; o resto da página (nova password) fica igual.

---

## A3 (cliente) — A página pública salta para a assinatura sem dados, documentos nem Regulamento

Achado SIGN-05. Na ROTA 1 ("Gerar e enviar link") o contrato fica `sent_for_signature` sem passar pelo `submit_signing`, e `PublicContractSigning.tsx:205-207` salta logo para o passo de assinatura: o founder assina sem confirmar os dados, sem documentos e sem aceitar o Regulamento V11 (`regulation_accepted_at` só é gravado no `submit_signing`). Em `src/pages/PublicContractSigning.tsx`:
1. Substitua `:205-207` por:
```tsx
      // Rota nativa: o founder só salta para a assinatura depois de aceitar o Regulamento (submit_signing).
      // Nos fornecedores externos (DocuSign/PandaDoc/manual) a assinatura já está a decorrer fora da página.
      const regulationAlreadyAccepted = !!(contract as any).regulation_accepted_at;
      const signatureClosed = ['completed', 'signed', 'partially_signed'].includes(contract.signature_status);
      const providerHandlesSigning = contract.signature_provider !== 'assinatura_digital';
      if (signatureClosed || (contract.signature_status === 'sent_for_signature' && (regulationAlreadyAccepted || providerHandlesSigning))) {
        setCurrentStep('signing');
      }
```
2. `:422-424` → `const isSigned = ['signed', 'completed', 'partially_signed'].includes(contract?.signature_status ?? '');`
3. `:1202` → `{(signSuccess || ['completed', 'signed', 'partially_signed'].includes(sigStatus)) ? (`
4. Para o founder ver as mensagens do servidor (por exemplo "Complete os passos anteriores…" ou o 409 de um contrato já assinado), acrescente antes de `export default function PublicContractSigning() {` (`:122`):
```tsx
/** Mensagem do servidor quando a função responde non-2xx (o FunctionsHttpError traz a Response em `context`). */
async function serverErrorMessage(error: unknown): Promise<string | undefined> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (typeof body?.message === 'string') return body.message;
      if (typeof body?.error === 'string') return body.error;
    } catch { /* corpo não-JSON */ }
  }
  return undefined;
}
```
   e troque `if (error) throw error;` por `if (error) throw new Error((await serverErrorMessage(error)) || error.message);` no `submitForSigning` (`:466`) e no `handleDigitalSign` (`:296`).

Sai no mesmo deploy que a A3 da Parte 1 (o servidor passa a exigir o Regulamento aceite antes do `digital_sign`).

**Terminar contrato** (`src/hooks/backoffice/useTerminateContract.ts:55-62`): o update passa a anular o link público e perde o `as any`:
```ts
    .update({
      status: 'terminated',
      terminated_at: nowIso,
      termination_reason: reason.trim(),
      // o link público de assinatura deixa de servir
      onboarding_token_hash: null,
      onboarding_token_expires_at: null,
    })
    .eq('id', contract.id);
```

---

## A5 (cliente) — Contrato do CRM sem fornecedor

Achados CRM-06 e E2E-05.
1. `src/components/crm/RecordDrawer.tsx`, no `insertPayload` de "Criar contrato e enviar" (`:583-596`), a seguir a `discount_start_date: …` (`:595`) acrescente:
```tsx
                      // o link enviado é o da assinatura nativa (/contract-signing)
                      signature_provider: 'assinatura_digital',
```
   (o servidor já faz o mesmo no `generate_token`; isto deixa o contrato coerente desde a criação).
2. `src/pages/PublicContractSigning.tsx:479-482`: no `onError` do `submitForSigning` retire o `setCurrentStep('signing');`. O founder fica no passo de revisão com o erro, em vez de ver "Assinatura manual em curso" quando nada foi submetido:
```tsx
    onError: (err: any) => {
      // não avançar: nada foi submetido (ex.: 422 signature_provider_not_configured)
      notify.error(err?.message || t('publicContract.errors.sendSigningFailed'));
    },
```

---

## A7 (cliente) — Lead criada pelo backoffice fica com o backoffice como "consultor"

Achado CRM-08. `NewLeadDialog.tsx:71` e `:91` põem sempre quem cria como dono da lead. Para o backoffice, a conversão copia-o para `assigned_consultor_id` e o workspace fica com um "consultor" que não é membro (0 membros). Em `src/components/crm/NewLeadDialog.tsx`:
```tsx
      // Só um consultor/admin fica dono por omissão (o backoffice não é consultor de startups)
      if (!next.owner_consultant_id && user?.id && consultors?.some(c => c.id === user.id)) next.owner_consultant_id = user.id;
      if (!next.program_id && programs && programs.length === 1) next.program_id = programs[0].id;
      return next;
    });
  }, [open, user?.id, programs, consultors]);
```
(substitui `:71` e as dependências em `:75`) e em `:91` → `owner_consultant_id: form.owner_consultant_id || null,`.

---

## A8 — O assistente de onboarding nunca abre depois da aprovação ou do contrato (MED)

Achados ONB-2, E2E-08 e E2E-06 (SQL na Parte 1).

**O que acontece.** O assistente em modo founder só abre com `?onboarding=true` (`WorkspaceDetail.tsx:94-100`), e esse parâmetro só é gerado no claim e no convite. Um founder cujo workspace foi aprovado, convertido ou criado por contrato aterra em `/my-workspaces` sem nada (o `ClaimedWorkspaceBanner` devolve `null` para `needs_onboarding`). O `needs_onboarding` fica `true` para sempre e, enquanto isso, a proteção de NIF e nome da P4.2 (`startup_is_established`) nunca se aplica. O CTA "Executar assistente" do `WorkspaceOverview` abre uma versão sem o passo Empresa e sem `complete_workspace_onboarding`. Se a RPC final falhar, o erro é engolido.

**Correção.**
1. `src/components/founder/ClaimedWorkspaceBanner.tsx`: a seguir ao ramo `has_active_workspace` (`:25-28`) acrescente (ícones, `Card`, `Button` e `navigate` já estão no ficheiro; as chaves já existem):
```tsx
  // Workspace ativo com o onboarding por fazer (criado por contrato, conversão ou candidatura aprovada)
  if (founderState.status === 'needs_onboarding' && founderState.activeWorkspaceId) {
    return (
      <Card className="rounded-xl border-primary/30 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{t('claimStartup.onboardingTitle', { defaultValue: 'Configurar o seu workspace' })}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('claimStartup.onboardingDesc', { defaultValue: 'Complete o processo de configuração para começar a utilizar a plataforma.' })}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/workspace/${founderState.activeWorkspaceId}?onboarding=true`)}>
                <ArrowRight className="h-3 w-3" />
                {t('claimStartup.startOnboarding', { defaultValue: 'Iniciar configuração' })}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
```
2. `src/pages/WorkspaceDetail.tsx:94-100`: abrir o assistente uma vez por sessão quando o onboarding está por fazer:
```tsx
  useEffect(() => {
    if (!workspace || !isFounder || myWorkspaceRole === undefined || myWorkspaceRole === 'team_member') return;
    // Workspace ativo com o onboarding por fazer: abrir o assistente uma vez por sessão (sem precisar de ?onboarding=true)
    const pending = workspace.needs_onboarding === true && (workspace.status === 'active' || workspace.status === 'claimed');
    const autoKey = `ws-onboarding-autoshown-${workspace.id}`;
    let autoShown = false;
    try { autoShown = sessionStorage.getItem(autoKey) === '1'; } catch { /* sessionStorage indisponível */ }
    if (shouldShowOnboarding || (pending && !autoShown)) {
      setShowOnboardingWizard(true);
      try { sessionStorage.setItem(autoKey, '1'); } catch { /* sessionStorage indisponível */ }
      if (shouldShowOnboarding) {
        searchParams.delete('onboarding');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [shouldShowOnboarding, workspace, isFounder, myWorkspaceRole, searchParams, setSearchParams]);
```
3. `src/components/workspace/WorkspaceOnboardingWizard.tsx`: importe `useQueryClient` (`import { useQueryClient } from '@tanstack/react-query';`) e declare `const queryClient = useQueryClient();` junto do `useTranslation` (`:308`). No `catch` de `handleSaveCompanyDetails` (`:518-520`) mostre a mensagem da P4.2 que ficou por aplicar:
```tsx
      logger.error('Failed to save company details', {}, err);
      // P4.2: dados de uma startup já estabelecida só mudam por pedido de alteração
      const msg = (err as { message?: string })?.message ?? '';
      notify.error(msg.includes('startup_change_requires_approval')
        ? t('onboardingWizard.changeNeedsApproval', { defaultValue: 'Estes dados já estão validados. Use Definições → pedido de alteração.' })
        : t('onboardingWizard.companyFailed', { defaultValue: 'Failed to save company details' }));
```
   e substitua `handleCompleteOnboarding` (`:527-541`) por:
```tsx
  const handleCompleteOnboarding = async () => {
    if (isFounderOnboarding) {
      // RPC bypasses the missing UPDATE policy on workspaces for founders.
      const { error } = await supabase.rpc('complete_workspace_onboarding', {
        p_workspace_id: workspaceId,
      });
      if (error) {
        logger.error('onboarding_completion_failed', { workspaceId }, error);
        notify.error(t('onboardingWizard.completeFailed', { defaultValue: 'Não foi possível concluir o onboarding. Tente novamente.' }));
        return;
      }
      logger.debug('onboarding_completed', { workspaceId });
      await queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    }
    onOpenChange(false);
  };
```
4. `src/components/workspace/WorkspaceOverview.tsx`: apague o `<WorkspaceOnboardingWizard … />` (`:382-389`), o estado `showOnboardingWizard` (`:129`) e o import (`:37`). O CTA (`:407`) passa a abrir o assistente completo do `WorkspaceDetail`:
```tsx
              {/* abre o assistente completo do WorkspaceDetail (com o passo Empresa e a conclusão do onboarding) */}
              <Button onClick={() => setSearchParams({ onboarding: 'true' })}>
```

Com a migração da Parte 1, os workspaces criados por contrato, conversão ou atribuição mantêm `needs_onboarding=true` (só o claim de um importado o dispensa) e a startup com contrato ativo fica protegida. As chaves novas (`onboardingWizard.completeFailed`, `onboardingWizard.changeNeedsApproval`) vêm no anexo de textos. Validado: tsc; na base, `T1 needs_onboarding mantém-se` e `claim importado: ativo e sem onboarding`.

**Dados já afetados** (founders com o onboarding por fazer; passam a ver o banner e o assistente):
```sql
SELECT w.id, s.name FROM public.workspaces w JOIN public.startups s ON s.id = w.startup_id
 WHERE w.status = 'active' AND w.needs_onboarding;
```

---

## A10 (cliente) — Terminar contrato não fecha o intake

Achados CONF-04 e SIGN-07. `useTerminateContract.ts:129-141` grava `status: 'terminated'` no intake (o enum não tem esse valor), ignora o erro e insere o evento na mesma. Substitua o bloco `if (intake && ![…].includes(…)) { … }` por:
```ts
    // O enum intake_status não tem 'terminated': um intake ainda por assinar fecha como 'cancelled'
    // (pára os lembretes ao founder); um intake já ativado mantém 'activated'.
    if (intake && !['cancelled', 'rejected', 'signed', 'activated'].includes(intake.status)) {
      const { error: intakeErr } = await supabase
        .from('contract_intakes')
        .update({ status: 'cancelled' })
        .eq('id', intake.id);
      if (intakeErr) {
        console.warn('[useTerminateContract] intake close failed', intakeErr.message);
      } else {
        await supabase.from('intake_events').insert({
          intake_id: intake.id,
          event_type: 'lifecycle_sync_terminated',
          from_status: intake.status,
          to_status: 'cancelled',
          metadata: { source: 'useTerminateContract', contract_id: contract.id, outcome: 'terminated' },
        });
      }
    }
```
A leitura do intake (`:121-127`) fica, porque a `:144` usa `intake?.funnel_item_id`.

---

**Fim da Parte 2.** Corra `bun run typecheck`, `bun run lint` e `bun run test`, e o harness. Teste à mão: (1) CRM → intake → contrato sem workspace → link → assinar: o founder recebe o email, define a password, entra e vê o banner do onboarding; (2) backoffice: lead sem consultor → converter → Marcar como assinado: aviso "workspace continua pendente"; (3) abrir o link de um contrato assinado: só leitura. Diga-me o que não aplicou antes de colar a Parte 3.


# PROMPT LOVABLE — RC10 · PARTE 3 de 4 — Restantes defeitos MED dos três fluxos

Mesmas regras da Parte 1. Pressupõe as Partes 1 e 2 aplicadas. Inclui os itens do RC9 que ficaram por aplicar ou a meio (P3.4, P3.5, código da P3.7, cliente da P3.11).

---

## Migração da Parte 3 (B1 a B5)

Crie **uma migração nova** com:
```sql
-- RC10 · Parte B — restantes defeitos MED dos fluxos (CRM, assinatura, onboarding)
-- Migração nova. CREATE OR REPLACE, políticas com DROP IF EXISTS e DO idempotentes: pode correr duas vezes.

-- ── B1. Terminar contrato com 'Arquivar workspace': nunca arquivar um workspace com outro contrato em vigor ──
CREATE OR REPLACE FUNCTION public.backoffice_archive_workspace(p_workspace_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_staff() OR public.can_access_backoffice()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- nunca arquivar um workspace que ainda tem outro contrato em vigor (vale também para o admin): devolve false
  IF EXISTS (SELECT 1 FROM public.startup_contracts c
              WHERE c.workspace_id = p_workspace_id AND c.status IN ('active','pending_signature','suspended')) THEN
    RETURN false;
  END IF;
  -- o backoffice só arquiva o workspace de um contrato terminado/expirado
  IF NOT public.is_staff() AND NOT EXISTS (SELECT 1 FROM public.startup_contracts c
              WHERE c.workspace_id = p_workspace_id AND c.status IN ('terminated','expired')) THEN
    RAISE EXCEPTION 'workspace_not_archivable' USING ERRCODE = '42501';
  END IF;
  UPDATE public.workspaces SET status = 'archived', archived_at = now(), updated_at = now()
   WHERE id = p_workspace_id AND status <> 'archived';
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.backoffice_archive_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.backoffice_archive_workspace(uuid) TO authenticated;

-- ── B2. Reenviar um convite falhava sempre: o trigger lia uma GUC que o PostgREST 12 já não define ──
CREATE OR REPLACE FUNCTION public.prevent_invitee_field_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_is_staff boolean;
BEGIN
  -- Service-role bypass (edge functions). auth.role() lê request.jwt.claims (PostgREST 12)
  -- e também a GUC legada request.jwt.claim.role.
  IF coalesce(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
                  AND role = ANY (ARRAY['admin'::app_role, 'consultor'::app_role])) INTO v_is_staff;
  IF v_is_staff THEN RETURN NEW; END IF;
  -- Non-staff (invitee): only accepted_at may change
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.startup_id IS DISTINCT FROM OLD.startup_id OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.token_hash IS DISTINCT FROM OLD.token_hash OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Invitees can only accept invitations; other fields are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

-- ── B3. Contas suspensas: o claim e as RPCs de staff do claim/atribuição só aprovam contas 'pending' ──
DO $$
DECLARE f regprocedure; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.claim_startup()'::regprocedure,
    'public.staff_create_workspace_for_claim(uuid,text,uuid,text,text)'::regprocedure,
    'public.staff_assign_or_create_workspace(uuid,text,uuid,text,uuid,text,text)'::regprocedure]
  LOOP
    d := pg_get_functiondef(f);
    IF position($q$account_status != 'approved'$q$ IN d) > 0 THEN
      EXECUTE replace(d, $q$account_status != 'approved'$q$, $q$account_status = 'pending'$q$);
    ELSIF position($q$account_status = 'pending'$q$ IN d) = 0 THEN
      RAISE EXCEPTION 'RC10 B3: padrão account_status não encontrado em %', f;
    END IF;
  END LOOP;
  -- um suspenso também não reclama uma startup importada (ficaria membro e bloquearia o founder legítimo)
  d := pg_get_functiondef('public.claim_startup()'::regprocedure);
  IF position('account_suspended' IN d) = 0 THEN
    IF position($q$SELECT email, email_confirmed_at$q$ IN d) = 0 THEN
      RAISE EXCEPTION 'RC10 B3: texto esperado não encontrado em claim_startup';
    END IF;
    EXECUTE replace(d, $q$SELECT email, email_confirmed_at$q$,
      $q$IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND account_status = 'suspended') THEN
    RAISE EXCEPTION 'account_suspended' USING ERRCODE = '42501';
  END IF;

  SELECT email, email_confirmed_at$q$);
  END IF;
END $$;

-- ── B4. Backoffice na ficha da lead (revê os intakes em /crm?open=): timeline, notas/chamadas/tarefas e consultores ──
DROP POLICY IF EXISTS "Backoffice can view CRM communications" ON public.communication_log;
CREATE POLICY "Backoffice can view CRM communications" ON public.communication_log
  FOR SELECT TO authenticated
  USING (public.is_backoffice() AND funnel_item_id IS NOT NULL);
DROP POLICY IF EXISTS "Backoffice can log CRM activities" ON public.communication_log;
CREATE POLICY "Backoffice can log CRM activities" ON public.communication_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_backoffice() AND funnel_item_id IS NOT NULL
              AND activity_type IN ('note','call','meeting','task'));
DROP POLICY IF EXISTS "Backoffice can update CRM tasks" ON public.communication_log;
CREATE POLICY "Backoffice can update CRM tasks" ON public.communication_log
  FOR UPDATE TO authenticated
  USING (public.is_backoffice() AND funnel_item_id IS NOT NULL AND activity_type = 'task')
  WITH CHECK (public.is_backoffice() AND funnel_item_id IS NOT NULL AND activity_type = 'task');

DROP POLICY IF EXISTS "Backoffice can view staff roles" ON public.user_roles;
CREATE POLICY "Backoffice can view staff roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (role IN ('admin'::public.app_role, 'consultor'::public.app_role) AND public.is_backoffice());

-- nomes dos consultores/admins para o backoffice (email/telefone continuam só para is_staff)
CREATE OR REPLACE FUNCTION public.safe_profiles()
 RETURNS TABLE(id uuid, full_name text, avatar_url text, bio text, expertise text[], email text, phone text, linkedin_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id,
         p.full_name,
         p.avatar_url,
         p.bio,
         p.expertise,
         CASE WHEN auth.uid() = p.id OR public.is_staff() THEN p.email END AS email,
         CASE WHEN auth.uid() = p.id OR public.is_staff() THEN p.phone END AS phone,
         CASE WHEN auth.uid() = p.id OR public.is_staff() THEN p.linkedin_url END AS linkedin_url,
         p.created_at,
         p.updated_at
    FROM public.profiles p
   WHERE auth.uid() IS NOT NULL
     AND (
       auth.uid() = p.id
       OR public.is_staff()
       OR (public.is_backoffice() AND EXISTS (
             SELECT 1 FROM public.user_roles r
              WHERE r.user_id = p.id AND r.role IN ('admin'::public.app_role, 'consultor'::public.app_role)))
       OR EXISTS (
         SELECT 1
           FROM public.workspace_users a
           JOIN public.workspace_users b ON a.workspace_id = b.workspace_id
          WHERE a.user_id = auth.uid() AND a.active
            AND b.user_id = p.id AND b.active
       )
     );
$function$;

-- ── B5. Contratos importados assinados cujo PDF canónico foi regravado pelo 'Gerar PDF': repor o original ──
UPDATE public.startup_contracts
   SET document_url = contract_pdf_path,
       pricing_snapshot_json = COALESCE(pricing_snapshot_json, '{}'::jsonb) || jsonb_build_object('pdf_bucket', 'contract-imports')
 WHERE signed_at IS NOT NULL AND document_url LIKE 'generated/%'
   AND contract_pdf_path IS NOT NULL AND contract_pdf_path <> document_url;
```

pgTAP a acrescentar (validado no nosso cenário):
- `backoffice_archive_workspace` num workspace com outro contrato `active` → `false` para backoffice **e** admin; só com contratos terminados → `true` para o backoffice;
- como `service_role`, `UPDATE workspace_invitations SET token_hash, expires_at, role` → 1 linha; um não-staff a mudar o papel → `throws_ok(..., '42501')`;
- conta `suspended` com uma startup importada com o seu email → `claim_startup()` → `throws_ok(..., '42501', 'account_suspended')` e o workspace continua `imported_unclaimed`; founder aprovado → `auto_claimed` (como hoje);
- backoffice: lê a timeline de uma lead, insere uma nota, não altera nem apaga um email do Outlook do consultor (0 linhas), vê nomes de consultores em `profiles_safe` (email a `NULL`); founder: 0 linhas na timeline e em `user_roles` de staff.

---

## B1 — Terminar com "Arquivar workspace" aborta a meio ou arquiva um workspace ainda sob contrato (MED)

Achado CONF-05. O diálogo de terminação tem "Arquivar workspace" ligado por omissão. Num workspace com outro contrato em vigor (não há nada que o impeça, e o painel lista "Contratos (N)"), o backoffice recebe `workspace_not_archivable` e o `throw` em `useTerminateContract.ts:104` salta o evento da terminação, o fecho do intake, o CRM e as notificações; repetir a ação volta a terminar e duplica tarefas. O admin, pelo contrário, arquiva um workspace que ainda tem um contrato ativo.

Correção: a RPC (migração acima) devolve `false` sem arquivar quando há outro contrato em vigor, para todos os papéis. Em `src/hooks/backoffice/useTerminateContract.ts`, substitua `:99-105` por (sem lançar, para os passos seguintes correrem sempre):
```ts
  // Sem lançar: o contrato já está terminado e os passos seguintes (evento, intake, CRM, notificações) têm de correr
  if (archiveWorkspace && contract.workspace_id) {
    const { data: archived, error: archErr } = await supabase.rpc('backoffice_archive_workspace', {
      p_workspace_id: contract.workspace_id,
    });
    if (archErr) {
      notify.warn(t('contractDetail.terminate.archiveFailed', {
        defaultValue: 'Contrato terminado, mas o workspace não foi arquivado: {{msg}}',
        msg: archErr.message,
      }));
    } else if (archived === false) {
      notify.warn(t('contractDetail.terminate.archiveSkipped', {
        defaultValue: 'Contrato terminado. O workspace não foi arquivado porque tem outro contrato em vigor.',
      }));
    }
  }
```
As chaves `contractDetail.terminate.archiveFailed` e `archiveSkipped` vêm no anexo de textos.

**Dados a rever** (workspaces arquivados por admins com contrato em vigor):
```sql
SELECT w.id FROM public.workspaces w
 WHERE w.status = 'archived'
   AND EXISTS (SELECT 1 FROM public.startup_contracts c
                WHERE c.workspace_id = w.id AND c.status IN ('active','pending_signature','suspended'));
```

---

## B2 — Não há forma de convidar cofundadores ou a equipa, e reenviar um convite falha sempre (MED)

Achado ONB-5.

**O que acontece.** `send-workspace-invite` só é chamado com `role: 'founder'` (Qualidade de Dados e conversão de lead). Não há UI para convidar um `team_member` ou um cofundador, e o separador Equipa manda usar um botão "Convidar Founder" que não existe (`TeamTab.tsx:152`; o "Adicionar membro" só grava no diretório `team_members`, sem acesso à plataforma). Pior: **reenviar a um email já convidado falha sempre**. O trigger `prevent_invitee_field_tampering` só deixa passar o `service_role` pela GUC legada `request.jwt.claim.role`, que o PostgREST 12 já não define; o `UPDATE` do convite existente (`send-workspace-invite:162-169`) lança "Invitees can only accept invitations" e a função responde 500. Provado no PostgREST 12.2.3: no RC10, PATCH do convite como `service_role` → 403 `42501`; com a correção → 200.

**Correção.**
1. Trigger (migração acima, B2): usa `auth.role()`, que lê `request.jwt.claims`.
2. `supabase/functions/send-workspace-invite/index.ts`, no update do convite existente (`:164-168`), acrescente `role: payload.role,` (a seguir a `created_by: user.id,`, `:167`).
3. `src/pages/WorkspaceDetail.tsx`: botão "Convidar" para admin e consultor. Imports a seguir a `import { Skeleton } from '@/components/ui/skeleton';` (`:8`):
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
```
   Estado, a seguir a `const [showOnboardingWizard, …] = useState(false);` (`:79`, antes de qualquer `return`):
```tsx
  // Convite de cofundadores / equipa (admin e consultor)
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'founder' | 'team_member'>('team_member');
  const [inviting, setInviting] = useState(false);
```
   A seguir a `copyWorkspaceLink` (`:338-341`):
```tsx
  const sendInvite = async () => {
    setInviting(true);
    const { error: inviteErr } = await invokeWithAuth('send-workspace-invite', {
      body: { workspaceId: workspace.id, startupId: workspace.startup_id, email: inviteEmail.trim(), role: inviteRole },
    });
    setInviting(false);
    if (inviteErr) {
      notify.error(inviteErr.message || t('invite.inviteFailed'));
      return;
    }
    notify.success(t('invite.sentTo', { email: inviteEmail.trim() }));
    setInviteOpen(false);
    setInviteEmail('');
  };
```
   Em `actions` (`:407`), antes do botão de copiar o link:
```tsx
          {(isAdmin || isConsultor) && (
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="px-2 sm:px-3">
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('invite.inviteMember', { defaultValue: 'Convidar' })}</span>
            </Button>
          )}
```
   E antes do `</AppLayout>` final (`:659`):
```tsx
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invite.inviteTitle', { defaultValue: 'Convidar para o workspace' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('invite.role', { defaultValue: 'Papel' })}</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'founder' | 'team_member')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="founder">{t('roles.founder', { defaultValue: 'Founder' })}</SelectItem>
                  <SelectItem value="team_member">{t('roles.team_member', { defaultValue: 'Membro da equipa' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={sendInvite} disabled={inviting || !inviteEmail.includes('@')}>{t('invite.sendInvite')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```
4. `src/components/workspace/TeamTab.tsx:152` e `src/hooks/useFunnel.ts:437` apontam para botões que não existem; os textos novos (`team.inviteHint`, `crm.convertInviteFailed`) vêm no anexo de textos. Atualize também os `defaultValue` destas duas chamadas para os mesmos textos do anexo.

Quem pode convidar continua a ser decidido pelo `send-workspace-invite` (admin e consultor; o backoffice só o founder da própria startup, Parte 1). Deixar o próprio founder convidar a equipa é uma decisão de produto: exigiria abrir a função aos founders ativos do workspace, e esse convite aprova a conta e contorna a allowlist (P2.12).

---

## B3 — Contas suspensas continuam a ser reativadas sem o admin (MED)

Achado ONB-3. A P1.1 e a P2.1 fecharam a reativação pelo perfil e pelo `approve_user_account`, mas três funções ainda aprovam qualquer conta que não esteja `approved`, incluindo as suspensas: `claim_startup()` (o próprio suspenso, com uma startup importada com o seu email, reativa-se e fica membro), `staff_create_workspace_for_claim` e `staff_assign_or_create_workspace`. A migração acima (B3) faz com que só aprovem contas `pending`, e um suspenso deixa de reclamar a startup importada. O `founderAccount.ts` da Parte 1 já não reativa suspensos. Prova: suspenso → `claim_startup()` → `account_suspended` e o workspace importado fica intacto; aprovado → `auto_claimed` como hoje.

---

## B4 — Backoffice na ficha da lead: timeline vazia, notas e tarefas falham, sem lista de consultores (MED)

Achado CRM-07. As notificações de intake abrem `/crm?open=…` e a revisão de intakes só existe na ficha da lead, mas as policies de `communication_log` e `user_roles` e a função `safe_profiles()` só servem `is_staff()`. O backoffice vê a timeline vazia, os inserts de nota, chamada e tarefa falham com RLS e o seletor de consultores fica vazio. A migração acima (B4) dá ao backoffice: leitura do que está ligado a leads, registo de notas, chamadas, reuniões e tarefas, e conclusão de tarefas (não altera nem apaga os emails do Outlook dos consultores sincronizados para a lead), e os nomes de admins e consultores (email e telefone continuam só para `is_staff()`).

A importação CSV continua só para admin e consultor (`bulk-import-leads` recusa o backoffice). Em `src/pages/CRM.tsx`, `:94` → `const { user, isAdmin, isConsultor } = useAuth();` e `:497` → `{(isAdmin || isConsultor) && <CsvLeadImport />}`.

---

## B5 — O PDF do contrato identifica mal o Segundo Outorgante e regrava o PDF de contratos assinados (MED)

Achados SIGN-02 e SIGN-03.

**O que acontece.** `generate-contract-pdf/index.ts:639-661` monta a cláusula do Segundo Outorgante com o nome e o NIF da startup, a morada **do edifício** e o contacto principal, e ignora os dados legais do contrato (`organization_name`, `company_nif`, `company_address`, `legal_representative_*`, `project_name`), que a P2.7 copia do intake precisamente para o PDF. Num contrato criado no CRM sem workspace sai "A N/A, NIPC n.º ___, com sede em ___". É o mesmo PDF que vai para o DocuSign/PandaDoc e que o signatário vê na rota nativa. Além disso (P1.4 incompleta), "Gerar PDF" e as chamadas internas (`download_pdf`) regravam sempre o `document_url` e o `pricing_snapshot_json`, também em contratos assinados: o PDF importado e assinado é substituído por um gerado.

**Correção** em `supabase/functions/generate-contract-pdf/index.ts`:
1. `:608` → `workspace:workspaces(id, startup:startups(name, nif, main_contact_name, main_contact_email, description, website, address)),`
2. Em `contractData`, substitua as linhas de `startupName` a `address` (`:641-646`) por:
```ts
      // Segundo Outorgante: os dados legais do contrato primeiro, a ficha da startup como recurso
      // (a morada do edifício não é a sede da startup; sem dados a linha fica em branco)
      startupName: contract.organization_name || startup?.name || 'N/A',
      startupDescription: startup?.description || null,
      nif: contract.company_nif || startup?.nif || null,
      contactName: contract.legal_representative_name || startup?.main_contact_name || null,
      contactEmail: contract.legal_representative_email || startup?.main_contact_email || null,
      address: [contract.company_address, contract.company_postal_code, contract.company_city].filter(Boolean).join(', ')
        || startup?.address || null,
```
   e `projectName` (`:660`) por `projectName: contract.project_name || startup?.name || contract.organization_name || null,`.
3. Substitua `:666-719` (de `// Store the generated document` até antes de `// Convert to base64 for response`) por:
```ts
    // Contrato fechado (assinado/ativo/terminado/expirado): devolve só a pré-visualização, nunca regrava o PDF canónico
    const isLocked = !!contract.signed_at || !['draft', 'pending_signature'].includes(String(contract.status))
    const fileName = `contract_${contract.contract_number || contractId.slice(0, 8)}_${Date.now()}.pdf`
    let documentPath: string | null = isLocked ? (contract.document_url ?? null) : `generated/${fileName}`
    if (!isLocked) {
      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(`generated/${fileName}`, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })
      if (uploadError) {
        console.error('Upload error:', uploadError)
        documentPath = null
      } else {
        // Update contract with document URL + pricing snapshot
        const pricingSnapshot = {
          monthly_fee: contractData.monthlyFee,
          effective_fee: contractData.effectiveFee,
          discount_percentage: contractData.discountPercentage,
          discount_months: contractData.discountMonths,
          incubation_type: contractData.incubationType,
          is_virtual: contractData.isVirtual,
          square_meters: contractData.squareMeters,
          building: contractData.buildingName,
          currency: contractData.currency,
          snapshot_date: new Date().toISOString(),
          regulation_version: 'V11-REG-2026',
          contract_template_version: 'V9',
        }
        const { error: docUpdErr } = await supabase
          .from('startup_contracts')
          .update({
            document_url: documentPath,
            regulation_version: 'V11-REG-2026',
            contract_template_version: 'V9',
            pricing_snapshot_json: pricingSnapshot,
          })
          .eq('id', contractId)
        if (docUpdErr) console.error('document_url update failed:', docUpdErr.message)
      }

      // Log direct user-initiated generation. Internal public-token generation is
      // already mediated by public-contract-onboarding and has no authenticated user.
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          entity_type: 'contract',
          entity_id: contractId,
          action: 'pdf_generated',
          workspace_id: contract.workspace_id,
          metadata: { document_path: documentPath },
        })
      }
    }
```
   A resposta (`documentBase64`, `documentPath`, `fileName`) fica igual. As rotas de assinatura correm com o contrato em `draft`/`pending_signature` e não são afetadas. A migração acima (B5) repõe o PDF importado dos contratos assinados afetados.

Validado com deno check; o select novo dá 200 no PostgREST.

---

## B6 — Separador Contexto da lead vazio (P3.5 não aplicada) (MED)

Achados CONF-01 e CRM-03. `src/components/crm/drawer/LinkedContextPanel.tsx:104` e `:120` pedem `startups.sector`, que não existe: as duas queries dão 42703 e o painel mostra só os contratos, ou "Sem contexto associado", chegando a oferecer "Criar contrato e enviar" a uma lead já convertida.
- `:104` → `.select('id, stage, status, startup:startups(id, name, main_contact_email, main_contact_name), program:programs(id, name)')`
- `:120` → `.select('id, name, main_contact_email, main_contact_name')`
- apague os dois blocos que mostram o sector (`:255-259` e `:281-285`).

---

## B7 — "Eliminar lead" apaga a lead e todo o histórico, e o "Anular" falha sempre (código da P3.7) (MED)

Achados CONF-02 e CRM-04. `EcosystemTable.tsx:177-264` faz `DELETE` da lead (há seis FKs `ON DELETE CASCADE`: eventos, emails, recaps, lista de espera…) e o "Anular" reinsere o snapshot com `select('*')`, o que falha sempre (`email_normalized` é uma coluna gerada, 428C9). Substitua `handleDeleteLead` inteira (`:177-264`) por:
```tsx
  const handleDeleteLead = async (item: EcosystemItem) => {
    const leadId = item.funnel_item_id;
    if (!leadId) return;
    try {
      // Arquivar em vez de apagar: o DELETE em cascata levava o histórico (eventos, emails, chamadas)
      // e o 'Anular' falhava sempre (email_normalized é uma coluna gerada)
      const { data: before } = await supabase.from('funnel_items').select('stage').eq('id', leadId).maybeSingle();
      const prevStage = before?.stage ?? 'new';
      const { data: upd, error } = await supabase
        .from('funnel_items')
        .update({ stage: 'archived', updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .select('id');
      if (error) throw error;
      if (!upd?.length) throw new Error('Sem permissão para arquivar esta lead.');
      const { data: authData } = await supabase.auth.getUser();
      const performedBy = authData.user?.id ?? null;
      await supabase.from('funnel_events').insert({
        funnel_item_id: leadId, event_type: 'archived', from_stage: prevStage, to_stage: 'archived', performed_by: performedBy,
      });
      let undoInFlight = false;
      notify.success(t('ecosystem.leadDeleted', { defaultValue: 'Lead arquivada' }), {
        duration: 8000,
        action: {
          label: t('common.undo', { defaultValue: 'Anular' }),
          onClick: async () => {
            if (undoInFlight) return;
            undoInFlight = true;
            const { data: back, error: undoErr } = await supabase
              .from('funnel_items')
              .update({ stage: prevStage, updated_at: new Date().toISOString() })
              .eq('id', leadId)
              .eq('stage', 'archived')
              .select('id');
            if (undoErr || !back?.length) {
              notify.error(t('common.undoFailed', { defaultValue: 'Não foi possível anular' }));
            } else {
              await supabase.from('funnel_events').insert({
                funnel_item_id: leadId, event_type: 'unarchived', from_stage: 'archived', to_stage: prevStage, performed_by: performedBy,
              });
              notify.success(t('ecosystem.leadRestored', { defaultValue: 'Lead restaurada' }));
            }
            queryClient.invalidateQueries({ queryKey: ['ecosystem-items-v2'] });
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['ecosystem-items-v2'] });
    } catch (err: any) {
      notify.error(t('ecosystem.deleteLeadError', { defaultValue: 'Erro ao arquivar a lead' }), { description: err?.message || undefined });
    }
  };
```
e no botão de confirmação (`:595`) troque `t('common.delete', { defaultValue: 'Eliminar' })` por `t('common.archive', { defaultValue: 'Arquivar' })`. Os textos (`ecosystem.deleteLead`, `leadDeleted`, `confirmDeleteTitle`, `confirmDeleteDesc`, `deleteLeadError`) vêm no anexo, com os mesmos valores do anexo do RC9; hoje `confirmDeleteDesc` mostra o placeholder "Confirmar Eliminar Desc". O `trigger sync_funnel_stage_to_contract` não mexe em contratos quando a fase passa a `archived`, e uma assinatura posterior repõe a lead em `contracted`.

---

## B8 — A pesquisa global nunca devolve contratos (P3.4 só em parte) (MED)

Achados CONF-06 e SIGN-10. `src/hooks/useGlobalSearch.ts:404` faz `startup:startups(name)` a partir de `startup_contracts` (não há FK direta: PGRST200) e o link usa `?contract=` em vez de `?open=` (`AdminContracts.tsx:111`). Substitua o select (`:404`) e o `map` (`:413-416`):
```ts
            .select('id, contract_number, status, updated_at, workspace_id, organization_name, workspace:workspaces(startup:startups(name))')
```
```ts
            snippet: `${c.workspace?.startup?.name || c.organization_name || ''} • ${c.status || ''}`,
            updated_at: c.updated_at,
            url: `/admin/contracts?open=${c.id}`,
            workspace_name: c.workspace?.startup?.name || c.organization_name,
```

---

## B9 — Avisos: "Enviar para todas" inclui startups arquivadas e pendentes, Teams não faz nada e falhas de email aparecem como sucesso (cliente da P3.11) (MED)

Achado CONF-07. Em `src/components/admin/AdminAnnouncementsManager.tsx`:
1. Query das startups (`:74-75`):
```tsx
        .select('id, startup:startups(id, name)')
        // 'Enviar para todas' só abrange startups ativas (nunca arquivadas, rejeitadas ou pendentes)
        .eq('status', 'active')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
```
2. Substitua o envio e o `onSuccess` (`:131-154`, de `// Send emails if option is enabled` até ao `},` que fecha o `onSuccess`; o `onError` da `:155` fica):
```tsx
      // Send emails if option is enabled (a função responde 200 com errors[] quando alguns envios falham)
      if (data.sendEmail && insertedAnnouncements?.length) {
        const { data: emailData, error: emailError } = await invokeWithAuth<{ emailsSent: number; errors?: string[] }>(
          'send-announcement-email',
          { body: { announcement_ids: insertedAnnouncements.map((a) => a.id) } },
        );
        if (emailError || (emailData?.errors?.length ?? 0) > 0) {
          logger.error('Email send error', { errors: emailData?.errors }, emailError ?? undefined);
          return { emailOk: false };
        }
        return { emailOk: true };
      }
      return { emailOk: null };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      if (res?.emailOk === false) notify.warn(t('admin.announcements.emailFailed'));
      else notify.success(res?.emailOk ? t('admin.announcements.sentWithEmail') : t('admin.announcements.sent'));
      setFormData(EMPTY_FORM);
      setIsDialogOpen(false);
    },
```
3. Apague o bloco das duas checkboxes (`:321-344`, o `div` com "sendEmail" e "sendTeams"): nenhum código lê `send_teams` e nenhum ecrã de founder lê os avisos, por isso o email é sempre enviado (`sendEmail: true` já é o valor de `EMPTY_FORM`). Retire `Send` e `MessageSquare` do import de `lucide-react` (`:17`).

---

## B10 — Renovações que não prolongam a sala (MED)

Achado SIGN-11 (mesma raiz da P3.1).
1. `supabase/functions/check-contract-anniversaries/index.ts`, auto-renovação (`:271-282`): as alocações do contrato e as do workspace sem contrato que acabavam com ele acompanham a renovação. Substitua o cálculo e o update do contrato por:
```ts
            const newEnd = new Date(endDate)
            newEnd.setMonth(newEnd.getMonth() + renewalMonths)
            const newEndStr = newEnd.toISOString().split('T')[0]
            await supabase.from('startup_contracts')
              .update({ end_date: newEndStr })
              .eq('id', contract.id)
            // Mesma regra da renovação manual (P3.1): as alocações deste contrato e as do workspace
            // sem contrato que acabavam com ele acompanham a renovação
            const allocOwner = contract.workspace_id
              ? `contract_id.eq.${contract.id},and(workspace_id.eq.${contract.workspace_id},contract_id.is.null)`
              : `contract_id.eq.${contract.id}`
            const { error: allocErr } = await supabase.from('room_allocations')
              .update({ end_date: newEndStr })
              .or(allocOwner)
              .eq('end_date', contract.end_date)
            if (allocErr) console.warn('[check-contract-anniversaries] room allocation not extended', allocErr.message)
```
   e use `newEndStr` no `new_end_date` do evento `auto_renewed`.
2. `src/components/backoffice/ContractLifecycleEventsCard.tsx`: o "Renovar" do cartão não encontra as alocações criadas em Espaços (só com `workspace_id`). Acrescente `workspace_id: string | null;` à interface `ContractForEvents` (`:23`) e `workspace_id,` ao select (`:59`): `id, workspace_id, start_date, end_date, status, monthly_fee, contract_number,`.

---

## B11 — Marcação pública: calendário de um consultor, reunião noutro; e URLs de upload para qualquer token (MED)

Achados CRM-02 e CRM-10.
1. Round-robin: `pickRoundRobin` avança o contador em **cada** chamada, por isso o `get_slots` mostra o calendário de um consultor e a marcação seguinte grava noutro. Em `supabase/functions/_shared/first-contact-routing.ts`: em `ResolveInput` (`:31`) acrescente `advanceRoundRobin?: boolean;   // false = só consultar (get_slots): mostra o consultor que a marcação vai usar`; `pickConsultantForRouting` (`:91-108`) passa a:
```ts
async function pickConsultantForRouting(
  supabase: any,
  routing: {
    id: string;
    mode: string;
    consultant_ids: string[];
    round_robin_index: number | null;
  },
  advance: boolean,
): Promise<string | null> {
  const list = (routing.consultant_ids ?? []).filter((x) => !!x);
  if (list.length === 0) return null;

  // Modes we support: fixed / first / global / program → first entry;
  // round_robin → advance counter (ou só pré-visualizar o próximo, sem avançar).
  if (routing.mode === 'round_robin') {
    if (!advance) return list[((routing.round_robin_index ?? 0) + 1) % list.length];
    return await pickRoundRobin(supabase, routing);
  }
  return list[0];
}
```
   `resolveFirstContactRoute` recebe `advanceRoundRobin = true` na desestruturação (`:111-115`) e a `:211` passa a `const consultantId = await pickConsultantForRouting(supabase, chosen, advanceRoundRobin);`. Em `supabase/functions/public-get-availability/index.ts`, na chamada do `get_slots` (`:449-454`), acrescente `advanceRoundRobin: false,`. A marcação mantém o default (avança). A pré-visualização devolve exatamente o consultor que a chamada seguinte vai escolher.
2. `upload_url` (P2.13): um token desconhecido deixa `linkData` a `null` sem `return`, e o rate limit é por token, por isso cada token inventado tem a sua quota e recebe URLs de upload assinados. Em `public-get-availability/index.ts`, dentro de `if (action === "upload_url") {`, logo a seguir ao teste de extensão (`:391-393`), acrescente:
```ts
      // O token tem de ser um link ativo e não expirado (ou 'demo'). A ação 'validate' aceita qualquer token,
      // por isso não basta "fazer como no validate"; e não usamos resolveFirstContactRoute aqui
      // (falharia sem rota global quando o visitante escolheu um programa).
      if (token !== 'demo') {
        const upHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
        const upHash = Array.from(new Uint8Array(upHashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
        const { data: upLink } = await supabase
          .from("public_booking_links")
          .select("id, expires_at")
          .eq("token_hash", upHash)
          .eq("active", true)
          .maybeSingle();
        if (!upLink || (upLink.expires_at && new Date(upLink.expires_at) < new Date())) {
          return corsJsonResponse({ error: "Invalid booking link" }, req, 403);
        }
      }
```
   (Não use `resolveFirstContactRoute` aqui: falharia sem rota global quando o visitante escolheu um programa, e o pitch deck de um visitante legítimo daria 403.)

---

## B12 — Importação CSV: uma linha repetida faz falhar a importação inteira com "403: Access denied" (MED)

Achado CRM-09. `bulk-import-leads` só deteta emails repetidos; duas linhas iguais têm o mesmo `row_hash` e violam `UNIQUE (batch_id, row_hash)`, a função devolve 500 e o cliente mostrava "403" (corrigido pela A11). Em `supabase/functions/bulk-import-leads/index.ts`, a seguir a `const seenEmails = new Set<string>();` (`:124`) acrescente `const seenHashes = new Set<string>();` e substitua `:139-149` por:
```ts
        const hasIdentity = !!(name || email);
        const emailValid = !email || EMAIL_REGEX.test(email);
        let row_hash = await sha256Hex([name, email, phone, organization, source, notes, value ?? ""].join("|"));
        const isDuplicateRow = seenHashes.has(row_hash);
        const isDuplicate = isDuplicateRow || (!!email && seenEmails.has(email));
        const valid = hasIdentity && emailValid && !isDuplicate;
        let error: string | null = null;
        if (!hasIdentity) error = "Missing name or email";
        else if (!emailValid) error = "Invalid email";
        else if (isDuplicateRow) error = "Duplicate row in file";
        else if (isDuplicate) error = "Duplicate email in file";
        if (email) seenEmails.add(email);
        seenHashes.add(row_hash);
        // UNIQUE (batch_id, row_hash): uma linha repetida fica inválida e com hash próprio
        if (isDuplicateRow) row_hash = await sha256Hex(`${row_hash}|dup|${i}`);
```
e no `catch` final (`:254`) troque `const msg = e instanceof Error ? e.message : "unknown";` por `const msg = (e as { message?: string })?.message ?? "unknown";` (um `PostgrestError` não é `Error`).

---

**Fim da Parte 3.** Corra o harness, `bun run typecheck`, `bun run lint` e `bun run test`, e faça deploy de `send-workspace-invite`, `generate-contract-pdf`, `check-contract-anniversaries`, `public-get-availability`, `public-book-first-contact` (usa o `_shared/first-contact-routing.ts`) e `bulk-import-leads`. Diga-me o que não aplicou antes de colar a Parte 4.


# PROMPT LOVABLE — RC10 · PARTE 4 de 4 — Defeitos LOW e textos

Mesmas regras da Parte 1. Pressupõe as Partes 1 a 3 aplicadas. Depois desta parte, cole a **Parte 5 do RC9** (continua por aplicar e foi revalidada sobre o RC10).

---

## Migração da Parte 4 (C1 a C5)

Crie **uma migração nova** com:
```sql
-- RC10 · Parte C — defeitos LOW
-- Migração nova. Idempotente: pode correr duas vezes.

-- ── C1. first_contact_outbox sem consumidor: alertar o staff quando o convite Teams ou o email ao consultor falha ──
CREATE OR REPLACE FUNCTION public.check_first_contact_outbox()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.system_alerts (kind, severity, dedupe_key, payload)
  SELECT 'first_contact_outbox_stuck', 'high', 'first_contact_outbox:' || o.id::text,
         jsonb_build_object('outbox_id', o.id, 'funnel_item_id', o.funnel_item_id, 'kind', o.kind,
                            'status', o.status, 'last_error', o.last_error, 'created_at', o.created_at)
    FROM public.first_contact_outbox o
   WHERE o.kind IN ('graph_event', 'consultant_email')
     AND o.status IN ('pending', 'in_progress', 'failed')
     AND o.created_at < now() - interval '30 minutes'
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.check_first_contact_outbox() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_first_contact_outbox() TO service_role;
DO $do$
BEGIN
  PERFORM cron.unschedule('check-first-contact-outbox')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-first-contact-outbox');
  PERFORM cron.schedule('check-first-contact-outbox', '7 * * * *',
    $cron$SELECT public.cron_invoke_rpc('check_first_contact_outbox', 'public.check_first_contact_outbox()')$cron$);
END $do$;
INSERT INTO public.automation_health_expectations (job_name, expected_cadence_seconds, grace_seconds, severity)
VALUES ('check_first_contact_outbox', 3600, 900, 'low')
ON CONFLICT (job_name) DO NOTHING;

-- ── C2. Importador HubSpot v2 (flag desligada): o commit corre com service role e grava tipos válidos ──
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.commit_import_funnel_item(uuid,uuid,uuid,timestamptz,jsonb,jsonb,text,text[])'::regprocedure);
  IF position($q$coalesce(auth.role(), '') = 'service_role'$q$ IN d) > 0 THEN
    RETURN;  -- já aplicado
  END IF;
  IF position($q$IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'backoffice')) THEN$q$ IN d) = 0
     OR position($q$COALESCE(p_payload->>'type','startup')$q$ IN d) = 0 THEN
    RAISE EXCEPTION 'RC10 C2: texto esperado não encontrado em commit_import_funnel_item';
  END IF;
  d := replace(d, $q$IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'backoffice')) THEN$q$,
                  $q$IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'backoffice')) THEN$q$);
  d := replace(d, $q$COALESCE(p_payload->>'type','startup')$q$,
                  $q$CASE WHEN p_payload->>'type' IN ('lead','contract','startup_candidate','startup_active') THEN p_payload->>'type' ELSE 'lead' END$q$);
  EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION public.commit_import_funnel_item(uuid,uuid,uuid,timestamptz,jsonb,jsonb,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_import_funnel_item(uuid,uuid,uuid,timestamptz,jsonb,jsonb,text,text[]) TO service_role;

-- ── C3. apply_contract_patch: SECURITY DEFINER sem verificação de papel e sem chamadores ──
REVOKE ALL ON FUNCTION public.apply_contract_patch(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_contract_patch(uuid, jsonb, text) TO service_role;

-- ── C4. O backoffice aprova candidaturas: tem de ver quem as submeteu ──
DROP POLICY IF EXISTS "Backoffice can view workspace users" ON public.workspace_users;
CREATE POLICY "Backoffice can view workspace users" ON public.workspace_users
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'backoffice'::public.app_role));

-- ── C5. 'Associar' nas sugestões de 'Atribuir Workspace' não reativa workspaces arquivadas ou rejeitadas ──
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.staff_assign_or_create_workspace(uuid,text,uuid,text,uuid,text,text)'::regprocedure);
  IF position('workspace_archived_or_rejected' IN d) > 0 THEN RETURN; END IF;  -- já aplicado
  IF position($q$SELECT w.startup_id INTO v_startup_id FROM public.workspaces w WHERE w.id = v_workspace_id;$q$ IN d) = 0 THEN
    RAISE EXCEPTION 'RC10 C5: texto esperado não encontrado em staff_assign_or_create_workspace';
  END IF;
  d := replace(d, $q$SELECT w.startup_id INTO v_startup_id FROM public.workspaces w WHERE w.id = v_workspace_id;$q$,
    $q$SELECT w.startup_id INTO v_startup_id FROM public.workspaces w WHERE w.id = v_workspace_id;
    IF EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = v_workspace_id AND w.status IN ('archived','rejected')) THEN
      RAISE EXCEPTION 'workspace_archived_or_rejected' USING ERRCODE = '22023';
    END IF;$q$);
  EXECUTE d;
END $$;
```

- **C1** (CRM-17): `first_contact_outbox` não tem consumidor; quando o convite Teams ou o email ao consultor de uma marcação pública falha, ninguém sabe. O cron horário gera um `system_alert` por efeito preso há mais de 30 minutos (sem duplicados) e entra no painel de saúde das automações.
- **C2** (CRM-20): o commit do importador HubSpot v2 (flag desligada) falha sempre (`forbidden` com service role e tipo `'startup'` inválido). Só relevante se ligar a flag.
- **C3** (SIGN-12): `apply_contract_patch` é `SECURITY DEFINER` sem verificação de papel e executável por qualquer `authenticated` (hoje falha por uma coluna inexistente; não tem chamadores).
- **C4** (ONB-6, P3.14): o backoffice aprova candidaturas sem ver quem as submeteu.
- **C5** (ONB-7, P3.23): no separador de sugestões de "Atribuir Workspace", "Associar" reativa workspaces arquivados ou rejeitados. Acrescente também, em `src/components/admin/WorkspaceAssignmentDialog.tsx:76-77`, o filtro de estado à query das sugestões:
```tsx
        .select('id, startup_id, status, stage, program:programs(id, name)')
        .in('startup_id', startupIds)
        // nunca sugerir workspaces arquivadas ou rejeitadas ('Associar' reativava-as)
        .in('status', ['imported_unclaimed', 'active', 'claimed', 'pending']);
```

Validado: replay limpo, suites a passar, segunda aplicação sem erro; C1 cria 1 alerta e 0 na repetição; C3 `authenticated` sem `EXECUTE`; C5 → `workspace_archived_or_rejected`.

Não incluímos uma restrição `CHECK (role IN ('founder','team_member'))` em `workspace_invitations` (achado ONB-13, latente): a suite `invitation_acceptance.test.sql` do repositório usa de propósito um convite `mentor_externo` para testar que não dá o papel founder, e a função de envio já só aceita `founder`/`team_member`.

---

## C6 — "Pedir correções": a falha do email aparece como sucesso (resto da P3.8)

Achados CRM-11, CONF-08 e E2E-14. `src/hooks/useContractIntakes.ts:409-426` envolve `invokeWithAuth` num `try/catch`, mas `invokeWithAuth` não lança. Substitua o `try { … } catch (emailErr) { … }` por:
```ts
            // invokeWithAuth não lança: ler o erro devolvido (antes, a falha do email aparecia como sucesso)
            const { error: mailErr } = await invokeWithAuth('send-intake-email', {
              body: {
                type: 'changes_requested',
                intakeId: params.intakeId,
                recipientEmail: preparedChangesRequestedEmail.recipientEmail,
                recipientName: preparedChangesRequestedEmail.recipientName,
                organizationName: preparedChangesRequestedEmail.organizationName,
                intakeToken: preparedChangesRequestedEmail.intakeToken,
                changesNotes: params.notes,
              },
            });
            if (mailErr) {
              logger.error('changes_requested_email_failed', { error: mailErr.message });
              // Send failed BEFORE any DB status change — safe to abort cleanly.
              throw new Error(`Falha ao enviar o email de pedido de correções ao fundador: ${mailErr.message}. Nenhuma alteração foi guardada; tente novamente.`);
            }
```
Nos outros dois sítios da P3.8, leia o `{ error }` e registe-o **sem lançar** (são de melhor esforço):
- `src/hooks/useSessions.ts:122`: `const { error: inviteErr } = await invokeWithAuth('send-session-invite', { … });` e, depois da chamada, `if (inviteErr) logger.warn('session_invite_email_failed', { sessionId: session.id, kind, error: inviteErr.message });`
- `src/pages/BulkContractImport.tsx:231`: substitua o `try { await invokeWithAuth('bulk-import-extract', …) } catch (e) { … }` por:
```tsx
      // invokeWithAuth não lança: ler o erro (a linha fica por extrair e o ciclo continua)
      const { error: extractErr } = await invokeWithAuth('bulk-import-extract', { body: { row_id: rowId } });
      if (extractErr) logger.warn('Extract failed', { rowId, error: extractErr.message });
```

---

## C7 — Quadro e Inbox do CRM sem paginação; pesquisa com vírgula deixa o quadro vazio

Achados CRM-12 e CRM-18. `useCrmPipeline.ts:38-59` e `useCrmInbox.ts:89-114` fazem uma única query (o Supabase corta em 1000 linhas, sem erro) e uma pesquisa como "Silva, Lda" parte o filtro `.or()` (PGRST100) e esvazia o quadro. Em `src/hooks/useCrmPipeline.ts` importe `import { fetchAllRows } from '@/lib/fetchAllRows';` e substitua `:38-59` (de `let query = supabase` até `if (error) throw error;`) por:
```ts
      // Paginado (o PostgREST corta em 1000 linhas) e com ordem estável entre páginas
      const items = await fetchAllRows((from, to) => {
        let query = supabase
          .from('funnel_items')
          .select(FUNNEL_ITEM_FIELDS)
          .in('stage', stagesFilter)
          .order('next_action_at', { ascending: true, nullsFirst: false })
          .order('id')
          .range(from, to);

        if (filters?.programId) {
          query = query.eq('program_id', filters.programId);
        }
        if (filters?.assigneeId) {
          query = query.eq('owner_consultant_id', filters.assigneeId);
        }
        if (filters?.myItemsOnly && filters?.currentUserId) {
          query = query.eq('owner_consultant_id', filters.currentUserId);
        }
        // vírgulas e parênteses partem o filtro .or() do PostgREST
        const term = filters?.search?.replace(/[,()]/g, ' ').trim();
        if (term) {
          const searchTerm = `%${term}%`;
          query = query.or(`organization_name.ilike.${searchTerm},contact_name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`);
        }
        return query;
      });
```
Faça o mesmo em `src/hooks/useCrmInbox.ts:89-115`, mantendo o `.not('stage', 'in', '(rejected,archived)')` e os filtros `stages`/`stage` dessa query. O resto de cada `queryFn` usa `items` como antes.

---

## C8 — Lembretes de intake: três lembretes em três dias depois de "Pedir correções"

Achado CRM-14. A cadência D+2, D+5, D+10 conta a partir da criação do intake; depois de "Pedir correções" (contador a zero) saem três lembretes seguidos, e cada um roda o token e invalida o link anterior. Em `supabase/functions/run-intake-reminders/index.ts`: acrescente `updated_at` ao select (`:102`) e substitua `:117-118` e `:127-130` por:
```ts
        // Depois de 'Pedir correções' a contagem recomeça nesse momento (updated_at), não na criação
        const baseDate = new Date(intake.status === 'changes_requested' ? (intake.updated_at ?? intake.created_at) : intake.created_at)
        const daysSinceBase = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
```
```ts
        // (intervalos contados desde o último lembrete: D+2, D+5, D+10 e depois semanal)
        if (count === 0 && daysSinceBase >= 2) shouldSend = true
        else if (count === 1 && daysSinceLastReminder >= 3) shouldSend = true
        else if (count === 2 && daysSinceLastReminder >= 5) shouldSend = true
        else if (count >= 3 && daysSinceLastReminder >= 7) shouldSend = true
```

---

## C9 — Intake público: formulário editável depois de aprovado; lead parada; backoffice sem aviso

Achados CRM-15 e E2E-13.
1. `src/pages/PublicContractIntake.tsx`: importe `import { CUSTOMER_EDITABLE_STATES, type IntakeState } from '@/constants/intakeStates';` e troque `:207` por `const isSubmitted = !!intake && !CUSTOMER_EDITABLE_STATES.includes(intake.status as IntakeState);` (hoje, depois de aprovado ou cancelado, mostra o formulário editável).
2. `supabase/functions/public-contract-onboarding/index.ts`: nos selects do `intake_save_draft` (`:478`) e do `intake_submit_by_token` (`:577`) use `.select('id, status, intake_token_expires_at, funnel_item_id')`. A seguir ao bloco `if (dUpdErr) { … }` do `intake_save_draft` (`:548-552`):
```ts
      // CRM: o founder começou a preencher (sem recuar fases posteriores)
      if (patch.status === 'intake_in_progress' && intakeDraft.funnel_item_id) {
        await supabase.from('funnel_items').update({ stage: 'intake_filling' })
          .eq('id', intakeDraft.funnel_item_id).eq('stage', 'intake_requested')
      }
```
   A seguir a `if (updateErr) throw updateErr` do `intake_submit_by_token` (`:633`):
```ts
      // CRM: a lead passa a "Submetido" (sem recuar fases posteriores)
      if (intake.funnel_item_id) {
        const { error: crmErr } = await supabase.from('funnel_items')
          .update({ stage: 'intake_submitted' })
          .eq('id', intake.funnel_item_id)
          .in('stage', ['intake_requested', 'intake_filling', 'intake_changes_requested'])
        if (crmErr) console.warn('[intake_submit] funnel stage sync failed:', crmErr.message)
      }
```
   E antes de `// Fallback: notify all admin/backoffice staff…` (`:658`), o backoffice (que aprova os intakes) passa a ser sempre avisado:
```ts
        // O backoffice é o dono operacional dos intakes (aprova para assinatura): recebe sempre o aviso
        const { data: boUsers } = await supabase.from('user_roles').select('user_id').eq('role', 'backoffice')
        boUsers?.forEach((s: any) => recipientIds.add(s.user_id))
```

---

## C10 — Marcação pública: as respostas de erro do servidor nunca chegam ao visitante

Achado CRM-16. Numa resposta não-2xx o corpo vem em `error.context`, não em `data`: o 503 `unavailable` (sem calendário) e o 409 (hora já ocupada) aparecem como erro genérico. Em `src/pages/PublicBooking.tsx`, no `queryFn` dos horários, substitua o comentário e o `if (data?.status === 'unavailable') {` (`:130-133`) por:
```tsx
      // Fail-closed: server returns 503 { status: 'unavailable', reason } when
      // Graph is not configured, credentials fail, or every schedule call fails.
      // Never fabricate weekday slots on the client either.
      // Numa resposta non-2xx o corpo vem em error.context (FunctionsHttpError), não em data.
      let payload = data;
      const ctx = (error as { context?: unknown } | null)?.context;
      if (error && ctx instanceof Response) {
        try { payload = await ctx.clone().json(); } catch { /* corpo não-JSON */ }
      }
      if (payload?.status === 'unavailable') {
```
e na `mutationFn` da marcação troque `if (error) throw error;` (`:171`) por:
```tsx
      if (error) {
        // mostrar a razão do servidor (ex.: 409 hora já ocupada) em vez do texto genérico do cliente
        const ctx = (error as { context?: unknown }).context;
        let msg = error.message;
        if (ctx instanceof Response) {
          try { const body = await ctx.clone().json(); if (typeof body?.error === 'string') msg = body.error; } catch { /* corpo não-JSON */ }
        }
        throw new Error(msg);
      }
```

---

## C11 — Ficha da lead › Categoria: o backoffice vê "Categoria atualizada" sem nada mudar

Achado CRM-19. Em `src/components/crm/drawer/OverviewTab.tsx:838-847`, o update de `workspaces.startup_category` sem `.select()` devolve 0 linhas sem erro (RLS):
```tsx
    // Sem permissão o UPDATE devolve 0 linhas sem erro (RLS): confirmar com .select()
    const { data: updated, error } = await supabase
      .from('workspaces')
      .update({ startup_category: newValue })
      .eq('id', workspaceId)
      .select('id');
    if (error || !updated?.length) {
      notify.error(error ? t('common.error') : t('errors.noPermission', { defaultValue: 'Sem permissão para esta ação.' }));
    } else {
```
(o ramo `else` fica igual).

---

## C12 — Marcação pública: nome e mensagem do visitante entram sem escape no HTML do evento Teams

Achado CRM-21. Em `supabase/functions/public-book-first-contact/index.ts`, antes de `// Create calendar event with Teams meeting` (`:205`):
```ts
// Os campos do visitante entram no HTML do evento: escapar sempre
const escHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
```
e nas linhas `:224-227` use `${escHtml(contact.name)}`, `${escHtml(contact.email)}`, `${escHtml(contact.organization)}` e `${escHtml(contact.message)}`.

---

## C13 — "Atribuir workspace › Criar workspace" sem programa falha e deixa uma startup órfã

Achado SIGN-14. `workspaces.program_id` é obrigatório, mas o diálogo oferece "Nenhum" (o valor por omissão) e a função cria a startup antes de falhar no workspace.
1. `supabase/functions/staff-assign-workspace-to-contract/index.ts`, logo a seguir a `const programId = create.program_id || null;` (`:90`):
```ts
      // workspaces.program_id é NOT NULL: sem programa o insert falhava e deixava uma startup órfã
      if (!programId) {
        return errorResponse(req, 'program_id required to create workspace', ErrorCode.BAD_REQUEST, 400);
      }
```
2. `src/components/backoffice/contracts/AssignWorkspaceDialog.tsx`: `:177-178` →
```tsx
  // workspaces.program_id é obrigatório: sem programa o servidor recusa (e antes deixava uma startup órfã)
  const submitDisabled =
    submitting || (mode === 'assign' ? !selectedId : (!newName.trim() || !newProgramId));
```
   e no seletor de programa (`:285-291`) retire o item "Nenhum" e use `<Select value={newProgramId} onValueChange={setNewProgramId}>` com `placeholder={t('lifecycleMismatch.programRequired', { defaultValue: 'Escolha o programa' })}`.

Startups órfãs já criadas (só leitura): `SELECT s.id, s.name, s.created_at FROM public.startups s WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.startup_id = s.id) AND NOT EXISTS (SELECT 1 FROM public.funnel_items f WHERE f.linked_startup_id = s.id);`

---

## C14 — Página pública: documentos restaurados sem nome e com "NaN KB" (parte opcional da P2.6)

Achado SIGN-15. O servidor grava `{ path, file_name, size? }` em `documents_json`, e a página espera `{ name, path, size }`. Em `src/pages/PublicContractSigning.tsx`, substitua a restauração (`:209-212`) por:
```tsx
      // Restore already-uploaded documents so they don't disappear on reload.
      // O servidor grava { path, file_name, size? }: normalizar para { name, path, size }.
      const docsJson = (contract as any).documents_json as Record<string, { path: string; file_name?: string; name?: string; size?: number } | null> | undefined;
      if (docsJson && typeof docsJson === 'object') {
        const restored = Object.fromEntries(
          Object.entries(docsJson).map(([k, v]) => [k, v ? { name: v.file_name ?? v.name ?? k, path: v.path, size: v.size ?? 0 } : null]),
        );
        setUploadedDocs(prev => ({ ...prev, ...restored }));
      }
```
e mostre o tamanho (`:923-925`) só quando `uploaded.size > 0`.

---

## C15 — Convite expirado, de outra conta ou inválido mostra "403: Access denied"

Achado ONB-9. Em `src/pages/AcceptInvite.tsx`, chame a função diretamente para ler o estado HTTP. Declare `const [wrongAccount, setWrongAccount] = useState(false);` (junto dos outros estados, `:24`) e substitua a chamada e o tratamento de erro (`:52-60`) por:
```tsx
      // Chamada direta para ler o estado HTTP (403 outra conta, 400 expirado, 404 inválido)
      const { data: sess } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('accept-workspace-invite', {
        body: { token: inviteToken },
        headers: { Authorization: `Bearer ${sess.session?.access_token ?? ''}` },
      });
      
      if (error) {
        logger.error('Error accepting invite', {}, error);
        const httpStatus = ((error as { context?: unknown }).context as Response | undefined)?.status;
        setStatus('error');
        setWrongAccount(httpStatus === 403);
        setError(httpStatus === 403
          ? t('invite.wrongAccount', { defaultValue: 'Este convite foi enviado para outro email. Termine sessão e entre com o email convidado.' })
          : httpStatus === 400 ? t('invite.expiredDesc', { defaultValue: 'Este convite expirou. Peça um novo à equipa.' })
          : httpStatus === 404 ? t('invite.invalidToken')
          : t('invite.acceptFailed'));
        return;
      }
```
Antes do bloco `{status === 'error' && expectedEmail && (` (`:171`), acrescente o botão para mudar de conta:
```tsx
          {status === 'error' && wrongAccount && (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
              }}
            >
              {t('invite.switchAccount', { defaultValue: 'Terminar sessão e entrar com outro email' })}
            </Button>
          )}
```
O import de `invokeWithAuth` (`:12`) deixa de ser usado neste ficheiro.

---

## C16 — A UI promete notificações de aprovação que ninguém envia

Achado ONB-10. Nenhum código envia email ou notificação quando uma conta, candidatura ou claim é aprovado ou rejeitado, mas os textos prometem-no. Correção mínima: textos honestos (anexo de textos: `approval.responseTime`, `claimStartup.pendingTiming`, `claimStartup.applicationPendingDesc`, `founder.transitional.step3Pending`, `founder.claimed.pendingDesc`, `pendingDescNamed` e `claimDesc`). Se quiser o aviso real, é trabalho novo: um tipo `account_approved` em `send-notification-email` chamado nas três aprovações.

---

## C17 a C19 — Navegação do founder depois da candidatura ou do convite

- **C17** (ONB-11, P4.24 incompleta): depois de criar a candidatura, a navegação usa o estado de onboarding em cache e acaba em `/claim-startup`. Em `src/components/founder/CreateStartupDialog.tsx:188` use `await queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });` (o `onSubmit` já é `async`). Em `src/pages/AcceptInvite.tsx`, declare `const queryClient = useQueryClient();` (import de `@tanstack/react-query`) e, a seguir a `await refreshProfile?.();` (`:80`): `await queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] }); queryClient.invalidateQueries({ queryKey: ['workspaces'] });`.
- **C18** (ONB-12): `useFounderOnboardingState.ts:58-59` lê só 5 memberships, sem filtro: com 5 memberships de workspaces arquivados o founder fica num ciclo. Antes do `.limit(5)` acrescente `.in('workspaces.status', ['active', 'claimed', 'pending'])` e troque o limite por `.limit(50)` (o recurso embebido já é `workspaces!inner`; validado no PostgREST).
- **C19** (ONB-14): em `src/components/dashboard/FounderDashboard.tsx:211-212`, o founder sem workspace vê um esqueleto infinito. Troque esse `return` por `return (<WorkspaceEmptyState hasFilters={false} onClearFilters={() => {}} isFounder onCreateStartup={onCreateStartup} />);` com `import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';`. Em `src/pages/ClaimStartup.tsx:346`, o "Tentar novamente" passa a `onClick={() => { setPageState('idle'); void queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] }); }}`.

---

## Textos: anexo `LOVABLE-RC10-I18N-PATCH.json`

O anexo segue nesta mensagem (ou como ficheiro) e tem o **mesmo formato do anexo do RC9**: aplique-o com o mesmo script (`scripts/rc9/apply-i18n-patch.mjs`, da Parte 5 do RC9) ou entrada a entrada. Números: `pt` 14 alterações e 15 chaves novas; `en` 15 alterações e 15 chaves novas; nenhuma removida. As chaves `ecosystem.*` e `workQueue.types.*` têm exatamente os valores do anexo do RC9, por isso a ordem entre os dois anexos é indiferente (validámos as duas ordens: catálogos finais idênticos).

Validado: com o anexo do RC9 e este, `i18n-check`, `i18n-lint`, `i18n-quality`, `i18n-quality-ext` e o guard semântico do `i18n-sync` passam (9207 chaves em paridade). Só com este anexo, os gates falham apenas pelo que já falhava no RC10 (`surveys.launchFailed`), que o anexo do RC9 resolve.

```json
{
  "_leia_primeiro": "Anexo i18n do RC10. Mesmo formato e mesmo script do anexo do RC9 (scripts/rc9/apply-i18n-patch.mjs): 'update' altera chaves que já existem, 'add' cria chaves novas (se já existirem com o mesmo valor, nada muda). As chaves de ecosystem.* e workQueue.types.* têm exatamente os valores do anexo do RC9, por isso a ordem de aplicação dos dois anexos é indiferente.",
  "pt": {
    "update": {
      "team.inviteHint": "Para dar acesso à plataforma a cofundadores ou à equipa, peça ao seu consultor (botão «Convidar» no topo do workspace).",
      "crm.convertInviteFailed": "Workspace criado, mas não foi possível enviar o convite para {{email}}. Peça a um consultor que o envie com o botão «Convidar» no topo do workspace.",
      "approval.responseTime": "Pode voltar a entrar a qualquer momento: assim que a conta for aprovada, entra diretamente.",
      "claimStartup.pendingTiming": "Volte a entrar mais tarde para ver o resultado.",
      "claimStartup.applicationPendingDesc": "A sua candidatura foi recebida e está a ser analisada pela nossa equipa. Volte a entrar mais tarde para ver o resultado.",
      "founder.transitional.step3Pending": "Depois da aprovação, o workspace fica disponível na próxima vez que entrar.",
      "founder.claimed.pendingDesc": "A sua candidatura está a ser analisada pela equipa. O workspace fica disponível assim que for aprovada.",
      "founder.claimed.pendingDescNamed": "A sua candidatura para \"{{name}}\" está a ser analisada pela equipa. O workspace fica disponível assim que for aprovada.",
      "founder.claimed.claimDesc": "O seu pedido de associação aguarda revisão pela equipa. Volte a entrar mais tarde para ver o resultado.",
      "ecosystem.deleteLead": "Arquivar lead",
      "ecosystem.leadDeleted": "Lead arquivada",
      "ecosystem.confirmDeleteTitle": "Arquivar lead?",
      "ecosystem.confirmDeleteDesc": "Arquivar \"{{name}}\"? A lead deixa de aparecer no Ecossistema. As notas e o histórico ficam guardados.",
      "ecosystem.deleteLeadError": "Erro ao arquivar a lead"
    },
    "add": {
      "contractDetail.markedSignedAwaitingFounder": "Contrato assinado, mas o workspace continua pendente porque ainda não tem membros ativos. Convide o founder (ou atribua um consultor) e depois aprove o workspace em Aprovações.",
      "contractDetail.terminate.archiveFailed": "Contrato terminado, mas o workspace não foi arquivado: {{msg}}",
      "contractDetail.terminate.archiveSkipped": "Contrato terminado. O workspace não foi arquivado porque tem outro contrato em vigor.",
      "onboardingWizard.completeFailed": "Não foi possível concluir o onboarding. Tente novamente.",
      "onboardingWizard.changeNeedsApproval": "Estes dados já estão validados. Peça a alteração em Definições.",
      "invite.inviteMember": "Convidar",
      "invite.inviteTitle": "Convidar para o workspace",
      "invite.role": "Papel",
      "invite.wrongAccount": "Este convite foi enviado para outro email. Termine sessão e entre com o email convidado.",
      "invite.expiredDesc": "Este convite expirou. Peça um novo à equipa.",
      "invite.switchAccount": "Terminar sessão e entrar com outro email",
      "lifecycleMismatch.programRequired": "Escolha o programa",
      "workQueue.types.counter_sign_contract": "Contra-assinar contrato",
      "workQueue.types.financial_assumption_skipped": "Rever pressuposto financeiro",
      "workQueue.types.milestone_missed": "Marco falhado"
    }
  },
  "en": {
    "update": {
      "team.inviteHint": "To give co-founders or team members platform access, ask your consultant (\"Invite\" button at the top of the workspace).",
      "crm.convertInviteFailed": "Workspace created, but the invitation to {{email}} could not be sent. Ask a consultant to send it with the \"Invite\" button at the top of the workspace.",
      "approval.responseTime": "You can sign in again at any time: once your account is approved you will go straight in.",
      "claimStartup.pendingTiming": "Sign in again later to see the outcome.",
      "claimStartup.applicationPendingDesc": "Your application has been received and is being reviewed by our team. Sign in again later to see the outcome.",
      "founder.transitional.step3Pending": "After approval, the workspace becomes available the next time you sign in.",
      "founder.claimed.pendingDesc": "Your application is being reviewed by the team. The workspace becomes available once it is approved.",
      "founder.claimed.pendingDescNamed": "Your application for \"{{name}}\" is being reviewed by the team. The workspace becomes available once it is approved.",
      "founder.claimed.claimDesc": "Your association request is awaiting review by the team. Sign in again later to see the outcome.",
      "ecosystem.deleteLead": "Archive lead",
      "ecosystem.leadDeleted": "Lead archived",
      "ecosystem.confirmDeleteTitle": "Archive lead?",
      "ecosystem.confirmDeleteDesc": "Archive \"{{name}}\"? The lead will no longer appear in the Ecosystem. Notes and history are kept.",
      "ecosystem.deleteLeadError": "Error archiving lead",
      "ecosystem.leadRestored": "Lead restored"
    },
    "add": {
      "contractDetail.markedSignedAwaitingFounder": "Contract signed, but the workspace stays pending because it has no active members yet. Invite the founder (or assign a consultant) and then approve the workspace in Approvals.",
      "contractDetail.terminate.archiveFailed": "Contract terminated, but the workspace was not archived: {{msg}}",
      "contractDetail.terminate.archiveSkipped": "Contract terminated. The workspace was not archived because it has another contract in force.",
      "onboardingWizard.completeFailed": "Could not complete onboarding. Please try again.",
      "onboardingWizard.changeNeedsApproval": "These details are already validated. Request the change in Settings.",
      "invite.inviteMember": "Invite",
      "invite.inviteTitle": "Invite to the workspace",
      "invite.role": "Role",
      "invite.wrongAccount": "This invitation was sent to another email. Sign out and sign in with the invited email.",
      "invite.expiredDesc": "This invitation has expired. Ask the team for a new one.",
      "invite.switchAccount": "Sign out and use another email",
      "lifecycleMismatch.programRequired": "Choose the program",
      "workQueue.types.counter_sign_contract": "Counter-sign contract",
      "workQueue.types.financial_assumption_skipped": "Review financial assumption",
      "workQueue.types.milestone_missed": "Missed milestone"
    }
  },
  "remove": []
}
```

---

## Verificação final (depois das 4 partes e da Parte 5 do RC9)

1. `bash scripts/rc5/local-pg-harness.sh`: replay com 0 ficheiros a falhar e todas as suites a passar.
2. `bun run typecheck`, `bun run lint`, `bun run test` e `bun run rc5:verify`.
3. No SQL editor de produção, as consultas de "dados já afetados" das Partes 1 a 3 (contratos ativos sem workspace, founders auto-criados que nunca entraram, workspaces com o onboarding por fazer, workspaces arquivados com contrato em vigor). Trate cada linha como indicado no item.
4. Teste à mão, com contas reais de cada papel:
   - consultor: lead → intake → (backoffice) contrato sem workspace → link → o founder assina → o founder recebe o email de acesso, define a password, entra, vê o banner e o assistente, e conclui o onboarding;
   - backoffice: lead sem consultor → converter → "Marcar como assinado" → aviso de workspace pendente → convidar o founder → o workspace ativa quando ele aceitar e for aprovado;
   - link público de um contrato já assinado: só leitura; terminado: "link inválido";
   - "Repor e reenviar" de um contrato recusado no DocuSign e reenvio pela rota nativa: fica `completed`, não `partially_signed`;
   - admin: convidar um membro de equipa a partir do workspace e reenviar o mesmo convite.

**Fim da Parte 4.** Diga-me o que não aplicou e só depois cole a Parte 5 do RC9. Faça deploy de `public-contract-onboarding`, `run-intake-reminders`, `public-book-first-contact` e `staff-assign-workspace-to-contract`.
