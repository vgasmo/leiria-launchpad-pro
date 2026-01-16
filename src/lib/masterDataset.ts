/**
 * Master Dataset Types and Normalization Utilities
 * For importing external data (Excel, HubSpot) into the platform
 */

// ====================
// TYPES
// ====================

export type ExternalSource = 'excel_clients' | 'hubspot' | 'manual';
export type RoleGuess = 'founder' | 'contact' | 'mentor' | 'investor' | 'unknown';
export type LinkType = 'contact' | 'founder' | 'owner' | 'investor' | 'mentor';

export interface MasterOrganization {
  external_source: ExternalSource;
  external_id: string;
  name: string;
  short_name?: string;
  vat_number?: string;
  country?: string;
  email_main?: string;
  phone_main?: string;
  attributes_json: Record<string, unknown>;
  tags: string[];
  // Dedup tracking
  _match_score?: number;
  _matched_with?: string;
  _is_duplicate?: boolean;
}

export interface MasterPerson {
  external_source: ExternalSource;
  external_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role_guess: RoleGuess;
  attributes_json: Record<string, unknown>;
  // Dedup tracking
  _match_score?: number;
  _matched_with?: string;
  _is_duplicate?: boolean;
}

export interface MasterDeal {
  external_source: ExternalSource;
  external_id: string;
  name: string;
  stage?: string;
  amount?: number;
  close_date?: string;
  owner_email?: string;
  attributes_json: Record<string, unknown>;
}

export interface MasterLink {
  type: 'person_to_org' | 'deal_to_org';
  source_external_id: string;
  target_external_id: string;
  relationship_type: LinkType;
  source_type: 'person' | 'deal';
}

export interface MasterDataset {
  organizations: MasterOrganization[];
  people: MasterPerson[];
  deals: MasterDeal[];
  links: MasterLink[];
  metadata: {
    generated_at: string;
    source_files: string[];
    stats: {
      total_orgs: number;
      total_people: number;
      total_deals: number;
      total_links: number;
      duplicates_found: number;
    };
  };
}

export interface ImportConfig {
  program_id: string;
  default_stage: string;
  owner_consultant_id?: string;
  upsert_mode: boolean;
  dry_run: boolean;
}

export interface ImportResult {
  success: boolean;
  dry_run: boolean;
  summary: {
    would_insert: number;
    would_update: number;
    skipped: number;
    duplicates: number;
    errors: number;
  };
  details: ImportDetail[];
  errors: ImportError[];
}

export interface ImportDetail {
  external_id: string;
  name: string;
  action: 'insert' | 'update' | 'skip' | 'duplicate';
  reason?: string;
}

export interface ImportError {
  row: number;
  external_id?: string;
  field?: string;
  message: string;
}

// ====================
// NORMALIZATION UTILS
// ====================

/**
 * Normalize organization name for matching
 * Removes common suffixes, punctuation, and normalizes case
 */
export function normalizeOrgName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/,?\s*(lda|ltda|s\.?a\.?|unipessoal|limitada|sociedade|empresa|inc|llc|ltd|gmbh|srl|sl|sarl)\.?$/gi, '')
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize VAT/NIF number
 */
