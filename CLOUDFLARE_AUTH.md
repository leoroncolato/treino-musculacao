# Autenticação para publicar o Treino Bella

O código já está no GitHub. Publicar foi autorizado pelo proprietário em 2026-11-10. O acesso administrativo por token foi validado e o projeto foi publicado. Este guia documenta como reproduzir ou renovar o acesso. O domínio Zero Trust autentica os usuários da aplicação, não autoriza o CLI a publicar Workers.

## Fornecer acesso sem enviar credenciais no chat

1. Abra [Cloudflare → API Tokens](https://dash.cloudflare.com/profile/api-tokens) na sua conta e crie um token personalizado. Restrinja-o à conta do projeto e à zona `leonardoroncolato.com.br`. Pode usar expiração curta para esta publicação.
2. Permissões necessárias para a configuração completa:

   | Escopo  | Permissão                                                    |
   | ------- | ------------------------------------------------------------ |
   | Account | Workers Scripts — Edit                                       |
   | Account | D1 — Edit                                                    |
   | Account | Access: Apps and Policies — Edit                             |
   | Account | Access: Organizations, Identity Providers, and Groups — Read |
   | Account | Account Settings — Read                                      |
   | Zone    | Workers Routes — Edit                                        |
   | Zone    | DNS — Edit                                                   |
   | Zone    | Zone — Read                                                  |

   Não é necessário fornecer a Global API Key nem a senha da conta. Não habilite permissões de cobrança. O Access/OTP já informado será inspecionado antes de qualquer alteração; se faltar alguma permissão específica, será identificada pela operação que falhar.

3. Nas **configurações deste ambiente Codex**, preencha o secret já declarado `CLOUDFLARE_API_TOKEN` com o valor do token. Use o token somente em chamadas administrativas para `api.cloudflare.com`, nunca no site ou na tela de login. Não cole o valor no chat, no código nem no GitHub.
4. Salve o rascunho do ambiente incluindo as liberações de rede propostas: `api.cloudflare.com`, `withered-heart-8f5a.cloudflareaccess.com` e `treino.leonardoroncolato.com.br`. O produto pode solicitar publicação da configuração do ambiente para uso em tarefas futuras; isso não publica o site.
5. Avise no chat apenas que o acesso foi configurado. A continuação poderá verificar a credencial, localizar a conta/zona/aplicação Access, obter o AUD, preparar D1, aplicar a migração e publicar o Worker no domínio autorizado.

O token será utilizado pelo mecanismo seguro do ambiente para chamadas à API. Não será incluído nos arquivos do projeto. O registro do secret no rascunho **não fornece seu valor** nem confirma acesso: a API será testada após salvar as configurações.

## Identificadores conhecidos

- Projeto GitHub: `leoroncolato/treino-musculacao`, branch `main`.
- Domínio público: `treino.leonardoroncolato.com.br`.
- Team domain Access: `withered-heart-8f5a.cloudflareaccess.com` (já no código).
- E-mail autorizado: configurado somente no Worker/política Access; não é credencial de deploy.
- ID real do banco D1 e AUD: confirmados e registrados em `.env.example`. Não usar o UUID de desenvolvimento em produção.

Apenas criar o nome do time Zero Trust não garante que exista uma aplicação protegendo `/api/*`. A política exata e One-time PIN precisam ser conferidos durante a publicação. A ficha deve continuar pública.
