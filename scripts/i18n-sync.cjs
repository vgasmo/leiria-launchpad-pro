#!/usr/bin/env node
/**
 * i18n Sync & Auto-Translate Script
 *
 * Ensures EN and PT locale files have identical key sets.
 * Missing PT keys are filled with basic EN→PT translations.
 * Missing EN keys are filled with basic PT→EN translations.
 * Preserves placeholders like {{x}}, {0}, HTML tags, etc.
 *
 * Usage: node scripts/i18n-sync.cjs
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');
const PT_PATH = path.join(LOCALES_DIR, 'pt.json');

// Basic EN→PT dictionary for common UI terms
const EN_TO_PT = {
  // Actions
  'Save': 'Guardar', 'Cancel': 'Cancelar', 'Delete': 'Eliminar', 'Edit': 'Editar',
  'Create': 'Criar', 'Add': 'Adicionar', 'Remove': 'Remover', 'Update': 'Atualizar',
  'Submit': 'Submeter', 'Confirm': 'Confirmar', 'Close': 'Fechar', 'Open': 'Abrir',
  'Search': 'Pesquisar', 'Filter': 'Filtrar', 'Sort': 'Ordenar', 'Export': 'Exportar',
  'Import': 'Importar', 'Download': 'Descarregar', 'Upload': 'Carregar',
  'Copy': 'Copiar', 'Paste': 'Colar', 'Undo': 'Desfazer', 'Redo': 'Refazer',
  'Retry': 'Tentar novamente', 'Refresh': 'Atualizar', 'Reset': 'Repor',
  'Apply': 'Aplicar', 'Clear': 'Limpar', 'Select': 'Selecionar',
  'Back': 'Voltar', 'Next': 'Seguinte', 'Previous': 'Anterior',
  'Continue': 'Continuar', 'Start': 'Iniciar', 'Stop': 'Parar',
  'Enable': 'Ativar', 'Disable': 'Desativar', 'Activate': 'Ativar',
  'Approve': 'Aprovar', 'Reject': 'Rejeitar', 'Archive': 'Arquivar',
  'Restore': 'Restaurar', 'Duplicate': 'Duplicar', 'Move': 'Mover',
  'Send': 'Enviar', 'Resend': 'Reenviar', 'View': 'Ver',
  'Show': 'Mostrar', 'Hide': 'Ocultar', 'Expand': 'Expandir', 'Collapse': 'Recolher',
  'Connect': 'Conectar', 'Disconnect': 'Desconectar', 'Sync': 'Sincronizar',
  'Configure': 'Configurar', 'Manage': 'Gerir', 'Assign': 'Atribuir',
  'Unassign': 'Desatribuir', 'Accept': 'Aceitar', 'Decline': 'Recusar',
  'Revoke': 'Revogar', 'Share': 'Partilhar', 'Invite': 'Convidar',
  'Book': 'Reservar', 'Schedule': 'Agendar', 'Reschedule': 'Reagendar',
  'Generate': 'Gerar', 'Analyze': 'Analisar', 'Test': 'Testar',
  'Run': 'Executar', 'Deploy': 'Implementar', 'Publish': 'Publicar',
  'Mark': 'Marcar', 'Unmark': 'Desmarcar', 'Pin': 'Fixar', 'Unpin': 'Desfixar',
  // Status
  'Active': 'Ativo', 'Inactive': 'Inativo', 'Pending': 'Pendente',
  'Approved': 'Aprovado', 'Rejected': 'Rejeitado', 'Draft': 'Rascunho',
  'Published': 'Publicado', 'Archived': 'Arquivado', 'Suspended': 'Suspenso',
  'Completed': 'Concluído', 'In Progress': 'Em Progresso', 'Not Started': 'Não Iniciado',
  'Overdue': 'Atrasado', 'On Track': 'No Caminho Certo', 'At Risk': 'Em Risco',
  'Critical': 'Crítico', 'Warning': 'Aviso', 'Info': 'Info',
  'Success': 'Sucesso', 'Error': 'Erro', 'Failed': 'Falhou',
  'Loading': 'A carregar', 'Saving': 'A guardar', 'Processing': 'A processar',
  'Sending': 'A enviar', 'Generating': 'A gerar', 'Analyzing': 'A analisar',
  'Uploading': 'A carregar', 'Downloading': 'A descarregar', 'Syncing': 'A sincronizar',
  'Done': 'Concluído', 'Cancelled': 'Cancelado', 'Expired': 'Expirado',
  // Nouns
  'Title': 'Título', 'Description': 'Descrição', 'Name': 'Nome',
  'Email': 'Email', 'Password': 'Palavra-passe', 'Phone': 'Telefone',
  'Address': 'Morada', 'City': 'Cidade', 'Country': 'País',
  'Date': 'Data', 'Time': 'Hora', 'Duration': 'Duração',
  'Notes': 'Notas', 'Comments': 'Comentários', 'Tags': 'Etiquetas',
  'Status': 'Estado', 'Priority': 'Prioridade', 'Type': 'Tipo',
  'Category': 'Categoria', 'Details': 'Detalhes', 'Settings': 'Definições',
  'Profile': 'Perfil', 'Account': 'Conta', 'Role': 'Função',
  'User': 'Utilizador', 'Users': 'Utilizadores', 'Team': 'Equipa',
  'Admin': 'Admin', 'Consultant': 'Consultor', 'Mentor': 'Mentor',
  'Founder': 'Fundador', 'Investor': 'Investidor',
  'Startup': 'Startup', 'Workspace': 'Workspace', 'Program': 'Programa',
  'Session': 'Sessão', 'Sessions': 'Sessões', 'Meeting': 'Reunião',
  'Action': 'Ação', 'Actions': 'Ações', 'Task': 'Tarefa', 'Tasks': 'Tarefas',
  'Milestone': 'Marco', 'Milestones': 'Marcos', 'Goal': 'Objetivo', 'Goals': 'Objetivos',
  'KPI': 'KPI', 'KPIs': 'KPIs', 'Metric': 'Métrica', 'Metrics': 'Métricas',
  'Template': 'Template', 'Templates': 'Templates',
  'Document': 'Documento', 'Documents': 'Documentos', 'File': 'Ficheiro', 'Files': 'Ficheiros',
  'Report': 'Relatório', 'Reports': 'Relatórios',
  'Contract': 'Contrato', 'Contracts': 'Contratos', 'Invoice': 'Fatura',
  'Building': 'Edifício', 'Buildings': 'Edifícios', 'Space': 'Espaço', 'Spaces': 'Espaços',
  'Lead': 'Lead', 'Leads': 'Leads', 'Pipeline': 'Pipeline',
  'Notification': 'Notificação', 'Notifications': 'Notificações',
  'Alert': 'Alerta', 'Alerts': 'Alertas',
  'Calendar': 'Calendário', 'Agenda': 'Agenda', 'Schedule': 'Horário',
  'Dashboard': 'Painel', 'Overview': 'Visão Geral', 'Summary': 'Resumo',
  'History': 'Histórico', 'Timeline': 'Linha do Tempo', 'Activity': 'Atividade',
  'Integration': 'Integração', 'Integrations': 'Integrações',
  'Permission': 'Permissão', 'Permissions': 'Permissões',
  'Availability': 'Disponibilidade', 'Slot': 'Horário', 'Slots': 'Horários',
  'Health': 'Saúde', 'Score': 'Pontuação', 'Health Score': 'Pontuação de Saúde',
  'Playbook': 'Playbook', 'Playbooks': 'Playbooks',
  'Dataroom': 'Dataroom', 'Funnel': 'Funil',
  // Common phrases
  'No results found': 'Nenhum resultado encontrado',
  'No data available': 'Sem dados disponíveis',
  'No items': 'Sem itens',
  'Are you sure': 'Tem a certeza',
  'This action cannot be undone': 'Esta ação não pode ser desfeita',
  'Something went wrong': 'Algo correu mal',
  'Please try again': 'Por favor tente novamente',
  'Not configured': 'Não configurado',
  'Not available': 'Não disponível',
  'Last updated': 'Última atualização',
  'Created at': 'Criado em',
  'Updated at': 'Atualizado em',
  'All': 'Todos', 'None': 'Nenhum', 'Other': 'Outro',
  'Yes': 'Sim', 'No': 'Não',
  'Today': 'Hoje', 'Yesterday': 'Ontem', 'Tomorrow': 'Amanhã',
  'This week': 'Esta semana', 'Last week': 'Semana passada',
  'This month': 'Este mês', 'Last month': 'Mês passado',
  'days': 'dias', 'hours': 'horas', 'minutes': 'minutos',
  'day': 'dia', 'hour': 'hora', 'minute': 'minuto',
  'ago': 'atrás', 'left': 'restantes',
  'of': 'de', 'for': 'para', 'by': 'por', 'from': 'de', 'to': 'para',
  'and': 'e', 'or': 'ou', 'with': 'com', 'without': 'sem',
  'more': 'mais', 'less': 'menos', 'total': 'total',
  'items': 'itens', 'item': 'item', 'results': 'resultados',
  'selected': 'selecionado', 'required': 'obrigatório', 'optional': 'opcional',
};

// Reverse dictionary PT→EN
const PT_TO_EN = {};
for (const [en, pt] of Object.entries(EN_TO_PT)) {
  PT_TO_EN[pt] = en;
}

/**
 * Basic word-level translation. Preserves {{placeholders}}, {0}, HTML.
 */
