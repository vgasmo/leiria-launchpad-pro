#!/usr/bin/env node
/**
 * i18n Extract & Fix Script
 * 
 * 1. Scans all TSX/TS files for t('key', 'default') and t('key', { defaultValue: '...' })
 * 2. Adds missing keys to en.json using the defaultValue as the EN text
 * 3. Adds missing keys to pt.json using auto-translation or the EN text as fallback
 * 4. Fixes known English phrases in pt.json
 * 5. Sorts both locale files for consistency
 *
 * Usage: node scripts/i18n-extract-fix.cjs
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
  'Document': 'Documento', 'Documents': 'Documentos',
  'Report': 'Relatório', 'Reports': 'Relatórios',
  'Contract': 'Contrato', 'Contracts': 'Contratos',
  'Building': 'Edifício', 'Space': 'Espaço', 'Spaces': 'Espaços',
  'Lead': 'Lead', 'Leads': 'Leads', 'Pipeline': 'Pipeline',
  'Notification': 'Notificação', 'Notifications': 'Notificações',
  'Alert': 'Alerta', 'Alerts': 'Alertas',
  'Calendar': 'Calendário', 'Dashboard': 'Painel',
  'Overview': 'Visão Geral', 'Summary': 'Resumo',
  'History': 'Histórico', 'Activity': 'Atividade',
  'Health': 'Saúde', 'Score': 'Pontuação',
  'Playbook': 'Playbook', 'Playbooks': 'Playbooks',
  'No results found': 'Nenhum resultado encontrado',
  'No data available': 'Sem dados disponíveis',
  'Something went wrong': 'Algo correu mal',
  'Please try again': 'Por favor tente novamente',
  'All': 'Todos', 'None': 'Nenhum', 'Other': 'Outro',
  'Yes': 'Sim', 'No': 'Não',
  'Today': 'Hoje', 'days': 'dias', 'hours': 'horas', 'minutes': 'minutos',
  'more': 'mais', 'less': 'menos', 'total': 'total',
  'items': 'itens', 'results': 'resultados',
  'required': 'obrigatório', 'optional': 'opcional',
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
};

// ========== EN-in-PT explicit fixes ==========
// Map of pt.json dotted keys that have EN values and need PT translations
const EN_IN_PT_FIXES = {
  'templates.canvas.value_prop.title': 'Canvas de Proposta de Valor',
  'templates.canvas.fundraising.title': 'Canvas de Preparação para Investimento',
  'templates.canvas.sales_pipeline.title': 'Canvas de Pipeline de Vendas',
  'templates.canvas.roadmap.title': 'Canvas de Roadmap de Produto',
  'templates.canvas.pricing.title': 'Canvas de Preços e Pacotes',
  'templates.canvas.growth_loops.title': 'Canvas de Loops de Crescimento',
  'templates.canvas.okrs.title': 'Canvas de OKRs e North Star',
  'templates.canvas.icp.title': 'ICP e Quadro de Personas',
  'templates.canvas.gtm.title': 'Canvas Go-to-Market',
  'templates.canvas.lean.title': 'Lean Canvas',
  'templates.canvas.swot.title': 'Análise SWOT',
  'templates.canvas.bmc.title': 'Canvas de Modelo de Negócio',
  'templates.canvas.empathy.title': 'Mapa de Empatia',
};

// ========== Utility Functions ==========
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
  const results = [];
  
  // Pattern 1: t('key', 'default') or t("key", "default")
  const p1 = /\bt\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = p1.exec(content)) !== null) {
    results.push({ key: m[1], defaultValue: m[2] });
  }
  
  // Pattern 2: t('key', { defaultValue: 'text' })
  const p2 = /\bt\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*defaultValue:\s*['"]([^'"]+)['"]/g;
  while ((m = p2.exec(content)) !== null) {
    results.push({ key: m[1], defaultValue: m[2] });
  }
  
  // Pattern 3: t('key') without default - just the key
  const p3 = /\bt\(\s*['"]([^'"]+)['"]\s*[,)]/g;
  while ((m = p3.exec(content)) !== null) {
    const key = m[1];
    if (key.includes('${') || key.includes('{{')) continue;
    if (!results.some(r => r.key === key)) {
      results.push({ key, defaultValue: null });
    }
  }
  
  return results;
}

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function unflattenKeys(flatObj) {
  const result = {};
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        current[parts[i]] = value;
      } else {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
    }
  }
  return result;
}

function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((sorted, key) => {
    sorted[key] = sortObject(obj[key]);
    return sorted;
  }, {});
}

function translateEnToPt(value) {
  if (typeof value !== 'string') return value;
  
  const placeholders = [];
  let protected_ = value.replace(/(\{\{[^}]+\}\}|\{[0-9]+\}|<[^>]+>)/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  // Exact match
  if (EN_TO_PT[protected_]) {
    let result = EN_TO_PT[protected_];
    placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
    return result;
  }

  // Case-insensitive
  const lower = protected_.toLowerCase();
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (en.toLowerCase() === lower) {
      let result = pt;
      placeholders.forEach((ph, i) => { result = result.replace(`__PH${i}__`, ph); });
      return result;
    }
  }

  // Word-level replacement
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

function getNestedKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// ========== Main ==========
function main() {
  console.log('🔍 Scanning source files for t() calls...');
  
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
  const pt = JSON.parse(fs.readFileSync(PT_PATH, 'utf-8'));
  
  const enFlat = flattenKeys(en);
  const ptFlat = flattenKeys(pt);
  
  const tsxFiles = findTsxFiles(SRC_DIR);
  console.log(`   Found ${tsxFiles.length} source files`);
  
  // Collect all keys used in code
  const codeKeys = new Map(); // key -> defaultValue (EN)
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const extracted = extractTranslationKeysWithDefaults(content);
    for (const { key, defaultValue } of extracted) {
      if (!codeKeys.has(key) || (defaultValue && !codeKeys.get(key))) {
        codeKeys.set(key, defaultValue);
      }
    }
  }
  console.log(`   Found ${codeKeys.size} unique translation keys in code`);
  
  let addedToEn = 0;
  let addedToPt = 0;
  let fixedEnInPt = 0;
  
  // Step 1: Fix known EN-in-PT issues
  for (const [key, ptValue] of Object.entries(EN_IN_PT_FIXES)) {
    if (ptFlat[key] !== ptValue) {
      ptFlat[key] = ptValue;
      fixedEnInPt++;
    }
  }
  
  // Step 2: Scan PT values for blacklisted EN phrases and fix them
  const englishBlacklist = [
    'Fundraising Readiness', 'Business Model Canvas', 'Value Proposition Canvas',
    'Growth Loops', 'Sales Pipeline', 'Customer Segments',
    'Pricing & Packaging Canvas', 'Growth Loops Canvas', 'OKRs & North Star Canvas',
    'Product Roadmap Canvas', 'Sales Pipeline Canvas', 'Fundraising Readiness Canvas',
  ];
  
  for (const [key, value] of Object.entries(ptFlat)) {
    if (typeof value !== 'string') continue;
    for (const phrase of englishBlacklist) {
      if (value === phrase && EN_TO_PT[phrase]) {
        ptFlat[key] = EN_TO_PT[phrase];
        fixedEnInPt++;
      }
    }
  }
  
  // Step 3: Add missing keys from code to both locales
  for (const [key, defaultValue] of codeKeys) {
    // Skip dynamic keys
    if (key.includes('${') || key.includes('{{')) continue;
    
    // Add to EN if missing
    if (enFlat[key] === undefined) {
      if (defaultValue) {
        enFlat[key] = defaultValue;
      } else {
        // Generate from key: "actions.createAction" -> "Create Action"
        const lastPart = key.split('.').pop();
        enFlat[key] = lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      }
      addedToEn++;
    }
    
    // Add to PT if missing
    if (ptFlat[key] === undefined) {
      const enValue = enFlat[key] || defaultValue;
      if (enValue) {
        const translated = translateEnToPt(enValue);
        ptFlat[key] = translated;
      } else {
        const lastPart = key.split('.').pop();
        ptFlat[key] = lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      }
      addedToPt++;
    }
  }
  
  // Step 4: Ensure parity - keys in EN but not PT and vice versa
  const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(ptFlat)]);
  for (const key of allKeys) {
    if (enFlat[key] !== undefined && ptFlat[key] === undefined) {
      ptFlat[key] = translateEnToPt(enFlat[key]);
      addedToPt++;
    }
    if (ptFlat[key] !== undefined && enFlat[key] === undefined) {
      enFlat[key] = ptFlat[key]; // Use PT as fallback for EN
      addedToEn++;
    }
  }
  
  // Step 5: Write sorted results
  const enFinal = sortObject(unflattenKeys(enFlat));
  const ptFinal = sortObject(unflattenKeys(ptFlat));
  
  fs.writeFileSync(EN_PATH, JSON.stringify(enFinal, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(PT_PATH, JSON.stringify(ptFinal, null, 2) + '\n', 'utf-8');
  
  console.log(`\n✅ i18n Extract & Fix complete!`);
  console.log(`   Added ${addedToEn} keys to en.json`);
  console.log(`   Added ${addedToPt} keys to pt.json`);
  console.log(`   Fixed ${fixedEnInPt} EN-in-PT issues`);
  console.log(`   Total keys: ${allKeys.size}`);
  
  // Step 6: Export missing keys JSON for audit
  const missingReport = {
    addedToEn,
    addedToPt,
    fixedEnInPt,
    totalKeys: allKeys.size,
  };
  
  const reportPath = path.join(ROOT, 'scripts/i18n-missing-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(missingReport, null, 2) + '\n');
  console.log(`   Report saved to ${reportPath}`);
}

main();
