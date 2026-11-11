# Treino Bella

**Versão anterior em produção:** https://treino.leonardoroncolato.com.br — [relatório de publicação](DEPLOYMENT_REPORT.md).

**Revisão de 2026-11-11:** ficha ampliada, nova paleta e demonstrações em todos os exercícios atuais. Alterações preparadas no rascunho; nenhuma nova publicação, migração remota ou alteração de DNS foi executada nesta revisão.

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
- Inicie uma sessão: séries são criadas com UUIDs estáveis. Todas as semanas usam as 3 ou 4 séries da ficha; semanas 1–2 mantêm aproximadamente 3 RIR, sem reduzir automaticamente as séries. Séries unilaterais contam por lado.
- Registre kg, repetições, RIR, observações e conclusão de séries/exercício. Cada edição é persistida imediatamente em localStorage. Falhas de leitura/gravação são mostradas e não sobrescrevem o armazenamento corrupto.
- Toque no descanso do exercício para carregar o cronômetro global. Inicie, pause, reinicie ou adicione 15 segundos. Continua ao navegar entre cartões/dias. Não precisa de áudio; não sobrevive a fechar a página.
- Finalize para registrar duração estimada desde o início; pode editar minutos e data. Histórico permite reabrir, editar e excluir. Limpar e excluir exigem confirmação.
- Exportação JSON inclui registros, tombstones e versões conflitantes; importação valida formato, tamanho e conteúdo e preserva divergências. Não importe arquivos de terceiros: os backups contêm dados privados.
- “Sincronizar” informa se precisa entrar. “Entrar com código por e-mail” abre Access. Depois do login, a aplicação sincroniza; novas alterações são enviadas pelo botão. Ao recuperar conexão em uma sessão conectada, tenta sincronizar novamente.
- Antes de ficar offline, abra a aplicação online e aguarde o service worker instalar. O shell e assets compilados são pré-cacheados. API e autenticação nunca entram no cache. Mídias futuras são cacheadas após uso.

## Treino e volume

Ficha completa e progressão em `src/data/workout.ts`, exibidas em “Plano & evolução”. Cinco dias: terça quadríceps, quarta superior A + dead bug, quinta glúteos, sexta superior B + Pallof, sábado posteriores. Smith na terça somente se confortável; alternativa estável na própria ficha. Sem stiff, terra romeno, agachamento livre ou búlgaro.

A ficha foi ampliada conforme a experiência informada: exercícios de 2 séries passaram a 3 e os de 3 passaram a 4. Não substitui avaliação presencial. Nas semanas 1–2, adapte a carga ao novo volume com aproximadamente 3 RIR; depois, use 1–3 RIR e progressão dupla. Compostos sem falha; isoladores só próximos da falha com técnica segura. Dor implica interromper o movimento. Se a recuperação piorar, reduza temporariamente o volume e procure orientação.

| Dia    | Exercícios | Séries válidas | Organização                                                                                                                 |
| ------ | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Terça  | 5          | 17             | Smith, extensora, panturrilha cavalinho sentada, leg press 45°, adutora                                                     |
| Quarta | 7          | 23             | Desenvolvimento, puxada pronada pela frente, francês, lateral sentada, rosca alternada sentada, remada na máquina, dead bug |
| Quinta | 5          | 17             | Glute drive, coice no cabo, abdutora, leg press unilateral, abdução no cabo                                                 |
| Sexta  | 7          | 23             | Dois supinos em máquinas, remada, inverso, Scott, tríceps na barra, Pallof                                                  |
| Sábado | 5          | 17             | Flexora sentada, deitada e unilateral em pé, extensão de quadril em máquina, panturrilha sentada                            |

Planeje 50–70 minutos incluindo aquecimento e ajustes. Nos superiores, o peito recebe ênfase na sexta para acomodar os seis exercícios solicitados na quarta e o core. Remadas e crucifixo inverso trabalham a estabilidade escapular. O cardio de bicicleta/escada continua opcional, 10–20 minutos leves/moderados após superiores, reduzido ou omitido para respeitar 70 minutos; não encurte os descansos dos compostos para encaixá-lo.

Volume direto aproximado: quadríceps 13; adutores 3; glúteo máximo 10 + compostos; glúteo médio 7; posteriores 10; panturrilhas 8; costas 12; peito 7; ombros 9; bíceps 6; tríceps 6; core 6. Nos unilaterais, conte séries por lado sem dobrar o total. Trabalho indireto não equivale a séries isoladas adicionais. As séries da ficha são geradas ao iniciar uma sessão; registros antigos continuam com os exercícios e a quantidade de séries que tinham.

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

`src/data/workout-legacy.ts` e `src/data/exercise-catalog.ts` preservam IDs e definições da ficha anterior. A API aceita apenas exercícios conhecidos no dia correspondente, incluindo os históricos, e continua validando identidade e propriedade em todas as operações. Não é necessária migração D1 para esta revisão.

## Dependências

Runtime: React/React DOM (interface), Lucide React (ícones ISC), Motion (animações com redução de movimento), Zod (validação compartilhada), JOSE (JWT/JWKS). Desenvolvimento: Vite + plugin React, Cloudflare Vite Plugin e `cf`, TypeScript 6 (compatível com typescript-eslint), Tailwind 4, ESLint/typescript-eslint, Vitest, Playwright, Miniflare e tipos de Node/React/Workers. As versões exatas e transitivas estão no lockfile. R2 não foi adicionado: não há volume de mídia que o justifique.

## Mídias e publicação

**27 movimentos com vídeo:** 9 MP4 locais (CC BY-SA 4.0, aproximadamente 13 MB) e 18 players Vimeo com incorporação pública habilitada pelo autor. Créditos ficam nos cartões. Fontes, licenças, permissões e substituição em [MEDIA_SOURCES.md](MEDIA_SOURCES.md); evidência em `docs/media-evidence.json`.

Toque em “Ver vídeo de execução”. Só uma mídia fica ativa; vídeos começam mudos e respeitam redução de movimento. Arquivos locais ficam disponíveis offline após o primeiro uso. Players externos precisam de internet e só recebem uma conexão após o toque, sem dados dos registros. O botão “Abrir na fonte” permanece disponível se uma mídia falhar.

Para revisar os players reais, com um preview local aberto e internet: `node scripts/check-media.mjs`. Esse teste opcional reproduz os vídeos pelo player oficial, sem baixar os arquivos. Resultados e capturas de revisão ficam em `test-results/media-review/`, ignorados pelo Git. Os testes regulares usam um player simulado para serem determinísticos, além de reproduzirem os MP4 reais.

A versão anterior foi publicada em Workers Static Assets com domínio, Access e D1 reais. O proprietário confirmou login e sincronização em dois dispositivos nesta conversa. Esta revisão não foi publicada. Procedimento reproduzível e metadados em [DEPLOY.md](DEPLOY.md) e `.env.example`; o token nunca deve ser salvo nesses arquivos. Resultado dos testes e limites em [VALIDATION.md](VALIDATION.md).
