#!/usr/bin/env node
/**
 * i18n Sync & Auto-Fix Script
 *
 * 1. Scans all TSX/TS files for t('key', 'default') and t('key', { defaultValue: '...' })
 * 2. Adds missing keys to en.json using the defaultValue as EN text
 * 3. Adds missing keys to pt.json using auto-translation
 * 4. Fixes known English phrases in pt.json values
 * 5. Ensures EN/PT parity (all keys present in both)
 * 6. Sorts both locale files for consistency
 *
 * Usage: node scripts/i18n-sync.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOCALES_DIR = path.resolve(ROOT, 'src/i18n/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');
const PT_PATH = path.join(LOCALES_DIR, 'pt.json');
const SRC_DIR = path.join(ROOT, 'src');

// ========== EN→PT Translation Dictionary ==========
const EN_TO_PT = {
  'Save': 'Guardar', 'Cancel': 'Cancelar', 'Delete': 'Eliminar', 'Edit': 'Editar',
  'Create': 'Criar', 'Add': 'Adicionar', 'Remove': 'Remover', 'Update': 'Atualizar',
  'Submit': 'Submeter', 'Confirm': 'Confirmar', 'Close': 'Fechar', 'Open': 'Abrir',
  'Search': 'Pesquisar', 'Filter': 'Filtrar', 'Sort': 'Ordenar', 'Export': 'Exportar',
  'Import': 'Importar', 'Download': 'Descarregar', 'Upload': 'Carregar',
  'Copy': 'Copiar', 'Undo': 'Desfazer', 'Redo': 'Refazer',
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
  'Accept': 'Aceitar', 'Decline': 'Recusar',
  'Share': 'Partilhar', 'Invite': 'Convidar',
  'Book': 'Reservar', 'Schedule': 'Agendar', 'Reschedule': 'Reagendar',
  'Generate': 'Gerar', 'Analyze': 'Analisar', 'Test': 'Testar',
  'Run': 'Executar', 'Publish': 'Publicar',
  'Active': 'Ativo', 'Inactive': 'Inativo', 'Pending': 'Pendente',
  'Approved': 'Aprovado', 'Rejected': 'Rejeitado', 'Draft': 'Rascunho',
  'Published': 'Publicado', 'Archived': 'Arquivado',
  'Completed': 'Concluído', 'In Progress': 'Em Progresso', 'Not Started': 'Não Iniciado',
  'Overdue': 'Atrasado', 'On Track': 'No Caminho Certo', 'At Risk': 'Em Risco',
  'Critical': 'Crítico', 'Warning': 'Aviso', 'Info': 'Info',
  'Success': 'Sucesso', 'Error': 'Erro', 'Failed': 'Falhou',
  'Loading': 'A carregar', 'Loading...': 'A carregar...',
  'Saving': 'A guardar', 'Saving...': 'A guardar...',
  'Processing': 'A processar', 'Processing...': 'A processar...',
  'Sending...': 'A enviar...', 'Generating...': 'A gerar...',
  'Done': 'Concluído', 'Cancelled': 'Cancelado', 'Expired': 'Expirado',
  'Title': 'Título', 'Description': 'Descrição', 'Name': 'Nome',
  'Email': 'Email', 'Password': 'Palavra-passe', 'Phone': 'Telefone',
  'Address': 'Morada', 'City': 'Cidade', 'Country': 'País',
  'Date': 'Data', 'Time': 'Hora', 'Duration': 'Duração',
  'Notes': 'Notas', 'Comments': 'Comentários', 'Tags': 'Etiquetas',
  'Status': 'Estado', 'Priority': 'Prioridade', 'Type': 'Tipo',
  'Category': 'Categoria', 'Details': 'Detalhes', 'Settings': 'Definições',
  'Profile': 'Perfil', 'Account': 'Conta', 'Role': 'Função',
  'User': 'Utilizador', 'Users': 'Utilizadores', 'Team': 'Equipa',
  'Startup': 'Startup', 'Workspace': 'Workspace', 'Program': 'Programa',
  'Session': 'Sessão', 'Sessions': 'Sessões', 'Meeting': 'Reunião',
  'Action': 'Ação', 'Actions': 'Ações', 'Task': 'Tarefa', 'Tasks': 'Tarefas',
  'Milestone': 'Marco', 'Milestones': 'Marcos', 'Goal': 'Objetivo',
  'KPI': 'KPI', 'KPIs': 'KPIs', 'Metric': 'Métrica', 'Metrics': 'Métricas',
  'Template': 'Template', 'Templates': 'Templates',
  'Document': 'Documento', 'Documents': 'Documentos', 'File': 'Ficheiro',
  'Report': 'Relatório', 'Reports': 'Relatórios',
  'Contract': 'Contrato', 'Contracts': 'Contratos', 'Invoice': 'Fatura',
  'Building': 'Edifício', 'Buildings': 'Edifícios', 'Space': 'Espaço', 'Spaces': 'Espaços',
  'Lead': 'Lead', 'Leads': 'Leads', 'Pipeline': 'Pipeline',
  'Notification': 'Notificação', 'Notifications': 'Notificações',
  'Alert': 'Alerta', 'Alerts': 'Alertas',
  'Calendar': 'Calendário', 'Dashboard': 'Painel',
  'Overview': 'Visão Geral', 'Summary': 'Resumo',
  'History': 'Histórico', 'Activity': 'Atividade',
  'Health': 'Saúde', 'Score': 'Pontuação', 'Health Score': 'Pontuação de Saúde',
  'Playbook': 'Playbook', 'Playbooks': 'Playbooks',
  'Floor': 'Piso', 'Room': 'Sala', 'Office': 'Escritório',
  'Available': 'Disponível', 'Occupied': 'Ocupado', 'Vacant': 'Vago',
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
  // Canvas-specific
  'Value Proposition Canvas': 'Canvas de Proposta de Valor',
  'Fundraising Readiness Canvas': 'Canvas de Preparação para Investimento',
  'Fundraising Readiness': 'Preparação para Angariação de Capital',
  'Sales Pipeline Canvas': 'Canvas de Pipeline de Vendas',
  'Product Roadmap Canvas': 'Canvas de Roadmap de Produto',
  'Pricing & Packaging Canvas': 'Canvas de Preços e Pacotes',
  'Growth Loops Canvas': 'Canvas de Loops de Crescimento',
  'OKRs & North Star Canvas': 'Canvas de OKRs e North Star',
  'Business Model Canvas': 'Canvas de Modelo de Negócio',
  'Growth Loops': 'Loops de Crescimento',
  'Sales Pipeline': 'Pipeline de Vendas',
  'Customer Segments': 'Segmentos de Clientes',
  'Go-To-Market Canvas': 'Canvas Go-to-Market',
  'ICP & Persona Board': 'ICP e Quadro de Personas',
  // Common UI phrases
  'Unknown': 'Desconhecido',
  'Present': 'Presente',
  'Allocation History': 'Histórico de Alocação',
  'allocations': 'alocações',
  'Occupied for': 'Ocupado há',
  'No allocation history for this room': 'Sem histórico de alocação para esta sala',
};

// Reverse dictionary PT→EN
const PT_TO_EN = {};
for (const [en, pt] of Object.entries(EN_TO_PT)) {
  PT_TO_EN[pt] = en;
}

// EN-in-PT explicit fixes
const englishBlacklist = [
  'Fundraising Readiness', 'Business Model Canvas', 'Value Proposition Canvas',
  'Growth Loops', 'Sales Pipeline', 'Customer Segments',
  'Pricing & Packaging Canvas', 'Growth Loops Canvas', 'OKRs & North Star Canvas',
  'Product Roadmap Canvas', 'Sales Pipeline Canvas', 'Fundraising Readiness Canvas',
  'Go-To-Market Canvas', 'ICP & Persona Board',
];

// ========== File scanning ==========
function findTsxFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findTsxFiles(fullPath));
      } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

function extractTranslationKeysWithDefaults(content) {
  const results = new Map();
  let m;
  
  // t('key', 'default') — positional string default
  const p1 = /\bt\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/g;
  while ((m = p1.exec(content)) !== null) {
    if (!results.has(m[1]) || m[2]) results.set(m[1], m[2] || null);
  }
  
  // t('key', { defaultValue: 'text' }) — object default
  const p2 = /\bt\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*defaultValue:\s*['"]([^'"]*)['"]/g;
  while ((m = p2.exec(content)) !== null) {
    if (!results.has(m[1]) || m[2]) results.set(m[1], m[2] || null);
  }
  
  // i18n.t('key', { ... }) — direct i18n.t calls (e.g. dateUtils)
  const p2b = /\bi18n\.t\(\s*['"]([^'"]+)['"]\s*[,)]/g;
  while ((m = p2b.exec(content)) !== null) {
    const key = m[1];
    if (key.includes('${') || key.includes('{{')) continue;
    if (!results.has(key)) results.set(key, null);
  }
  
  // t('key') or t('key', ...) — generic catch-all
  const p3 = /\bt\(\s*['"]([^'"]+)['"]\s*[,)]/g;
  while ((m = p3.exec(content)) !== null) {
    const key = m[1];
    if (key.includes('${') || key.includes('{{')) continue;
    if (!results.has(key)) results.set(key, null);
  }
  
  return results;
}

// ========== Translation ==========
function translateEnToPt(value) {
  if (typeof value !== 'string') return value;
  
  const placeholders = [];
  let protected_ = value.replace(/(\{\{[^}]+\}\}|\{[0-9]+\}|<[^>]+>)/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  if (EN_TO_PT[protected_]) {
    let result = EN_TO_PT[protected_];
    placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
    return result;
  }

  const lower = protected_.toLowerCase();
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (en.toLowerCase() === lower) {
      let result = pt;
      placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
      return result;
    }
  }

  let result = protected_;
  const sortedPairs = Object.entries(EN_TO_PT).sort((a, b) => b[0].length - a[0].length);
  for (const [en, pt] of sortedPairs) {
    if (en.length < 3) continue;
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, pt);
  }

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

  placeholders.forEach((ph, i) => { protected_ = protected_.replace(`__PH${i}__`, ph); });
  return protected_;
}

// ========== Utility ==========
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

// ========== Main ==========
function sync() {
  console.log('🔄 i18n Sync: scanning source files + syncing locales...');
  
  const en = readJson(EN_PATH);
  const pt = readJson(PT_PATH);

  const enFlat = flattenKeys(en);
  const ptFlat = flattenKeys(pt);

  // Phase 1: Extract keys from source code
  const tsxFiles = findTsxFiles(SRC_DIR);
  console.log(`   Scanning ${tsxFiles.length} source files for t() calls...`);
  
  const codeKeys = new Map();
  for (const file of tsxFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const extracted = extractTranslationKeysWithDefaults(content);
      for (const [key, defaultValue] of extracted) {
        if (!codeKeys.has(key) || (defaultValue && !codeKeys.get(key))) {
          codeKeys.set(key, defaultValue);
        }
      }
    } catch {}
  }
  console.log(`   Found ${codeKeys.size} unique keys in code`);
  
  let addedFromCode = 0;
  
  // Add keys from code that don't exist in either locale
  for (const [key, defaultValue] of codeKeys) {
    if (key.includes('${') || key.includes('{{')) continue;
    
    if (enFlat[key] === undefined) {
      if (defaultValue) {
        enFlat[key] = defaultValue;
      } else {
        // Generate from key: "actions.createAction" -> "Create Action"  
        const lastPart = key.split('.').pop();
        enFlat[key] = lastPart.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()).trim();
      }
      addedFromCode++;
    }
    
    if (ptFlat[key] === undefined) {
      const enValue = enFlat[key] || defaultValue;
      if (enValue) {
        ptFlat[key] = translateEnToPt(enValue);
      } else {
        const lastPart = key.split('.').pop();
        ptFlat[key] = lastPart.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()).trim();
      }
    }
  }
  
  // Phase 2: Fix EN-in-PT
  let fixedEnInPt = 0;
  for (const [key, value] of Object.entries(ptFlat)) {
    if (typeof value !== 'string') continue;
    for (const phrase of englishBlacklist) {
      if (value === phrase && EN_TO_PT[phrase]) {
        ptFlat[key] = EN_TO_PT[phrase];
        fixedEnInPt++;
      }
    }
  }
  
  // Phase 3: Ensure parity
  const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(ptFlat)]);
  
  let missingInPt = 0;
  let missingInEn = 0;
  let translated = 0;

  for (const key of allKeys) {
    if (enFlat[key] !== undefined && ptFlat[key] === undefined) {
      missingInPt++;
      const translatedValue = translateEnToPt(enFlat[key]);
      ptFlat[key] = translatedValue || enFlat[key] || key;
      if (translatedValue !== enFlat[key]) translated++;
    }
    if (ptFlat[key] !== undefined && enFlat[key] === undefined) {
      missingInEn++;
      enFlat[key] = translatePtToEn(ptFlat[key]) || ptFlat[key] || key;
    }
  }

  const enFinal = sortObject(unflattenKeys(enFlat));
  const ptFinal = sortObject(unflattenKeys(ptFlat));

  writeJson(EN_PATH, enFinal);
  writeJson(PT_PATH, ptFinal);

  console.log(`✅ i18n Sync complete!`);
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Added ${addedFromCode} keys from code extraction`);
  console.log(`   Filled ${missingInEn} keys missing in EN`);
  console.log(`   Filled ${missingInPt} keys missing in PT (${translated} auto-translated)`);
  console.log(`   Fixed ${fixedEnInPt} EN-in-PT issues`);
}

sync();
