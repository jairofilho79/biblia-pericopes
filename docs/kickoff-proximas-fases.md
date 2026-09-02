# Kickoff — próximas fases do app (sessão paralela)

> Arquivo de largada para uma sessão nova do Claude Code. Prompt sugerido:
> **"Leia docs/kickoff-proximas-fases.md e me proponha por onde começar."**

## Estado do projeto (2026-09-01)

- App de leitura de perícopes bíblicas (React + Vite, dados em
  `public/data/pericopes.json`, 2.647 perícopes). Sync/auth via Cloudflare
  Worker já entregue.
- Pacotes de UX 1–4 entregues (leitura, versículos, navegação, engajamento —
  specs e planos em `docs/superpowers/specs/` e `docs/superpowers/plans/`).
- TTS por voz sintética em `Leitura` já funciona (Web Speech API) com realce
  de versículo e wake lock.

## Em andamento NOUTRA sessão — não mexer

A geração das narrações profissionais (vozes clonadas via Fish Audio/
OpenRouter) está sendo tocada em outra sessão do Claude Code. **Esta sessão
não deve tocar** em:

- `docs/superpowers/specs/2026-09-01-tts-batch-vozes-design.md`
- `docs/superpowers/plans/2026-09-01-tts-batch-geracao.md`
- qualquer pipeline de geração/upload de áudio (spike em `../tts-spike/`)

O player imersivo (fase 2 do TTS: áudio pré-gerado com manifesto de
sincronização por unidade) depende dos áudios prontos — só entra aqui quando
a outra sessão publicar os manifestos.

## Candidatos a próxima fase (escolher com o usuário)

1. **Backlog pós-pacotes** — `docs/superpowers/backlog-pos-pacotes.md`:
   melhorias adjudicadas nas revisões finais (endurecimento do Worker, a11y
   da barra de ações, foco/scroll na navegação, busca). Itens pequenos e
   independentes, bons para começar.
2. **Live refresh pós-sync** — evento `pericopes-sync` após `applyRemote*`
   para dados de outro aparelho aparecerem sem navegar (limitação comentada
   em `Home.tsx`).
3. **Ideias novas do usuário** — perguntar antes de assumir.

## Regras da casa

- Fluxo superpowers: brainstorm → spec → plano → execução (skills do plugin).
- TDD nos módulos com infra de teste; commits frequentes e pequenos.
- Segredos NUNCA via shell do Claude (o usuário grava em terminal próprio);
  chaves em arquivos git-ignorados (`.env`, `.tts-key.local`).
- Textos de UI em pt-BR; commits em pt-BR no padrão dos existentes.
