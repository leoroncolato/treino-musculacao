# Validação da revisão — 2026-11-11

Repositório: `/workspace/treino-musculacao`, branch local `work`, base `f10c99f`. O ambiente de execução respondeu a `pwd` e `git status` antes de qualquer alteração; o checkout estava limpo. Nenhum ambiente foi recriado.

A revisão foi implementada e validada localmente. Após aprovação expressa, foi enviada à `main` e publicada com o CLI `cf` em 11/11/2026, versão `eb020c73-4f31-4f65-b2da-9ebccf0ff552`. Não houve alteração de DNS, mudança de Access ou migração D1 remota. Validação do domínio, mídias, atualização do navegador e preservação de recursos em [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md).

## Resultado

| Verificação                                            | Resultado                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`                                         | Passou                                                                                                             |
| `npm run typecheck`                                    | Passou                                                                                                             |
| `npm test`                                             | 10 testes passaram, nenhum ignorado                                                                                |
| `NODE_USE_ENV_PROXY=1 npm run test:e2e -- --workers=2` | 10 testes passaram: 5 cenários em mobile e desktop                                                                 |
| `npm run build`                                        | Passou, Worker + Static Assets + shell offline; sem aviso de chunk acima de 500 kB                                 |
| `node scripts/check-media.mjs`                         | 18 de 18 players externos reproduziram dentro do preview local, sem autenticação                                   |
| Vídeos locais                                          | 9 arquivos MP4 H.264 válidos, 960×540, sem faixa de áudio, aproximadamente 13 MB no total; hashes registrados      |
| Cobertura da ficha                                     | 27 movimentos distintos com vídeo; nenhuma mídia pendente na ficha atual                                           |
| Privacidade                                            | API local anônima retorna 401; página pública abre; JWT/e-mail diferente rejeitados; D1 isolado por identidade     |
| Credenciais                                            | Nenhum token/JWT/chave privada identificado nos arquivos versionáveis; e-mail autorizado ausente do bundle público |
| Dependências                                           | Nenhuma dependência adicionada ou atualizada; configuração `cf` preservada                                         |

## Cenários cobertos

- Cinco dias, com 5/7/5/7/5 exercícios e 17/23/17/23/17 séries. Exercícios mantidos receberam exatamente +1 série; a semana inicial já cria 3 ou 4 séries, conforme a ficha. Core na quarta e sexta, sem movimentos excluídos.
- Ficha histórica com hack e panturrilha no leg press continua abrindo com os nomes originais e duas séries registradas; edição persiste após reload. A API aceita exercícios históricos conhecidos no dia correto e rejeita IDs arbitrários. Nenhum registro antigo é reescrito.
- Duas instâncias independentes de navegador usam o handler real com D1 isolado em Miniflare: criação, sincronização, edições simultâneas, escolha de conflito e propagação de exclusão lógica. A identidade de teste existe apenas no harness; produção exige Access.
- Exportação e importação JSON, erros de validação, tombstones e preservação de versões conflitantes.
- Registro local após reload online/offline, edição offline, fluxo de entrada quando não autenticado e cronômetro iniciar/pausar/reiniciar/adicionar tempo.
- Reprodução real de MP4, pausa ao iniciar outro vídeo, reprodução offline após reload e leitura parcial `Range` retornando 206 com bytes corretos. Não são cacheados `/api/*` nem `/cdn-cgi/*`.
- Players externos só são criados após clique; só um iframe permanece aberto. Testes regulares usam um player simulado para não depender da rede; a execução adicional `check-media.mjs` reproduziu os 18 players oficiais reais.
- Redução de movimento sem autoplay, vídeos mudos com `playsInline`, aviso específico para vídeo externo offline e recuperação/link de fonte em arquivo ausente.
- Viewports 390×844 e 1440×1000, sem overflow horizontal. Fundo computado `rgb(51, 29, 74)` (`#331d4a`), nova paleta e capturas inspecionadas.

## Problemas encontrados e corrigidos

| Evidência                                                                                    | Camada                                         | Correção                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Página sem conteúdo após reload offline; `net::ERR_FAILED` nos JS/CSS                        | Service worker / cache de Static Assets        | Os assets públicos retornam `Vary: Origin`. Requisições de instalação e de módulos diferem nesse cabeçalho. Correspondência ignora `Vary` somente para os arquivos públicos conhecidos, no mesmo domínio. API e histórico seguem excluídos do cache. Os quatro testes que falharam passaram após a correção. |
| Vídeos usam requisições `Range`, incompatíveis com armazenar respostas parciais em Cache API | Service worker / mídia                         | Guardar arquivo completo sob demanda e produzir respostas 206/416 para os intervalos; reprodução offline testada.                                                                                                                                                                                            |
| Chunk principal acima de 500 kB                                                              | Build                                          | Separar React/Motion em chunk próprio, também incluído no cache offline. Entrada ~159 kB, vendor ~354 kB antes de gzip.                                                                                                                                                                                      |
| Players pesquisados com `domain_status_code: 403`                                            | Permissão do provedor de vídeo                 | Fontes restritas foram descartadas. Foram escolhidos outros vídeos com incorporação pública e reprodução confirmada. Nenhuma restrição foi contornada.                                                                                                                                                       |
| `document is not defined` no lint do script de auditoria                                     | Declaração de ambiente de callbacks Playwright | Declarar `document` apenas como global de navegador usado nas callbacks; lint final passou.                                                                                                                                                                                                                  |

## Produção e limites

- Players Vimeo dependem de internet e podem ser alterados/removidos pelo autor. Os 9 vídeos locais ficam disponíveis offline após o primeiro uso. Licenças, permissões e inventário estão em [MEDIA_SOURCES.md](MEDIA_SOURCES.md).
- Os 18 players externos também reproduziram no domínio de produção após o deploy. Os 9 vídeos locais e posters foram conferidos por HTTP/MIME/hash. Reload offline, reprodução local e intervalos HTTP passaram no domínio real.
- Login OTP e sincronização real em dois dispositivos foram confirmados pelo proprietário para a versão anterior. O formulário Access e o bloqueio da API foram verificados novamente após o deploy, sem solicitar código nem acessar registros pessoais. A sincronização autenticada remota não foi repetida nesta publicação.
- Não houve mudança de schema. O deploy reutilizou D1, Access, domínio e variáveis existentes, seguindo [DEPLOY.md](DEPLOY.md).
