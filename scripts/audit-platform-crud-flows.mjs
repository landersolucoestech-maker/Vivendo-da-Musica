import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

const ROOT = 'src';
const MODAL_CONTENT_TAGS = ['DialogContent', 'AlertDialogContent', 'SheetContent'];
const STANDALONE_FORM_ALLOWLIST = [
  /\/modules\/auth\/pages\//,
  /\/modules\/checkout\/pages\//,
  /\/pages\/Contact\.tsx$/,
  /\/modules\/profile\/pages\/EditProfile\.tsx$/,
  /\/modules\/dashboard\/pages\/StudentSettingsPage\.tsx$/,
  /\/modules\/certificates\/pages\/ValidateCertificatePage\.tsx$/,
];

const normalize = (path) => path.replaceAll('\\', '/');

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
};

const lineAt = (source, index) => source.slice(0, index).split('\n').length;

const modalIntervals = (source) => {
  const intervals = [];
  for (const tag of MODAL_CONTENT_TAGS) {
    const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
    const stack = [];
    for (const match of source.matchAll(token)) {
      const raw = match[0];
      const index = match.index ?? 0;
      if (raw.startsWith(`</${tag}`)) {
        const start = stack.pop();
        if (start !== undefined) intervals.push({ start, end: index + raw.length, tag });
      } else if (!raw.endsWith('/>')) {
        stack.push(index);
      }
    }
  }
  return intervals;
};

const insideModal = (index, intervals) => intervals.some((interval) => index > interval.start && index < interval.end);

const intentFor = (text) => {
  const normalized = text.toLocaleLowerCase('pt-BR');
  if (/\b(login|entrar|senha|cadastro de conta|registrar conta)\b/.test(normalized)) return 'auth';
  if (/\b(checkout|pagamento|finalizar compra)\b/.test(normalized)) return 'checkout';
  if (/\b(buscar|pesquisar|filtrar|filtro|validar certificado)\b/.test(normalized)) return 'filter';
  if (/\b(novo|nova|criar|cadastrar|adicionar|publicar|registrar|solicitar|abrir solicitação|enviar solicitação)\b/.test(normalized)) return 'create';
  if (/\b(editar|alterar|atualizar|salvar alterações|substituir)\b/.test(normalized)) return 'edit';
  if (/\b(ver|visualizar|detalhes|consultar|abrir)\b/.test(normalized)) return 'view';
  return 'other';
};

const extractLabels = (source) => {
  const labels = [];
  const pattern = />\s*([^<>\n]{2,100}?)\s*</g;
  for (const match of source.matchAll(pattern)) {
    const label = match[1].replace(/\s+/g, ' ').trim();
    if (/^(novo|nova|criar|cadastrar|adicionar|publicar|registrar|solicitar|editar|alterar|ver|visualizar|detalhes|abrir)(\b|\s)/i.test(label)) labels.push(label);
  }
  return [...new Set(labels)].slice(0, 40);
};

const files = await walk(ROOT);
const sourceByPath = new Map();
for (const absolutePath of files) sourceByPath.set(absolutePath, await readFile(absolutePath, 'utf8'));

const selfContainedPopupComponents = new Set(
  files
    .filter((absolutePath) => {
      const source = sourceByPath.get(absolutePath) ?? '';
      return /<form\b/.test(source) && /(?:DialogContent|AlertDialogContent|SheetContent)/.test(source);
    })
    .map((absolutePath) => basename(absolutePath).replace(/\.tsx?$/, '')),
);

const forms = [];
const delegatedForms = [];
const modules = new Map();
const violations = [];

