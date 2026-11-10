# Publicação — Treino Bella

Data: 10/11/2026, horário de São Paulo. Publicação concluída por volta de 15h03.

URL: **https://treino.leonardoroncolato.com.br**

Código publicado: `984bf0f` da branch `main`, com instruções/documentação posteriores no mesmo repositório. Versão Cloudflare: `91865454-5d62-4b5f-9659-d64ce284bb53`. CLI: `cf@1.0.0-beta.28`; configuração `cloudflare.config.ts`, sem migração para Wrangler.

## Recursos e alterações

| Recurso                | Ação e resultado                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Conta / zona           | Conta proprietária identificada; zona `leonardoroncolato.com.br` ativa. Plano da zona Free Website, sem upgrade contratado.                      |
| Worker `treino-bella`  | Criado e publicado com Static Assets, SPA e binding `DB` para D1 real.                                                                           |
| Custom Domain          | Criado somente para `treino.leonardoroncolato.com.br`; tráfego público servido por HTTPS.                                                        |
| DNS                    | Cloudflare criou registro gerenciado e proxied do Custom Domain. Os seis registros anteriores permaneceram idênticos. Nameservers não alterados. |
| D1 `treino-bella`      | Banco existente reutilizado (`b2e8e182-28a2-480a-aa2c-6b63d201d917`), sem usar o UUID fictício local.                                            |
| Migração               | `0001_records.sql` aplicada remotamente. Confirmados `records`, índices e registro em `d1_migrations`; nenhuma migração pendente.                |
| Access `treino`        | Aplicativo existente reutilizado, protege exclusivamente `treino.leonardoroncolato.com.br/api/*`. A raiz permanece pública.                      |
| Política               | Política existente reutilizável preservada: Allow apenas para o e-mail autorizado, sem Everyone, Bypass ou Service Auth.                         |
| One-time PIN           | Provedor existente confirmado por API, tipo `onetimepin`, e único provedor permitido pelo aplicativo. Nenhum provedor global foi alterado.       |
| Cookie Access          | `http_only_cookie_attribute` habilitado somente no aplicativo Treino. Outros parâmetros/política mantidos.                                       |
| Endereços alternativos | `workersDev: false` e `previewUrls: false`, confirmados na API após deploy.                                                                      |
| Credenciais            | Token apenas no secret do ambiente e em chamadas à API pelo mecanismo seguro. Não incluído no Worker, nos assets ou no Git.                      |

O outro aplicativo Access e os três Workers existentes foram comparados antes/depois e permaneceram idênticos. Nenhum comando modificou o outro banco D1. Metadados públicos de implantação estão em `.env.example`; `.env.live` é ignorado pelo Git.

## Testes e verificações

- `npm run lint`: passou.
- `npm run typecheck`: passou, inclusive após desabilitar os endereços alternativos.
- `npm test`: 6 testes passaram, sem testes ignorados. Cobrem JWT, e-mail não autorizado, emissor/audiência/expiração, validação, isolamento por usuário, CAS e tombstones.
- `npm run test:e2e`: 4 testes passaram, em mobile e desktop. Incluem persistência/offline, backups, cronômetro, duas instâncias independentes de navegador com handler real e D1 local, conflitos e exclusões.
- Build local e build `--mode live`: passaram. Upload de assets e deploy de triggers concluídos.
- HTTPS público em navegador Chromium: HTTP 200, título `Treino Bella`, interface renderizada e nenhum erro JavaScript capturado.
- E-mail autorizado ausente da interface e do bundle público. Token administrativo ausente dos bindings/arquivos públicos.
- Service worker público: HTTP 200, `Cache-Control: no-cache`.
- Offline em produção: um registro temporário no navegador persistiu após reload sem rede. Contexto de teste descartado; nenhum registro de teste foi enviado ao D1.
- API sem sessão: acesso negado (HTTP 403 no probe); endpoint de login redireciona ao Access (HTTP 302). Nenhum histórico retornado.
- Navegador: link de entrada abre `Sign in · Cloudflare Access`, formulário de e-mail e botão `Send login code` no domínio Zero Trust correto.
- A API do Worker valida JWT/identidade independentemente da proteção na borda; não há rota de bypass para testes em produção.

**Limite:** os testes de sincronização automatizados usam D1 local. A conclusão do login OTP, entrega do código e sincronização autenticada em dois dispositivos reais aguardam a confirmação do proprietário. Não foi inventada uma identidade nem alterada a política para simular sucesso em produção.

## Ocorrências, camada e correção

| Erro exato / evidência                                                       | Camada                                             | Correção / estado                                                                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `APIError: fetch failed` / `Envelope Error` no primeiro uso do cf            | Transporte do CLI neste ambiente                   | `NODE_USE_ENV_PROXY=1` fez o cf respeitar o proxy e a confiança TLS herdados. Consulta e deploy passaram; TLS não foi desativado.     |
| HTTP 403, `[10000] Authentication error` em `/access/organizations`          | Permissões do token Cloudflare                     | Proprietário adicionou permissão de organizações/provedores. Consulta repetida com sucesso.                                           |
| HTTP 403, `[1010]` em `/access/identity_providers/{id}`                      | Permissões do token Cloudflare                     | Resolvido pela mesma ampliação restrita. One-time PIN confirmado por ID e tipo.                                                       |
| HTTP 403, corpo `error code: 1010` no probe com User-Agent padrão do Python  | Proteção de cliente na borda                       | Verificado em navegador Chromium real: HTTP 200. Probe com User-Agent de navegador também passou. Nenhuma regra WAF foi desabilitada. |
| HTTP 400, `[12097] access.api.error.invalid_user_id` em `user_policy_checks` | API de teste de política exige contexto de usuário | Um token administrativo não substitui identidade Access. Teste autenticado solicitado ao proprietário; não se reduziu a segurança.    |

## Pendências e operação

1. Proprietário concluir OTP e conferir sincronização nos dois dispositivos pela interface. Não enviar código ou token pelo chat. Resultado será incorporado quando confirmado.
2. Mídias demonstrativas continuam como placeholders, sem distribuição de arquivos externos não verificados. Pesquisa e pendências em `MEDIA_SOURCES.md`.
3. Para futuras publicações, carregar `.env.live` e seguir `DEPLOY.md`, usando somente o escopo autorizado. O token deve manter acesso apenas à conta/zona necessárias. Não criar recursos nem alterar DNS de outros projetos.
