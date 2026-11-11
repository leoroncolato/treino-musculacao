# Publicação — Treino Bella

**Publicado em https://treino.leonardoroncolato.com.br em 11/11/2026, às 20h38 de São Paulo (23h38 UTC), após aprovação expressa.**

- Código publicado: [`e918360`](https://github.com/leoroncolato/treino-musculacao/commit/e91836047c1ac7b4fe84137721f183c8023ae57c), enviado à branch `main`. A documentação desta publicação é atualizada em commit posterior, sem mudança no código implantado.
- Versão Cloudflare: `eb020c73-4f31-4f65-b2da-9ebccf0ff552`, recebendo **100% do tráfego**.
- Deployment: `e35f2e23-2dec-4299-b481-fb56b1dc7466`.
- Ferramenta: `cf@1.0.0-beta.28`, configuração existente `cloudflare.config.ts`. Executado `BELLA_DEPLOY_APPROVED=yes npm run deploy`, que faz build live, gera o service worker e executa `cf deploy --mode live --prebuilt`. Nenhuma migração para Wrangler.

## Conteúdo publicado

Ficha com cinco dias, 5/7/5/7/5 exercícios e 17/23/17/23/17 séries. Séries anteriores de 2 passaram a 3, e de 3 a 4; retirada a redução automática das semanas iniciais. Terça e quarta atualizadas conforme a solicitação, incluindo panturrilha cavalinho sentada e puxada pronada pela frente. Core na quarta e sexta.

Nova paleta com fundo `#331d4a`. Vídeo em cada um dos 27 movimentos distintos: 9 MP4 locais sob CC BY-SA 4.0 e 18 players Vimeo com incorporação pública autorizada. Foram enviados 25 assets novos/alterados. Histórico antigo mantém seus movimentos e séries registradas; IDs, exclusões lógicas e conflitos continuam compatíveis.

## Recursos e preservação

| Recurso                 | Resultado                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação Cloudflare | `cf auth whoami`: autenticado, token válido; verificação da API: `active`. Token não exposto.                                                                         |
| Conta e zona            | Conta existente confirmada; zona `leonardoroncolato.com.br` ativa e pertencente à mesma conta.                                                                        |
| Worker `treino-bella`   | Atualizado com Static Assets e SPA. Nenhum Worker adicional criado.                                                                                                   |
| D1 `treino-bella`       | Banco existente reutilizado: `b2e8e182-28a2-480a-aa2c-6b63d201d917`. Binding remoto verificado; nenhum UUID fictício em produção.                                     |
| Migrações               | Nenhuma alteração de schema nesta revisão, nenhuma migração remota aplicada. Registros pessoais de produção não foram consultados nem alterados durante os testes.    |
| Access                  | Aplicativo existente preservado, protege `treino.leonardoroncolato.com.br/api/*`. Raiz e mídias públicas.                                                             |
| Política / OTP          | Única política Allow com correspondência exata do e-mail autorizado; apenas One-time PIN. AUD e team domain reais conferidos antes/depois e nos bindings implantados. |
| Domínios alternativos   | `workers.dev` e URLs de preview continuam desabilitados.                                                                                                              |
| DNS e demais serviços   | Os 7 registros DNS, 2 aplicativos Access, políticas, provedores, Custom Domains e os 3 Workers não relacionados permaneceram idênticos na comparação antes/depois.    |
| Recursos pagos          | Nenhum recurso novo ou upgrade contratado. R2 não foi adicionado.                                                                                                     |
| Credenciais             | Secret administrativo excluído do Git e ausente dos bindings do Worker. Arquivos de ambiente, perfil do navegador e resultados locais não foram versionados.          |

## Testes e resultados

Pré-publicação da revisão aprovada: lint, verificação de tipos, 10 testes de lógica/segurança/D1 e 10 testes de navegador passaram. O build live desta publicação também passou; a entrada do cliente tem aproximadamente 158 kB, mais vendor compartilhado de 354 kB, antes de gzip.

Após a publicação, no domínio real:

- HTTPS HTTP 200, interface nova renderizada e fundo `rgb(51, 29, 74)` confirmado.
- Cinco treinos com 5/7/5/7/5 exercícios; uma sessão nova de terça cria 17 séries na semana 1.
- Navegador preparado antes do deploy com uma sessão local sintética da ficha antiga: após a atualização, manteve os 4 exercícios, as 8 séries e o valor de teste. Nenhum desses registros foi enviado ao D1.
- GET anônimo em `/api/sync/records`, `/api/history` e `/api/sync/login`: HTTP 302 para o domínio Access correto. POST anônimo de sincronização também bloqueado com 302. Nenhum histórico foi retornado.
- Botão de entrada abriu a página real do Access com o formulário de código por e-mail; nenhum código foi solicitado pelo teste.
- Service worker novo `bella-85a171a12384`, `Cache-Control: no-cache`; CSP permite somente o provedor Vimeo para frames.
- Reload offline em produção e reprodução de vídeo local passaram; leitura `Range: bytes=0-99` retornou HTTP 206 com exatamente 100 bytes.
- Todos os 9 MP4 e os 9 posters públicos retornaram HTTP 200. MIME `video/mp4` e SHA-256 de cada vídeo conferem com os arquivos licenciados.
- Os 18 players externos reproduziram dentro do aplicativo publicado, sem autenticação.
- Capturas mobile e desktop conferidas; sem overflow horizontal no desktop da verificação de produção. As duas larguras também passaram nos testes locais.
- API de deployments confirmou a nova versão em 100%; bindings de D1, AUD, domínio Access e autorização conferidos após deploy.

Evidência sem credenciais: [docs/production-verification-2026-11-11.json](docs/production-verification-2026-11-11.json). Testes locais detalhados em [VALIDATION.md](VALIDATION.md); direitos das mídias em [MEDIA_SOURCES.md](MEDIA_SOURCES.md).

## Ocorrências resolvidas

| Erro / evidência                                                                            | Camada                                             | Correção                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fatal: ambiguous argument 'origin/main': unknown revision or path not in the working tree` | Referência Git local                               | O checkout não tinha essa referência de acompanhamento. A busca remota havia concluído; `FETCH_HEAD` confirmou que `main` e a base local eram `f10c99f`. Push realizado normalmente, sem force. |
| `page.evaluate: TypeError: r.status is not a function`                                      | Roteiro temporário de validação, fora da aplicação | Corrigido o uso de `Response.status` nativo como propriedade. A verificação foi repetida e passou; não exigiu alteração do aplicativo nem outro deploy.                                         |
| API parecia HTTP 200 em um probe que seguia redirects                                       | Leitura do resultado do teste                      | O 200 era a página HTML de login do Access após redirecionamento. Verificação com redirects desabilitados confirmou 302 e o domínio Zero Trust esperado.                                        |

Nenhuma falha exigiu reduzir autenticação, CSP, TLS, isolamento do D1 ou política do Access.

## Operação e limites

- Os players Vimeo exigem internet e dependem da disponibilidade dos autores. Os vídeos locais ficam disponíveis offline após o primeiro carregamento.
- Em abas já abertas, fechar e reabrir as abas do Treino Bella permite ativar o novo service worker. Não é necessário apagar os dados do navegador; o teste de atualização preservou os registros locais.
- O proprietário já confirmou login e sincronização em dois dispositivos reais na versão anterior. Nesta publicação foram verificados a política, os bindings, o bloqueio anônimo e a página de login; não foi repetido o login com código nem acessado o histórico privado. A regressão de sincronização, conflitos e exclusões passou com o handler real e D1 local em dois navegadores.
- Para a próxima publicação, reutilizar os recursos e seguir [DEPLOY.md](DEPLOY.md).

A publicação inicial de 10/11/2026 permanece documentada no [relatório histórico](https://github.com/leoroncolato/treino-musculacao/blob/f10c99f955a59f2df337e3de9ec7421ac9500e92/DEPLOYMENT_REPORT.md).
