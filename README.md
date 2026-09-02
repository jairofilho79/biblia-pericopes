# Perícopes — estudo bíblico NAA (PWA offline)

App de leitura por **perícopes** (unidades narrativas), com texto NAA, contexto, narrador e anotações locais.

## Desenvolvimento

```bash
# 1) Coloque NAA.json em data/NAA.json e o dataset em data/raw/PericopeGroupedKJVVerses.json
npm run pipeline   # ETL + enrich local → data/pericopes.json
npm run dev
```

O catálogo (`data/pericopes.json`) não é servido direto: `npm run shard` fatia ele em
`public/data/index.json` (metadados enxutos das perícopes — o que a Home e a busca
precisam de cara) mais `public/data/texto/<livro>.json` e `public/data/estudo/<livro>.json`
(texto NAA e material de estudo, um arquivo por livro, baixados sob demanda). `predev` e
`prebuild` já rodam `npm run shard` sozinhos antes de `dev`/`build`; ele só regenera se
`data/pericopes.json` for mais novo que a saída (ou com `--force`). Os três destinos em
`public/data/` são derivados e não são versionados.

## Scripts

| Comando | Função |
|---------|--------|
| `npm run etl` | Cruza KJV_Pericopes × NAA → `data/raw-pericopes.jsonl` |
| `npm run enrich` | Enriquecimento local (títulos/contexto template) |
| `npm run enrich:openrouter` | Enriquecimento via OpenRouter (`OPENROUTER_API_KEY`) |
| `npm run enrich:genesis` | OpenRouter só em Gênesis |
| `npm run shard` | Fatia `data/pericopes.json` em `public/data/index.json` + `texto/` + `estudo/` |

## Dados do usuário

Progresso e anotações ficam no IndexedDB (offline-first). Com login (e-mail →
código de 6 dígitos ou magic link), os dados sincronizam entre dispositivos
via Cloudflare D1 (last-write-wins). Sem login, tudo funciona 100% local.

## Deploy

Cloudflare Workers (static assets + API). Push na `main` roda lint, testes,
typecheck do worker, build, migrations D1 e `wrangler deploy` via GitHub Actions.

### Checklist do primeiro deploy

1. `npx wrangler d1 create biblia-pericopes` e coloque o `database_id` real no
   `wrangler.jsonc` (hoje é um placeholder só de zeros).
2. Ajuste `APP_URL` em `wrangler.jsonc` para a URL real do workers.dev
   (formato `<name>.<subdomínio>.workers.dev`) — ela alimenta o `baseURL`, os
   `trustedOrigins` e os links dos e-mails de login.
3. `wrangler secret put BETTER_AUTH_SECRET` e `wrangler secret put RESEND_API_KEY`.
4. `wrangler d1 migrations apply biblia-pericopes --remote`.
5. Sem um domínio verificado no Resend, o remetente `onboarding@resend.dev` só
   entrega e-mails para o dono da conta Resend. Para cadastro aberto de verdade,
   verifique um domínio; até lá, considere restringir com `ALLOWED_EMAILS`.
6. O primeiro run do CI depois do merge vai falhar até os secrets existirem —
   é esperado.

Env opcional `ALLOWED_EMAILS` (lista separada por vírgula) restringe o cadastro.

**Nota:** NAA é texto protegido (SBB). Uso pessoal/estudo; distribuição pública exige licença.
