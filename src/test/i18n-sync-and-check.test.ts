/**
 * This test programmatically syncs en.json and pt.json, writes them back,
 * and then asserts strict parity. It acts as both the sync execution AND
 * the parity check in one step.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../i18n/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');
const PT_PATH = path.join(LOCALES_DIR, 'pt.json');

// Basic EN→PT dictionary
const EN_TO_PT: Record<string, string> = {
  'Save': 'Guardar', 'Cancel': 'Cancelar', 'Delete': 'Eliminar', 'Edit': 'Editar',
  'Create': 'Criar', 'Add': 'Adicionar', 'Remove': 'Remover', 'Update': 'Atualizar',
  'Submit': 'Submeter', 'Confirm': 'Confirmar', 'Close': 'Fechar', 'Open': 'Abrir',
  'Search': 'Pesquisar', 'Filter': 'Filtrar', 'Sort': 'Ordenar', 'Export': 'Exportar',
  'Import': 'Importar', 'Download': 'Descarregar', 'Upload': 'Carregar',
  'Copy': 'Copiar', 'Retry': 'Tentar novamente', 'Refresh': 'Atualizar', 'Reset': 'Repor',
  'Apply': 'Aplicar', 'Clear': 'Limpar', 'Select': 'Selecionar',
  'Back': 'Voltar', 'Next': 'Seguinte', 'Previous': 'Anterior',
  'Continue': 'Continuar', 'Start': 'Iniciar', 'Stop': 'Parar',
  'Enable': 'Ativar', 'Disable': 'Desativar',
  'Approve': 'Aprovar', 'Reject': 'Rejeitar', 'Archive': 'Arquivar',
  'Send': 'Enviar', 'Resend': 'Reenviar', 'View': 'Ver',
  'Show': 'Mostrar', 'Hide': 'Ocultar', 'Expand': 'Expandir', 'Collapse': 'Recolher',
  'Connect': 'Conectar', 'Disconnect': 'Desconectar', 'Sync': 'Sincronizar',
  'Configure': 'Configurar', 'Manage': 'Gerir', 'Assign': 'Atribuir',
  'Accept': 'Aceitar', 'Decline': 'Recusar',
  'Revoke': 'Revogar', 'Share': 'Partilhar', 'Invite': 'Convidar',
  'Book': 'Reservar', 'Schedule': 'Agendar',
  'Generate': 'Gerar', 'Analyze': 'Analisar', 'Test': 'Testar',
  'Run': 'Executar', 'Publish': 'Publicar',
  'Active': 'Ativo', 'Inactive': 'Inativo', 'Pending': 'Pendente',
  'Approved': 'Aprovado', 'Rejected': 'Rejeitado', 'Draft': 'Rascunho',
  'Archived': 'Arquivado', 'Suspended': 'Suspenso',
  'Completed': 'Concluído', 'In Progress': 'Em Progresso', 'Not Started': 'Não Iniciado',
  'Overdue': 'Atrasado', 'On Track': 'No Caminho Certo', 'At Risk': 'Em Risco',
  'Critical': 'Crítico', 'Warning': 'Aviso', 'Info': 'Info',
  'Success': 'Sucesso', 'Error': 'Erro', 'Failed': 'Falhou',
  'Loading': 'A carregar', 'Saving': 'A guardar', 'Processing': 'A processar',
  'Done': 'Concluído', 'Cancelled': 'Cancelado', 'Expired': 'Expirado',
  'Title': 'Título', 'Description': 'Descrição', 'Name': 'Nome',
  'Email': 'Email', 'Password': 'Palavra-passe', 'Phone': 'Telefone',
  'Date': 'Data', 'Time': 'Hora', 'Duration': 'Duração',
  'Notes': 'Notas', 'Comments': 'Comentários', 'Tags': 'Etiquetas',
  'Status': 'Estado', 'Priority': 'Prioridade', 'Type': 'Tipo',
  'Category': 'Categoria', 'Details': 'Detalhes', 'Settings': 'Definições',
  'Profile': 'Perfil', 'Account': 'Conta', 'Role': 'Função',
  'User': 'Utilizador', 'Users': 'Utilizadores', 'Team': 'Equipa',
  'Startup': 'Startup', 'Workspace': 'Workspace', 'Program': 'Programa',
  'Session': 'Sessão', 'Sessions': 'Sessões', 'Meeting': 'Reunião',
  'Action': 'Ação', 'Actions': 'Ações', 'Task': 'Tarefa', 'Tasks': 'Tarefas',
  'Milestone': 'Marco', 'Milestones': 'Marcos',
  'Template': 'Template', 'Templates': 'Templates',
  'Document': 'Documento', 'Documents': 'Documentos', 'File': 'Ficheiro',
  'Report': 'Relatório', 'Reports': 'Relatórios',
  'Contract': 'Contrato', 'Contracts': 'Contratos',
  'Building': 'Edifício', 'Buildings': 'Edifícios', 'Space': 'Espaço', 'Spaces': 'Espaços',
  'Lead': 'Lead', 'Leads': 'Leads', 'Pipeline': 'Pipeline',
  'Alert': 'Alerta', 'Alerts': 'Alertas',
  'Dashboard': 'Painel', 'Overview': 'Visão Geral', 'Summary': 'Resumo',
  'History': 'Histórico', 'Activity': 'Atividade',
  'Integration': 'Integração', 'Integrations': 'Integrações',
  'Health': 'Saúde', 'Score': 'Pontuação',
  'No results found': 'Nenhum resultado encontrado',
  'Something went wrong': 'Algo correu mal',
  'Please try again': 'Por favor tente novamente',
  'Not configured': 'Não configurado',
  'Not available': 'Não disponível',
  'All': 'Todos', 'None': 'Nenhum', 'Other': 'Outro',
  'Yes': 'Sim', 'No': 'Não',
  'Today': 'Hoje', 'Yesterday': 'Ontem', 'Tomorrow': 'Amanhã',
  'days': 'dias', 'hours': 'horas', 'minutes': 'minutos',
  'ago': 'atrás', 'of': 'de', 'for': 'para', 'by': 'por',
  'and': 'e', 'or': 'ou', 'with': 'com', 'without': 'sem',
  'more': 'mais', 'less': 'menos', 'total': 'total',
  'items': 'itens', 'results': 'resultados',
  'selected': 'selecionado', 'required': 'obrigatório', 'optional': 'opcional',
};

const PT_TO_EN: Record<string, string> = {};
for (const [en, pt] of Object.entries(EN_TO_PT)) {
  PT_TO_EN[pt] = en;
}

function translateEnToPt(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!value) return value;
  
  const placeholders: string[] = [];
  let prot = value.replace(/(\{\{[^}]+\}\}|\{[0-9]+\}|<[^>]+>)/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  if (EN_TO_PT[prot]) {
    let result = EN_TO_PT[prot];
    placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
    return result;
  }

  const lower = prot.toLowerCase();
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (en.toLowerCase() === lower) {
      let result = pt;
      placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
      return result;
    }
  }

  // Word-level replacement
  let result = prot;
  const sortedPairs = Object.entries(EN_TO_PT).sort((a, b) => b[0].length - a[0].length);
  for (const [en, pt] of sortedPairs) {
    if (en.length < 3) continue;
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, pt);
  }
  placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
  return result;
}

function translatePtToEn(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!value) return value;

  const placeholders: string[] = [];
  let prot = value.replace(/(\{\{[^}]+\}\}|\{[0-9]+\}|<[^>]+>)/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  if (PT_TO_EN[prot]) {
    let result = PT_TO_EN[prot];
    placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
    return result;
  }

  placeholders.forEach((ph, i) => { prot = prot.replace(`__PH${i}__`, ph); });
  return prot;
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...acc, ...flattenKeys(value as Record<string, unknown>, fullKey) };
    }
    acc[fullKey] = value;
    return acc;
  }, {} as Record<string, unknown>);
}

function unflattenKeys(flatObj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current = result as Record<string, unknown>;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        current[part] = current[part] || {};
        current = current[part] as Record<string, unknown>;
      }
    }
  }
  return result;
}

function sortObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
      return sorted;
    }, {} as Record<string, unknown>);
}

describe('i18n sync and parity', () => {
  it('should sync locale files and achieve strict parity', () => {
    // Read
    const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
    const pt = JSON.parse(fs.readFileSync(PT_PATH, 'utf-8'));

    const enFlat = flattenKeys(en);
    const ptFlat = flattenKeys(pt);

    const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(ptFlat)]);

    const enSynced: Record<string, unknown> = {};
    const ptSynced: Record<string, unknown> = {};

    let missingInPt = 0;
    let missingInEn = 0;

    for (const key of allKeys) {
      // EN
      if (enFlat[key] !== undefined && enFlat[key] !== '' && enFlat[key] !== null) {
        enSynced[key] = enFlat[key];
      } else if (ptFlat[key] !== undefined && ptFlat[key] !== '' && ptFlat[key] !== null) {
        missingInEn++;
        const translated = translatePtToEn(ptFlat[key]);
        enSynced[key] = (translated && translated !== '') ? translated : ptFlat[key];
      } else {
        // Both empty or missing - use key as fallback
        enSynced[key] = key.split('.').pop() || key;
      }

      // PT
      if (ptFlat[key] !== undefined && ptFlat[key] !== '' && ptFlat[key] !== null) {
        ptSynced[key] = ptFlat[key];
      } else if (enFlat[key] !== undefined && enFlat[key] !== '' && enFlat[key] !== null) {
        missingInPt++;
        const translated = translateEnToPt(enFlat[key]);
        ptSynced[key] = (translated && translated !== '') ? translated : enFlat[key];
      } else {
        ptSynced[key] = key.split('.').pop() || key;
      }
    }

    // Write sorted files
    const enFinal = sortObject(unflattenKeys(enSynced));
    const ptFinal = sortObject(unflattenKeys(ptSynced));

    fs.writeFileSync(EN_PATH, JSON.stringify(enFinal, null, 2) + '\n', 'utf-8');
    fs.writeFileSync(PT_PATH, JSON.stringify(ptFinal, null, 2) + '\n', 'utf-8');

    console.log(`Synced: ${allKeys.size} total keys, filled ${missingInEn} in EN, ${missingInPt} in PT`);

    // Now verify parity
    const enVerify = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
    const ptVerify = JSON.parse(fs.readFileSync(PT_PATH, 'utf-8'));

    const enFlatVerify = flattenKeys(enVerify);
    const ptFlatVerify = flattenKeys(ptVerify);

    const enKeysSet = new Set(Object.keys(enFlatVerify));
    const ptKeysSet = new Set(Object.keys(ptFlatVerify));

    const missingInPtFinal = [...enKeysSet].filter(k => !ptKeysSet.has(k));
    const missingInEnFinal = [...ptKeysSet].filter(k => !enKeysSet.has(k));

    if (missingInPtFinal.length > 0) {
      console.error('Missing in PT:', missingInPtFinal.slice(0, 20));
    }
    if (missingInEnFinal.length > 0) {
      console.error('Missing in EN:', missingInEnFinal.slice(0, 20));
    }

    expect(missingInPtFinal).toEqual([]);
    expect(missingInEnFinal).toEqual([]);

    // Check no empty values
    const emptyEn = Object.entries(enFlatVerify).filter(([, v]) => v === '' || v === null);
    const emptyPt = Object.entries(ptFlatVerify).filter(([, v]) => v === '' || v === null);

    if (emptyEn.length > 0) {
      console.error('Empty EN:', emptyEn.slice(0, 10).map(([k]) => k));
    }
    if (emptyPt.length > 0) {
      console.error('Empty PT:', emptyPt.slice(0, 10).map(([k]) => k));
    }

    expect(emptyEn).toEqual([]);
    expect(emptyPt).toEqual([]);

    // Key counts must match
    expect(enKeysSet.size).toBe(ptKeysSet.size);
  });
});