function translateEnToPt(value) {
  if (typeof value !== 'string') return value;
  
  // Extract and protect placeholders
  const placeholders = [];
  let protected_ = value.replace(/(\{\{[^}]+\}\}|\{[0-9]+\}|<[^>]+>)/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  // Try exact match first
  if (EN_TO_PT[protected_]) {
    let result = EN_TO_PT[protected_];
    placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
    return result;
  }

  // Try case-insensitive full match
  const lower = protected_.toLowerCase();
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (en.toLowerCase() === lower) {
      let result = pt;
      placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
      return result;
    }
  }

  // Word-level replacement for longer strings
  let result = protected_;
  // Sort by length descending to match longer phrases first
  const sortedPairs = Object.entries(EN_TO_PT).sort((a, b) => b[0].length - a[0].length);
  for (const [en, pt] of sortedPairs) {
    if (en.length < 3) continue; // skip tiny words
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, pt);
  }

  // Restore placeholders
  placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
  return result;
}

function translatePtToEn(value) {
  if (typeof value !== 'string') return value;
  
  const placeholders = [];
  let protected_ = value.replace(/(\{\{[^}]+\}\}|\{[0-9]+\}|<[^>]+>)/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  if (PT_TO_EN[protected_]) {
    let result = PT_TO_EN[protected_];
    placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
    return result;
  }

  // For PT→EN, just return the original (with placeholders restored) since
  // word-level PT→EN is less reliable
  placeholders.forEach((ph, i) => { protected_ = protected_.replace(`__PH${i}__`, ph); });
  return protected_;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...acc, ...flattenKeys(value, fullKey) };
    }
    acc[fullKey] = value;
    return acc;
  }, {});
}