export function normalizeVat(vat: string): string {
  if (!vat) return '';
  return vat.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/**
 * Normalize email for matching
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
}

/**
 * Normalize person name for matching
 */
export function normalizePersonName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ====================
// DEDUPLICATION
// ====================

export interface MatchResult {
  match: boolean;
  score: number;
  reason: string;
}

/**
 * Match two organizations
 */
export function matchOrganizations(a: MasterOrganization, b: MasterOrganization): MatchResult {
  // Exact VAT match
  if (a.vat_number && b.vat_number) {
    const vatA = normalizeVat(a.vat_number);
    const vatB = normalizeVat(b.vat_number);
    if (vatA && vatB && vatA === vatB) {
      return { match: true, score: 1.0, reason: 'vat_match' };
    }
  }

  // Email match
  if (a.email_main && b.email_main) {
    const emailA = normalizeEmail(a.email_main);
    const emailB = normalizeEmail(b.email_main);
    if (emailA && emailB && emailA === emailB) {
      return { match: true, score: 0.9, reason: 'email_match' };
    }
  }

  // Name match
  const nameA = normalizeOrgName(a.name);
  const nameB = normalizeOrgName(b.name);
  if (nameA && nameB && nameA === nameB) {
    return { match: true, score: 0.7, reason: 'name_match' };
  }

  return { match: false, score: 0, reason: 'no_match' };
}

/**
 * Match two people
 */
export function matchPeople(a: MasterPerson, b: MasterPerson): MatchResult {
  // Email match (primary)
  if (a.email && b.email) {
    const emailA = normalizeEmail(a.email);
    const emailB = normalizeEmail(b.email);
    if (emailA && emailB && emailA === emailB) {
      return { match: true, score: 1.0, reason: 'email_match' };
    }
  }

  // Name + phone fallback
  const nameA = normalizePersonName(a.full_name);
  const nameB = normalizePersonName(b.full_name);
  if (nameA && nameB && nameA === nameB) {
    if (a.phone && b.phone) {
      const phoneA = normalizePhone(a.phone);
      const phoneB = normalizePhone(b.phone);
      if (phoneA && phoneB && phoneA === phoneB) {
        return { match: true, score: 0.8, reason: 'name_phone_match' };
      }
    }
    return { match: true, score: 0.6, reason: 'name_match_only' };
  }

  return { match: false, score: 0, reason: 'no_match' };
}

/**
 * Deduplicate organizations
 */
export function deduplicateOrganizations(orgs: MasterOrganization[]): MasterOrganization[] {
  const result: MasterOrganization[] = [];
  
  for (const org of orgs) {
    let isDuplicate = false;
    
    for (const existing of result) {
      const matchResult = matchOrganizations(org, existing);
      if (matchResult.match) {
        org._is_duplicate = true;
        org._match_score = matchResult.score;
        org._matched_with = existing.external_id;
        isDuplicate = true;
        break;
      }
    }
    
    result.push(org);
  }
  
  return result;
}

/**
 * Deduplicate people
 */
export function deduplicatePeople(people: MasterPerson[]): MasterPerson[] {
  const result: MasterPerson[] = [];
  
  for (const person of people) {
    let isDuplicate = false;
    
    for (const existing of result) {
      const matchResult = matchPeople(person, existing);
      if (matchResult.match) {
        person._is_duplicate = true;
        person._match_score = matchResult.score;
        person._matched_with = existing.external_id;
        isDuplicate = true;
        break;
      }
    }
    
    result.push(person);
  }
  
  return result;
}

// ====================
// EXCEL PARSING
// ====================

export interface ParsedExcelRow {
  [key: string]: unknown;
}

/**
 * Parse Excel clients file into MasterOrganizations
 * Expected columns (Portuguese): N.º de cliente, Nome, Nome curto, Número de contribuinte, País, etc.
 */
export function parseExcelClients(rows: ParsedExcelRow[]): MasterOrganization[] {
  return rows.map((row, idx) => {
    const attributes: Record<string, unknown> = {};
    
    // Collect all columns as attributes
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        attributes[key] = value;
      }
    });

    // Extract known fields
    const clientNumber = String(row['N.º de cliente'] || row['Nº Cliente'] || row['ClienteID'] || idx + 1);
    const name = String(row['Nome'] || row['Organização'] || row['Empresa'] || '').trim();
    const shortName = String(row['Nome curto'] || row['NomeCurto'] || '').trim() || undefined;
    const vat = String(row['Número de contribuinte'] || row['NIF'] || row['VAT'] || '').trim() || undefined;
    const country = String(row['País'] || row['Country'] || 'Portugal').trim();
    
    // Try to find email and phone
    const email = String(row['Email'] || row['E-mail'] || row['EmailPrincipal'] || '').trim() || undefined;
    const phone = String(row['Telefone'] || row['Phone'] || row['TelefonePrincipal'] || '').trim() || undefined;

    // Extract department/service as tags
    const tags: string[] = ['import_excel'];
    const dept = row['Departamento'] || row['Department'];
    const service = row['Serviço'] || row['Service'];
    const building = row['Edifício'] || row['Building'];
    
    if (dept) tags.push(String(dept));
    if (service) tags.push(String(service));
    if (building) tags.push(String(building));

    return {
      external_source: 'excel_clients' as ExternalSource,
      external_id: `excel_${clientNumber}`,
      name: name || `Cliente ${clientNumber}`,
      short_name: shortName,
      vat_number: vat,
      country,
      email_main: email,
      phone_main: phone,
      attributes_json: attributes,
      tags,
    };
  }).filter(org => org.name);
}

