# Perícopes — estudo bíblico NAA (PWA offline)

App de leitura por **perícopes** (unidades narrativas), com texto NAA, contexto, narrador e anotações locais.

## Desenvolvimento

```bash
# 1) Coloque NAA.json em data/NAA.json e o dataset em data/raw/PericopeGroupedKJVVerses.json
npm run pipeline   # ETL + enrich local → public/data/pericopes.json
npm run dev
```

## Scripts

| Comando | Função |
|---------|--------|
| `npm run etl` | Cruza KJV_Pericopes × NAA → `data/raw-pericopes.jsonl` |
| `npm run enrich` | Enriquecimento local (títulos/contexto template) |
| `npm run enrich:openai` | Enriquecimento via OpenAI (`OPENAI_API_KEY`) |
| `npm run enrich:genesis` | OpenAI só em Gênesis |

## Dados do usuário

Progresso e anotações ficam no IndexedDB (offline-first). Com login (e-mail →
código de 6 dígitos ou magic link), os dados sincronizam entre dispositivos
via Cloudflare D1 (last-write-wins). Sem login, tudo funciona 100% local.

## Deploy

Cloudflare Workers (static assets + API). Push na `main` roda migrations D1 e
`wrangler deploy` via GitHub Actions. Secrets do worker: `BETTER_AUTH_SECRET`,
`RESEND_API_KEY`. Env opcional `ALLOWED_EMAILS` restringe o cadastro.

**Nota:** NAA é texto protegido (SBB). Uso pessoal/estudo; distribuição pública exige licença.
