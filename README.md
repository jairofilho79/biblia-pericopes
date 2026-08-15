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

Progresso e anotações ficam no IndexedDB do navegador (offline).

**Nota:** NAA é texto protegido (SBB). Uso pessoal/estudo; distribuição pública exige licença.
