# Infraestrutura remota

## Ambientes

- `development`: branch de trabalho usando um projeto Supabase remoto de desenvolvimento.
- `staging`: GitHub Environment protegido, projeto Supabase remoto de homologação e destino Hostinger de homologação.
- `production`: GitHub Environment protegido, aprovação manual, projeto Supabase remoto de produção e destino Hostinger de produção.

Nenhum banco, Storage, Auth ou Edge Function é executado localmente. O Dockerfile gera o frontend estático imutável para publicação no runtime remoto da Hostinger.

## Provedor de hospedagem

A hospedagem oficial do Vivendo da Música é **Hostinger**. O deploy deve passar pelo Release Agent e pelo `DeploymentProviderRegistry`; chamadas diretas de agentes ao provedor são proibidas.

O modo deve ser configurado explicitamente por ambiente:

- `vps-docker`: Hostinger VPS executando o artefato/container aprovado;
- `web-app`: Hostinger Web App quando esse for o produto contratado.

Enquanto `HOSTINGER_DEPLOYMENT_MODE` e o target não estiverem definidos, o deploy permanece fail-closed.

## Variáveis e segredos

Configure em cada GitHub Environment:

| Tipo | Nome | Uso |
|---|---|---|
| Variable | `SUPABASE_PROJECT_REF` | Projeto remoto alvo |
| Variable | `VITE_SUPABASE_URL` | URL pública do projeto remoto |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do frontend |
| Secret | `SUPABASE_ACCESS_TOKEN` | CLI de deploy |
| Secret | `SUPABASE_DB_PASSWORD` | Aplicação remota de migrações |
| Variable | `HOSTINGER_DEPLOYMENT_MODE` | `vps-docker` ou `web-app` |
| Variable | `HOSTINGER_TARGET_ID` | Identificador do destino Hostinger do ambiente |
| Secret | `HOSTINGER_API_KEY` | Token Hostinger usado pelo transporte de deploy quando exigido |

Para `vps-docker`, o target corresponde ao VPS/VM configurado para o ambiente. Tokens e segredos Hostinger nunca entram em variáveis `VITE_*`, no bundle do navegador ou no Evidence Store em texto puro.

Segredos Stripe serão configurados posteriormente diretamente no cofre remoto do Supabase e não fazem parte deste release.

## Fluxo de release

1. O workflow `Quality Gates` valida cada pull request, sempre sequencialmente.
2. O workflow manual `Remote Release` seleciona `staging` ou `production`.
3. Auditoria, testes, migrações e Edge Functions são executados nessa ordem.
4. A imagem recebe tags do ambiente e do SHA, com SBOM e proveniência no GHCR.
5. O Release Agent valida gates, evidências e aprovação humana quando obrigatória.
6. O adapter Hostinger promove exatamente o artefato/tag SHA aprovado para o target daquele ambiente.
7. Smoke tests confirmam a promoção antes de o workflow poder ser encerrado como concluído.

## Versionamento e rollback

- Código e imagem: SemVer para releases e SHA imutável para deploy.
- Banco: migrações SQL somente aditivas/forward-only; nunca editar uma migração aplicada.
- Edge Functions: redeploy do SHA anterior quando não houver mudança incompatível de banco.
- Frontend/Hostinger: promover o artefato SHA anterior através do mesmo adapter governado; nunca realizar rollback fora do runtime sem registrar evidência e aprovação aplicável.
- Banco: corrigir com nova migração; restauração de backup é reservada a perda/corrupção de dados.

## Backup e recuperação

- Habilitar backups gerenciados e, em produção, Point-in-Time Recovery no Supabase.
- Validar mensalmente a restauração em um projeto remoto isolado.
- Manter buckets privados, políticas RLS e segredos fora dos dumps.
- RPO alvo: 24 horas com backup diário; 5 minutos quando PITR estiver habilitado.
- RTO alvo: 4 horas para aplicação completa e 1 hora para rollback apenas do frontend.

Consulte `infra/disaster-recovery.md` antes de qualquer restauração.
