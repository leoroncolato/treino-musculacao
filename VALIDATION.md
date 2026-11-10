# Validação local — 2026-11-10

Ambiente: Node 24.22.1, npm 11.9.0, Chromium local, `cf` beta com Vite Plugin, Miniflare/workerd. Nenhuma chamada de provisionamento ou publicação remota.

| Verificação         | Resultado                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run lint`      | Passou                                                                                                        |
| `npm run typecheck` | Passou, incluindo Worker e configurações                                                                      |
| `npm test`          | 6 testes passaram; nenhum desabilitado ou esperado-falhar                                                     |
| `npm run build`     | Passou; Worker + Static Assets + shell offline gerados                                                        |
| `npm run test:e2e`  | 4 testes passaram: dois cenários em mobile e desktop                                                          |
| Migração D1 local   | Aplicada; repetição não reaplicou migração                                                                    |
| Segredos            | Nenhum padrão de chave privada/token encontrado no código; arquivos de credenciais e saída ignorados pelo Git |
| Bundle público      | E-mail autorizado ausente dos assets públicos                                                                 |

## O que os testes exercitam

- JWT assinado RS256 com chave de teste: identidade correta aceita; outro e-mail, diferença de caixa, audiência errada, emissor errado, expiração e token forjado rejeitados. Header de e-mail isolado não autentica.
- API anônima retorna 401 antes de tocar D1; raiz continua pública. Isolamento por `user_id`, rejeição de origem estranha e exercício inválido.
- D1 real simulado pelo workerd/Miniflare: criação, leitura por outro cliente, atualização atômica por versão, conflito, repetição e exclusão lógica.
- Duas instâncias independentes de navegador: registro em A, leitura em B, edições simultâneas, revisão explícita, convergência após sincronizar e propagação da exclusão. As rotas de teste chamam o handler real com D1 isolado e identidade fornecida **somente no harness de teste**; o Worker de produção sempre valida Access.
- Navegador a 390×844 e 1440×1000: ficha pública, armazenamento após reload, exportação/importação JSON, funcionamento offline após instalar service worker, edição offline persistida, fluxo de login necessário, timer iniciar/pausar/reiniciar/adicionar tempo, placeholder e exclusão confirmada. Sem erros JavaScript capturados e sem overflow horizontal da página. Screenshots inspecionados em `test-results/` (ignorado pelo Git).
- Esquema de backup e registros rejeita dados inválidos, preserva divergências; programa mantém os cinco dias e exclui movimentos proibidos.

## Correções durante validação

Corrigida a releitura de localStorage com metadados de sincronização, que inicialmente falhava no esquema estrito após reload. Ajustados schema/configuração para o CLI `cf` e Miniflare 5 atuais, diretórios graváveis e caminho real do build. Uma execução de testes sofreu timeout de inicialização durante carga temporária do ambiente; a execução final passou, com timeout de setup de 30s, sem remover as verificações.

O simulador emite aviso ao buscar metadados opcionais `Request.cf` em `workers.cloudflare.com` e usa fallback. A aplicação não utiliza esses metadados; o aviso não comprometeu os testes. Não se desativou TLS ou validação de assinaturas para contornar o aviso.

## Ainda não validado em produção

- Login OTP real e entrega do código ao e-mail autorizado.
- Política Access real bloqueando outro e-mail na borda.
- D1 remoto, sessão em dois dispositivos físicos e expiração/logout reais do Access.
- DNS, Custom Domain e certificado HTTPS.
- Demonstrações licenciadas: placeholders em todos os exercícios; revisão de direitos e técnica pendente em `MEDIA_SOURCES.md`.

Esses itens exigem configuração da conta e, para publicação/recursos/DNS, autorização expressa. Chaves RSA de teste e identidade do harness não substituem essas verificações. O checklist completo está em `DEPLOY.md`.
