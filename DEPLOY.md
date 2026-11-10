# Publicação — somente após autorização expressa

Destino: `https://treino.leonardoroncolato.com.br`. Nenhum recurso remoto foi criado, nenhum DNS foi alterado e nenhum deploy foi executado nesta entrega.

## Ferramentas e ambientes

Projeto criado com `cf init . --no-install`, `cf@1.0.0-beta.28`. Usa `cloudflare.config.ts` e Cloudflare Vite Plugin beta. Não usa configuração nem comandos Wrangler. Instale por `npm ci` para reproduzir as versões do lockfile. Node 24.22+ na linha 24.

- Desenvolvimento/build padrão: Worker `treino-bella-local`, banco fictício local com ID `11111111-1111-4111-8111-111111111111`. Esse ID jamais deve ser usado em produção.
- `--mode live`: Worker `treino-bella`, ID real de D1, Access real e Custom Domain; falha se os parâmetros não existirem.
- `npm run build`: build local de produção e shell offline em `.cloudflare/output/v0/workers/default/assets/`.
- `npm run deploy`: exige `BELLA_DEPLOY_APPROVED=yes`, faz build live, gera service worker e usa `cf deploy --mode live --prebuilt` para preservar o shell gerado. Esse flag é uma barreira operacional, não substitui aprovação humana.

## Pré-requisitos da conta

Team domain informado pelo proprietário: `withered-heart-8f5a.cloudflareaccess.com`, já configurado como padrão de produção. O AUD da aplicação Access e o ID do D1 ainda precisam ser obtidos na conta. A publicação foi autorizada em 2026-11-10; a autenticação administrativa continua necessária.

1. Confirmar acesso autorizado à conta Cloudflare e à zona `leonardoroncolato.com.br`. Autenticar via `npx cf auth login` no ambiente de publicação. Não versionar credenciais; um token de CI, se necessário, fica no gerenciador de secrets.
2. Após autorização para provisionamento, criar um banco D1 chamado `treino-bella` pela interface Cloudflare. Conferir limites/custos antes de criar. Copiar apenas o identificador do banco.
3. Ativar o login **One-time PIN** no Zero Trust → Settings/Authentication → Login methods.
4. Criar aplicação Access **Self-hosted**, com domínio `treino.leonardoroncolato.com.br` e caminho `/api/*`. Isso inclui `/api/sync/*`, login e qualquer endpoint futuro de histórico. A raiz `/` e os assets permanecem públicos. Não adicionar aplicação abrangendo todo o domínio.
5. Adicionar a política Allow de `config/access-policy.json`: **Emails → correspondência exata** com o e-mail especificado. Não usar Everyone, domínio de e-mail, Bypass nem Service Auth como atalhos. A ausência de outras políticas permite negar os demais usuários. Habilitar somente One-time PIN; duração sugerida 24h. Não retornar e-mail em páginas públicas.
6. Anotar o team domain (`nome.cloudflareaccess.com`, sem `https://`) e o AUD da aplicação. O Worker valida JWT RS256 contra `/cdn-cgi/access/certs`, issuer, audience, expiração, tipo app, sub e o e-mail exato. Headers de e-mail e dados do navegador não autenticam ninguém.
7. Fornecer no terminal de publicação, sem commitar `.env`, as variáveis não secretas `BELLA_D1_ID`, `BELLA_ACCESS_TEAM`, `BELLA_ACCESS_AUD`. O e-mail autorizado é configuração exclusiva do Worker. Não há senha nem token de usuário no bundle React.

## Migração e deploy autorizado

```sh
npm ci
npm run lint
npm run typecheck
npm test
# Variáveis BELLA_* fornecidas de forma segura pelo ambiente de publicação.
# Execute apenas após a autorização de criação/configuração/publicação.
npx cf d1 migrations apply "$BELLA_D1_ID" --dir migrations
BELLA_DEPLOY_APPROVED=yes npm run deploy
```

A migração remota acima não usa `--local`; não confunda com `npm run db:local`. Migrações já aplicadas são registradas em `d1_migrations`. Faça backup do D1 antes de futuras mudanças destrutivas. Não limpe tombstones automaticamente: dispositivos offline antigos precisam recebê-los.

## Checklist DNS / HTTPS

- [ ] Zona ativa na conta correta; nameservers confirmados, sem alterá-los nesta tarefa.
- [ ] Inspecionar registros existentes de `treino`; preservar serviços preexistentes e resolver conflitos somente com aprovação.
- [ ] Política Access pronta antes de disponibilizar o hostname.
- [ ] Custom Domain configurado pelo deploy live, sujeito à autorização de DNS. Cloudflare gerencia o registro e o certificado HTTPS.
- [ ] Conferir certificado válido, HTTPS e regras de cache: nunca cachear `/api/*` nem `/cdn-cgi/*` por regra externa. O Worker envia `Cache-Control: no-store, private`.
- [ ] Desabilitar workers.dev e URLs de preview na interface do Worker caso não sejam necessários. Mesmo nesses aliases, a API exige JWT válido e a identidade exata.
- [ ] Conferir raiz pública e `/api/sync/records` bloqueado em janela anônima.
- [ ] Receber código pelo e-mail autorizado e testar retorno de `/api/sync/login` à raiz.
- [ ] Tentar outro e-mail e confirmar bloqueio no Access e no Worker.
- [ ] Dois dispositivos físicos: editar, sincronizar, provocar conflito, escolher versão, excluir e confirmar propagação.
- [ ] Testar logout, expiração do token e ausência de dados privados em caches/CDN.

**Esses testes em produção não foram executados.** As validações locais usam chaves RSA de teste e D1 simulado; não comprovam entrega de e-mail, configuração da conta, DNS ou certificado do domínio.
