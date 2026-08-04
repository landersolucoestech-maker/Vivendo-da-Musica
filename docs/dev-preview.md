# Preview da branch `dev`

A prévia pública da aplicação é publicada sem alterar a branch `main`.

## Endereço estável

`https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1/vivendo-preview`

## Fluxo de publicação

1. O GitHub Actions compila a branch `dev` com autenticação desabilitada apenas para a prévia.
2. Os assets versionados são publicados na branch técnica `dev-preview-static` e entregues pelo jsDelivr.
3. O `index.html` é identificado pelo SHA real da branch e publicado em um caminho imutável do Supabase Storage.
4. A Edge Function `vivendo-preview` resolve o build mais recente e redireciona para o documento público.
5. O Chromium valida montagem do React, conteúdo visível, carregamento de JavaScript e CSS e navegação por hash.

A prévia utiliza `HashRouter` exclusivamente no build hospedado. O desenvolvimento e o build principal continuam usando `BrowserRouter`.
