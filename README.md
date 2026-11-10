# Treino Bella

Aplicação mobile-first para uma ficha pública de hipertrofia com histórico privado, registro local-first e sincronização D1 protegida por Cloudflare Access.

## Desenvolvimento

```sh
npm ci
npm run db:local
npm run dev
```

No ambiente cloud desta tarefa, os diretórios padrão de cache/configuração não são graváveis. Use antes `export XDG_CONFIG_HOME=/workspace/.bella-runtime` e `export npm_config_cache=/tmp/npm-cache`. O repositório fica em `/workspace/treino-musculacao`. Não são necessários tokens ou serviços externos para a ficha, os registros locais e os testes. Cada tarefa cloud já é isolada: use este checkout, sem worktrees adicionais.

O Access está fechado por padrão no ambiente local: API retorna 401. Não existe autenticação de desenvolvimento que possa vazar para produção. Para login e sincronização remotos, siga [DEPLOY.md](DEPLOY.md).

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`test:e2e` usa Chromium em `/usr/bin/chromium`; use `CHROMIUM_PATH` para outro executável. Abre um preview local automaticamente. Service worker só está no build, não no servidor de desenvolvimento. `npm run preview` permite verificar o build offline. Não publicar por esses comandos.

## Uso

- Escolha dia e semana do ciclo. Segunda e domingo são descanso.
- Inicie uma sessão: séries são criadas com UUIDs estáveis. Semana 1–2 usa duas séries; depois, o volume da ficha. Séries unilaterais contam por lado.
- Registre kg, repetições, RIR, observações e conclusão de séries/exercício. Cada edição é persistida imediatamente em localStorage. Falhas de leitura/gravação são mostradas e não sobrescrevem o armazenamento corrupto.
- Toque no descanso do exercício para carregar o cronômetro global. Inicie, pause, reinicie ou adicione 15 segundos. Continua ao navegar entre cartões/dias. Não precisa de áudio; não sobrevive a fechar a página.
- Finalize para registrar duração estimada desde o início; pode editar minutos e data. Histórico permite reabrir, editar e excluir. Limpar e excluir exigem confirmação.
- Exportação JSON inclui registros, tombstones e versões conflitantes; importação valida formato, tamanho e conteúdo e preserva divergências. Não importe arquivos de terceiros: os backups contêm dados privados.
- “Sincronizar” informa se precisa entrar. “Entrar com código por e-mail” abre Access. Depois do login, a aplicação sincroniza; novas alterações são enviadas pelo botão. Ao recuperar conexão em uma sessão conectada, tenta sincronizar novamente.
- Antes de ficar offline, abra a aplicação online e aguarde o service worker instalar. O shell e assets compilados são pré-cacheados. API e autenticação nunca entram no cache. Mídias futuras são cacheadas após uso.

## Treino e volume

Ficha completa e progressão em `src/data/workout.ts`, exibidas em “Plano & evolução”. Cinco dias: terça quadríceps, quarta superior A + dead bug, quinta glúteos, sexta superior B + Pallof, sábado posteriores. Hack somente se confortável; alternativa estável na própria ficha. Sem stiff, terra romeno, agachamento livre ou búlgaro.

O programa é uma base conservadora para iniciante/retorno, não avaliação individual presencial. Volume inicial reduzido, cerca de 3 RIR; após adaptação, 1–3 RIR e progressão dupla. Nos compostos, não buscar falha; nos isoladores, aproximação somente com técnica segura. Em fadiga persistente, reduzir volume e reavaliar. Dor implica interromper o movimento e procurar orientação.

Planeje blocos de 50–70 min incluindo aquecimento, ajustes das máquinas, musculação e desaceleração. Os dias de inferiores com menos exercícios podem terminar antes, especialmente na adaptação: não acrescente séries só para preencher tempo. Cardio opcional após superiores, 10–20 min, reduzido/omitido quando necessário para respeitar 70 min. A programação mantém os cinco dias mesmo com volume conservador.