for (const absolutePath of files) {
  const path = normalize(relative('.', absolutePath));
  const source = sourceByPath.get(absolutePath) ?? '';
  const intervals = modalIntervals(source);
  const labels = extractLabels(source);
  const moduleName = path.split('/')[2] ?? 'shared';
  const allowedStandalone = STANDALONE_FORM_ALLOWLIST.some((pattern) => pattern.test(`/${path}`));
  const summary = modules.get(moduleName) ?? {
    files: 0,
    forms: 0,
    delegatedForms: 0,
    modalForms: 0,
    inlineForms: 0,
    create: 0,
    edit: 0,
    view: 0,
  };
  summary.files += 1;

  for (const match of source.matchAll(/<form\b/g)) {
    const index = match.index ?? 0;
    const context = source.slice(Math.max(0, index - 1800), Math.min(source.length, index + 3500));
    const intent = intentFor(context);
    const modal = insideModal(index, intervals);
    const item = { path, line: lineAt(source, index), intent, presentation: modal ? 'popup' : 'inline', allowedStandalone };
    forms.push(item);
    summary.forms += 1;
    if (modal) summary.modalForms += 1;
    else summary.inlineForms += 1;
    if (intent === 'create') summary.create += 1;
    if (intent === 'edit') summary.edit += 1;
    if (intent === 'view') summary.view += 1;

    if (!modal && !allowedStandalone && ['create', 'edit'].includes(intent)) {
      violations.push(`${path}:${item.line} — formulário ${intent === 'create' ? 'de criação/solicitação' : 'de edição'} está direto na página.`);
    }
  }

  if (/\/pages\//.test(path)) {
    for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*(?:Form|Editor))\b/g)) {
      const component = match[1];
      const index = match.index ?? 0;
      const modal = insideModal(index, intervals);
      const selfContainedPopup = selfContainedPopupComponents.has(component);
      delegatedForms.push({ path, line: lineAt(source, index), component, presentation: modal || selfContainedPopup ? 'popup' : 'inline' });
      summary.delegatedForms += 1;
      if (!modal && !selfContainedPopup && !allowedStandalone) {
        violations.push(`${path}:${lineAt(source, index)} — componente de formulário ${component} está renderizado diretamente na página.`);
      }
    }
  }

  const hasCreateAction = labels.some((label) => /^(novo|nova|criar|cadastrar|adicionar|publicar|registrar|solicitar)/i.test(label));
  const hasEditAction = labels.some((label) => /^(editar|alterar)/i.test(label));
  const hasViewAction = labels.some((label) => /^(ver|visualizar|detalhes|abrir)/i.test(label));
  const operationalPage = /\/pages\/.+Page\.tsx$/.test(path) && !/Public|Landing|Detail|Login|Register|Checkout|Payment|NotFound|ComingSoon/.test(path);
  const nestedManagementComponent = /\/components\/.+(?:Actions|Editor|Manager|Management)\.tsx$/.test(path);

  if ((operationalPage || nestedManagementComponent) && (hasCreateAction || hasEditAction) && !hasViewAction && !/Dashboard/.test(path)) {
    violations.push(`${path} — possui Criar/Editar/Solicitar, mas não expõe uma ação explícita de Ver/Visualizar.`);
  }

  if (/(?:slide-in-from|slide-out-to)-(?:left|right|top|bottom)/.test(source) && /(?:DialogContent|AlertDialogContent|SheetContent)/.test(source)) {
    violations.push(`${path} — modal ainda contém animação slide-in/slide-out.`);
  }

  if (/SheetContent\s+side=/.test(source)) {
    violations.push(`${path} — SheetContent ainda define side e pode voltar a abrir como painel lateral.`);
  }

  modules.set(moduleName, summary);
}

const routeFiles = ['src/App.tsx', 'src/AppWithCommerce.tsx'];
const routes = [];
for (const path of routeFiles) {
  try {
    const source = await readFile(path, 'utf8');
    for (const match of source.matchAll(/<Route\s+path=\{?([^\s}]+)\}?\s+element=/g)) {
      routes.push({ path, expression: match[1] });
    }
  } catch {
    // Optional route file.
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  routeDeclarations: routes.length,
  selfContainedPopupComponents: [...selfContainedPopupComponents].sort(),
  forms,
  delegatedForms,
  modules: Object.fromEntries([...modules.entries()].sort(([a], [b]) => a.localeCompare(b))),
  violations,
};

console.log('=== PLATFORM CRUD/MODAL AUDIT ===');
console.log(JSON.stringify(report, null, 2));
console.log('=== END PLATFORM CRUD/MODAL AUDIT ===');

if (violations.length) {
  throw new Error(`Auditoria encontrou ${violations.length} violação(ões):\n${violations.map((item) => `- ${item}`).join('\n')}`);
}

console.log(`Auditoria concluída: ${files.length} arquivos, ${forms.length} formulários, ${delegatedForms.length} formulários delegados e ${routes.length} rotas.`);