// ====================
// HUBSPOT PARSING
// ====================

/**
 * Parse HubSpot contacts CSV into MasterPeople
 */
export function parseHubSpotContacts(rows: ParsedExcelRow[]): MasterPerson[] {
  return rows.map((row, idx) => {
    const attributes: Record<string, unknown> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        attributes[key] = value;
      }
    });

    const recordId = String(row['Record ID'] || row['hs_object_id'] || row['ID'] || idx + 1);
    const firstName = String(row['First Name'] || row['Primeiro Nome'] || row['Nome'] || '').trim();
    const lastName = String(row['Last Name'] || row['Último Nome'] || row['Apelido'] || '').trim();
    const fullName = String(row['Full Name'] || row['Nome Completo'] || `${firstName} ${lastName}`).trim();
    const email = String(row['Email'] || row['E-mail'] || '').trim() || undefined;
    const phone = String(row['Phone Number'] || row['Phone'] || row['Telefone'] || '').trim() || undefined;

    // Try to infer role
    let roleGuess: RoleGuess = 'unknown';
    const jobTitle = String(row['Job Title'] || row['Cargo'] || '').toLowerCase();
    if (jobTitle.includes('ceo') || jobTitle.includes('founder') || jobTitle.includes('fundador')) {
      roleGuess = 'founder';
    } else if (jobTitle.includes('investor') || jobTitle.includes('investidor')) {
      roleGuess = 'investor';
    } else if (jobTitle.includes('mentor')) {
      roleGuess = 'mentor';
    } else if (jobTitle) {
      roleGuess = 'contact';
    }

    return {
      external_source: 'hubspot' as ExternalSource,
      external_id: `hubspot_contact_${recordId}`,
      full_name: fullName || `Contact ${recordId}`,
      email,
      phone,
      role_guess: roleGuess,
      attributes_json: attributes,
    };
  }).filter(p => p.full_name);
}

/**
 * Parse HubSpot companies CSV into MasterOrganizations
 */
export function parseHubSpotCompanies(rows: ParsedExcelRow[]): MasterOrganization[] {
  return rows.map((row, idx) => {
    const attributes: Record<string, unknown> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        attributes[key] = value;
      }
    });

    const recordId = String(row['Record ID'] || row['hs_object_id'] || row['ID'] || idx + 1);
    const name = String(row['Name'] || row['Company Name'] || row['Nome'] || row['Empresa'] || '').trim();
    const domain = String(row['Company Domain Name'] || row['Domain'] || row['Website'] || '').trim();
    const country = String(row['Country/Region'] || row['Country'] || row['País'] || '').trim() || undefined;
    const phone = String(row['Phone Number'] || row['Phone'] || row['Telefone'] || '').trim() || undefined;

    // Try to extract email from domain or owner
    let email = String(row['Email'] || row['E-mail'] || '').trim() || undefined;
    if (!email && domain) {
      // Could potentially construct info@domain.com
    }

    return {
      external_source: 'hubspot' as ExternalSource,
      external_id: `hubspot_company_${recordId}`,
      name: name || `Company ${recordId}`,
      short_name: undefined,
      vat_number: undefined,
      country,
      email_main: email,
      phone_main: phone,
      attributes_json: attributes,
      tags: ['hubspot'],
    };
  }).filter(org => org.name);
}

/**
 * Parse HubSpot deals CSV into MasterDeals
 */
export function parseHubSpotDeals(rows: ParsedExcelRow[]): MasterDeal[] {
  return rows.map((row, idx) => {
    const attributes: Record<string, unknown> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        attributes[key] = value;
      }
    });

    const recordId = String(row['Record ID'] || row['hs_object_id'] || row['Deal ID'] || row['ID'] || idx + 1);
    const name = String(row['Deal Name'] || row['Nome do Negócio'] || row['Name'] || '').trim();
    const stage = String(row['Deal Stage'] || row['Stage'] || row['Fase'] || '').trim() || undefined;
    const amountStr = String(row['Amount'] || row['Valor'] || row['Deal Amount'] || '0');
    const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || undefined;
    const closeDate = String(row['Close Date'] || row['Data de Fecho'] || '').trim() || undefined;
    const ownerEmail = String(row['Deal Owner'] || row['Owner Email'] || row['Proprietário'] || '').trim() || undefined;

    return {
      external_source: 'hubspot' as ExternalSource,
      external_id: `hubspot_deal_${recordId}`,
      name: name || `Deal ${recordId}`,
      stage,
      amount,
      close_date: closeDate,
      owner_email: ownerEmail,
      attributes_json: attributes,
    };
  }).filter(d => d.name);
}