Séries diretas semanais após adaptação: quadríceps 9; posteriores 5; glúteo máximo 7 + contribuição do leg press/hack; abdutores 3; panturrilhas 6; costas 6; peito 5; ombros 6 + face pull; estabilização escapular 2 + remada/inverso; bíceps 4 + puxadas; tríceps 4 + supinos; core 4. Não somar trabalho indireto como equivalência exata. A progressão é selecionada manualmente, sem aumentar carga automaticamente.

## Persistência e conflitos

`records` usa chave composta `(user_id,id)`. `user_id` vem exclusivamente do `sub` validado do Access. Todos os SELECT/UPDATE/INSERT são parametrizados e delimitados por identidade. Cada série é um registro; um registro especial `__session`, série 0, contém data/duração/conclusão da sessão. Migração em `migrations/0001_records.sql`.

Cada edição mantém a versão-base do servidor. D1 aceita atualização por compare-and-swap atômico e incrementa a versão, com `updated_at` do servidor. Primeira escrita aceita versão 0. Conflito conserva versão local e remota, exibe ambas e exige escolha. A versão já aceita pelo servidor prevalece até essa decisão: relógios de dispositivos não decidem vencedor. Exclusões são tombstones. Resposta perdida é conservadora: repetir pode apresentar conflito em vez de duplicar/silenciar uma alteração. A leitura pagina por UUID; lotes de escrita têm até 100 registros. Novas edições durante uma sincronização permanecem pendentes. Faça nova sincronização para esvaziar a fila.

Privacidade: histórico de cada dispositivo está no seu navegador, sem criptografia própria. Usuários anônimos só acessam seus dados locais, não D1. Em dispositivo compartilhado, logout do Access não apaga localStorage; exporte e limpe os dados do site pelo navegador antes de entregar o aparelho. Não há analytics, envio automático de e-mail, senha ou token salvo em JavaScript. Nenhum perfil biométrico foi incluído no bundle público.

## Arquivos principais

| Caminho                                        | Responsabilidade                                  |
| ---------------------------------------------- | ------------------------------------------------- |
| `src/data/workout.ts`                          | Ficha, instruções, oito semanas e volume          |
| `src/data/media.ts`, `public/media/exercises/` | Mapeamento e arquivos de mídia                    |
| `src/config/app.ts`, `src/types/workout.ts`    | Configuração pública e tipos                      |
| `src/App.tsx`, `src/style.css`                 | Interface responsiva                              |
| `src/components/`                              | Cronômetro e renderizador de mídia                |
| `src/lib/`                                     | Validação, backups, armazenamento e sincronização |
| `worker/auth.ts`, `worker/index.ts`            | Validação Access e API D1                         |
| `migrations/`                                  | SQL reproduzível                                  |
| `cloudflare.config.ts`, `vite.config.ts`       | Workers Static Assets, SPA, D1 local/live         |
| `scripts/`                                     | Shell offline e barreira de deploy                |
| `config/access-policy.json`                    | Política Access reutilizável                      |
| `tests/`                                       | Testes de segurança, banco, registros e navegador |

## Dependências

Runtime: React/React DOM (interface), Lucide React (ícones ISC), Motion (animações com redução de movimento), Zod (validação compartilhada), JOSE (JWT/JWKS). Desenvolvimento: Vite + plugin React, Cloudflare Vite Plugin e `cf`, TypeScript 6 (compatível com typescript-eslint), Tailwind 4, ESLint/typescript-eslint, Vitest, Playwright, Miniflare e tipos de Node/React/Workers. As versões exatas e transitivas estão no lockfile. R2 não foi adicionado: não há volume de mídia que o justifique.

## Mídias e publicação

**Demonstrações pendentes:** todos os exercícios têm placeholder com orientação e link de referência. Nenhuma fotografia/GIF sem autoria/licença comprovadas foi copiada. Pesquisa e checklist em [MEDIA_SOURCES.md](MEDIA_SOURCES.md).

Build preparado para Workers Static Assets, domínio e Access, mas produção exige configuração da conta, autorização e validação conforme [DEPLOY.md](DEPLOY.md). Resultado dos testes e limites em [VALIDATION.md](VALIDATION.md).