function unflattenKeys(flatObj) {
  const result = {};
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }
  return result;
}

function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObject(obj[key]);
      return sorted;
    }, {});
}

function sync() {
  console.log('🔄 Syncing i18n locales...');
  
  const en = readJson(EN_PATH);
  const pt = readJson(PT_PATH);

  const enFlat = flattenKeys(en);
  const ptFlat = flattenKeys(pt);

  const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(ptFlat)]);
  
  const enSynced = {};
  const ptSynced = {};

  let missingInPt = 0;
  let missingInEn = 0;
  let translated = 0;

  for (const key of allKeys) {
    // EN value
    if (enFlat[key] !== undefined) {
      enSynced[key] = enFlat[key];
    } else {
      missingInEn++;
      enSynced[key] = translatePtToEn(ptFlat[key]) || ptFlat[key] || key;
    }

    // PT value
    if (ptFlat[key] !== undefined) {
      ptSynced[key] = ptFlat[key];
    } else {
      missingInPt++;
      const translatedValue = translateEnToPt(enFlat[key]);
      ptSynced[key] = translatedValue || enFlat[key] || key;
      if (translatedValue !== enFlat[key]) translated++;
    }
  }

  const enFinal = sortObject(unflattenKeys(enSynced));
  const ptFinal = sortObject(unflattenKeys(ptSynced));

  writeJson(EN_PATH, enFinal);
  writeJson(PT_PATH, ptFinal);

  console.log(`✅ i18n Sync complete!`);
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Filled ${missingInEn} keys missing in EN`);
  console.log(`   Filled ${missingInPt} keys missing in PT (${translated} auto-translated)`);
}

sync();
