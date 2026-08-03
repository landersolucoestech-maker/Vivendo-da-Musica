import { spawnSync } from 'node:child_process';

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
if (!projectRef) {
  console.error('SUPABASE_PROJECT_REF é obrigatório.');
  process.exit(1);
}
if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error('SUPABASE_ACCESS_TOKEN é obrigatório.');
  process.exit(1);
}

const functions = [
  { name: 'create-commerce-checkout', noVerifyJwt: false },
  { name: 'payment-webhook', noVerifyJwt: true },
  { name: 'service-delivery-file-access', noVerifyJwt: false },
  { name: 'manage-service-catalog', noVerifyJwt: false },
  { name: 'download-access', noVerifyJwt: false },
  { name: 'create-course-checkout', noVerifyJwt: false },
  { name: 'create-digital-product-checkout', noVerifyJwt: false },
  { name: 'create-beat-checkout', noVerifyJwt: false },
];

for (const item of functions) {
  const args = ['supabase', 'functions', 'deploy', item.name, '--project-ref', projectRef];
  if (item.noVerifyJwt) args.push('--no-verify-jwt');
  console.log(`Publicando ${item.name}${item.noVerifyJwt ? ' sem JWT da aplicação' : ''}...`);
  const result = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Funções Supabase publicadas com sucesso.');