// ====================
// MASTER DATASET BUILDER
// ====================

export interface DatasetBuildOptions {
  excelClientsRows?: ParsedExcelRow[];
  hubspotContactsRows?: ParsedExcelRow[];
  hubspotCompaniesRows?: ParsedExcelRow[];
  hubspotDealsRows?: ParsedExcelRow[];
}

/**
 * Build a complete master dataset from all sources
 */
export function buildMasterDataset(options: DatasetBuildOptions): MasterDataset {
  const sourceFiles: string[] = [];
  let allOrgs: MasterOrganization[] = [];
  let allPeople: MasterPerson[] = [];
  let allDeals: MasterDeal[] = [];
  const links: MasterLink[] = [];

  // Parse Excel clients
  if (options.excelClientsRows && options.excelClientsRows.length > 0) {
    sourceFiles.push('excel_clients');
    const excelOrgs = parseExcelClients(options.excelClientsRows);
    allOrgs = allOrgs.concat(excelOrgs);
  }

  // Parse HubSpot companies
  if (options.hubspotCompaniesRows && options.hubspotCompaniesRows.length > 0) {
    sourceFiles.push('hubspot_companies');
    const hubspotOrgs = parseHubSpotCompanies(options.hubspotCompaniesRows);
    allOrgs = allOrgs.concat(hubspotOrgs);
  }

  // Parse HubSpot contacts
  if (options.hubspotContactsRows && options.hubspotContactsRows.length > 0) {
    sourceFiles.push('hubspot_contacts');
    const contacts = parseHubSpotContacts(options.hubspotContactsRows);
    allPeople = allPeople.concat(contacts);
  }

  // Parse HubSpot deals
  if (options.hubspotDealsRows && options.hubspotDealsRows.length > 0) {
    sourceFiles.push('hubspot_deals');
    const deals = parseHubSpotDeals(options.hubspotDealsRows);
    allDeals = allDeals.concat(deals);
  }

  // Deduplicate
  const dedupedOrgs = deduplicateOrganizations(allOrgs);
  const dedupedPeople = deduplicatePeople(allPeople);

  const duplicatesCount = 
    dedupedOrgs.filter(o => o._is_duplicate).length +
    dedupedPeople.filter(p => p._is_duplicate).length;

  return {
    organizations: dedupedOrgs,
    people: dedupedPeople,
    deals: allDeals,
    links,
    metadata: {
      generated_at: new Date().toISOString(),
      source_files: sourceFiles,
      stats: {
        total_orgs: dedupedOrgs.length,
        total_people: dedupedPeople.length,
        total_deals: allDeals.length,
        total_links: links.length,
        duplicates_found: duplicatesCount,
      },
    },
  };
}

// ====================
// EXPORT UTILS
// ====================

/**
 * Convert master dataset to CSV format
 */
export function datasetToCSV(items: (MasterOrganization | MasterPerson | MasterDeal)[]): string {
  if (items.length === 0) return '';
  
  const allKeys = new Set<string>();
  items.forEach(item => {
    Object.keys(item).forEach(key => {
      if (!key.startsWith('_') && key !== 'attributes_json') {
        allKeys.add(key);
      }
    });
  });
  
  const headers = Array.from(allKeys);
  const rows = items.map(item => {
    return headers.map(header => {
      const value = (item as unknown as Record<string, unknown>)[header];
      if (Array.isArray(value)) return value.join(';');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value ?? '');
    }).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate notes from attributes_json for funnel_items
 */
export function formatAttributesAsNotes(attributes: Record<string, unknown>, vatNumber?: string, country?: string): string {
  const lines: string[] = [];
  
  if (vatNumber) lines.push(`NIF: ${vatNumber}`);
  if (country) lines.push(`País: ${country}`);
  
  const skipKeys = new Set(['Nome', 'Name', 'Email', 'E-mail', 'Phone', 'Telefone', 'N.º de cliente', 'Record ID', 'hs_object_id']);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (!skipKeys.has(key) && value !== null && value !== undefined && value !== '') {
      lines.push(`${key}: ${value}`);
    }
  });
  
  return lines.slice(0, 10).join('\n'); // Limit to 10 lines
}
