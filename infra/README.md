# Infraestrutura remota

## Ambientes

- `development`: branch de trabalho usando um projeto Supabase remoto de desenvolvimento.
- `staging`: GitHub Environment protegido e projeto Supabase remoto de homologação.
- `production`: GitHub Environment protegido, aprovação manual e projeto Supabase remoto de produção.

Nenhum banco, Storage, Auth ou Edge Function é executado localmente. O Dockerfile gera somente o frontend estático imutável para publicação em um runtime remoto.

## Variáveis e segredos

Configure em cada GitHub Environment:

| Tipo | Nome | Uso |
|---|---|---|
| Variable | `SUPABASE_PROJECT_REF` | Projeto remoto alvo |
| Variable | `VITE_SUPABASE_URL` | URL pública do projeto remoto |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do frontend |
| Secret | `SUPABASE_ACCESS_TOKEN` | CLI de deploy |
| Secret | `SUPABASE_DB_PASSWORD` | Aplicação remota de migrações |

Segredos Stripe serão configurados posteriormente diretamente no cofre remoto do Supabase e não fazem parte deste release.

## Fluxo de release

1. O workflow `Quality Gates` valida cada pull request, sempre sequencialmente.
2. O workflow manual `Remote Release` seleciona `staging` ou `production`.
3. Auditoria, testes, migrações e Edge Functions são executados nessa ordem.
4. A imagem recebe tags do ambiente e do SHA, com SBOM e proveniência no GHCR.
5. O provedor remoto do frontend deve promover exatamente a tag SHA aprovada.

## Versionamento e rollback

- Código e imagem: SemVer para releases e SHA imutável para deploy.
- Banco: migrações SQL somente aditivas/forward-only; nunca editar uma migração aplicada.
- Edge Functions: redeploy do SHA anterior quando não houver mudança incompatível de banco.
- Frontend: apontar o runtime remoto para a tag SHA anterior.
- Banco: corrigir com nova migração; restauração de backup é reservada a perda/corrupção de dados.

## Backup e recuperação

- Habilitar backups gerenciados e, em produção, Point-in-Time Recovery no Supabase.
- Validar mensalmente a restauração em um projeto remoto isolado.
- Manter buckets privados, políticas RLS e segredos fora dos dumps.
- RPO alvo: 24 horas com backup diário; 5 minutos quando PITR estiver habilitado.
- RTO alvo: 4 horas para aplicação completa e 1 hora para rollback apenas do frontend.

Consulte `infra/disaster-recovery.md` antes de qualquer restauração.

