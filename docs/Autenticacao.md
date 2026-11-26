# Cadastro e login — Render + Supabase Auth

O login compartilhado foi substituído por contas reais de e-mail e senha. O Supabase guarda os usuários e verifica as senhas; o servidor Node no Render faz as chamadas de autenticação. Não é necessário instalar dependências, criar tabelas SQL, usar Docker ou contratar uma VM.

O código está pronto para configurar. Nenhum projeto, conta de provedor ou serviço de e-mail foi criado e nenhuma credencial real foi utilizada nesta implementação.

## 1. Configurar o Supabase

1. Crie ou use um projeto **Free** no [Supabase](https://supabase.com/dashboard).
2. No diálogo **Connect** ou nas configurações de API, copie **Project URL** e **Publishable key** (`sb_publishable_...`). A chave legada `anon` também é aceita, mas prefira a publishable. Não use `service_role`, `sb_secret_...` nem a senha do banco. [Documentação das chaves](https://supabase.com/docs/guides/getting-started/api-keys).
3. Em **Authentication → Sign In / Providers → Email**, habilite cadastro com e-mail e senha. Mantenha **Confirm email** habilitado e defina senha mínima de 8 caracteres. O aplicativo aceita até 128 caracteres.
4. Em **Authentication → URL Configuration**, configure **Site URL** como `https://SEU-SERVICO.onrender.com` e adicione `https://SEU-SERVICO.onrender.com/login.html` à lista de redirecionamentos permitidos. Substitua pelo domínio real; não use curingas em produção.
5. Para desenvolvimento, adicione também `http://127.0.0.1:5500/login.html` aos redirecionamentos permitidos.

## 2. Confirmação de e-mail

O SMTP padrão do Supabase só entrega para endereços da equipe do projeto e está limitado atualmente a **2 mensagens por hora**. Serve para testar com a equipe; não libera cadastros públicos com confirmação. Configure um SMTP próprio em **Authentication → Email / SMTP Settings** antes de abrir o cadastro ao público. Preserve o link padrão de confirmação `{{ .ConfirmationURL }}` no modelo de e-mail. [Restrições e configuração oficiais](https://supabase.com/docs/guides/auth/auth-smtp).

Uma alternativa com plano gratuito é o Brevo, que informa **300 envios por dia**, compartilhados entre mensagens transacionais e campanhas. A ativação do envio e a verificação/autenticação do remetente seguem as regras do provedor; não foi criada conta nem validado remetente. Copie host, porta, usuário SMTP e chave SMTP do painel do provedor para o Supabase, não para o código nem para o Render. [Limites oficiais do Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [integração SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

Após confirmar pelo link, o aplicativo pede e-mail e senha para entrar. Tokens que chegarem no fragmento da URL são descartados e removidos do histórico; não são usados para estabelecer uma sessão.

## 3. Variáveis no Render

Em **seu Web Service → Environment**, adicione:

| Variável | Valor |
| --- | --- |
| `SUPABASE_URL` | Project URL, como `https://PROJETO.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key do mesmo projeto |
| `APP_ORIGIN` | Origem pública exata, como `https://SEU-SERVICO.onrender.com`, sem caminho |
| `HOST` | `0.0.0.0` |
| `PORT` | Mantenha o valor fornecido pelo Render |

Mantenha `TOPDECK_API_KEY` se já estiver configurada; ela é independente das contas. Não é necessário configurar credenciais PostgreSQL nem SMTP no Render.

Publique os arquivos alterados no repositório conectado e faça **Manual Deploy → Deploy latest commit** se o deploy automático estiver desativado. O comando de inicialização continua `npm start`; o build existente pode continuar `npm ci --omit=dev`. A URL usada para acessar o site deve corresponder a `APP_ORIGIN`; outro domínio/origem será recusado nas operações de login, cadastro e saída.

## 4. Executar localmente

Se ainda não existir, copie `.env.example` para `.env` e preencha as duas variáveis do Supabase. Não sobrescreva um `.env` existente. Use `APP_ORIGIN=http://127.0.0.1:5500`, inicie com `npm start` e abra exatamente essa origem. Reinicie após mudar variáveis. `.env` permanece ignorado pelo Git.

Live Server sozinho não implementa as rotas `/api/auth/*`. Sem o Node ou sem as variáveis, o catálogo público pode funcionar, mas o login informa indisponibilidade/configuração pendente e não libera a biblioteca.

## 5. Conferência depois da publicação

1. Abra **Login → Cadastre-se**, informe e-mail e uma senha própria e confirme a senha.
2. Confira a mensagem de confirmação e o usuário em **Authentication → Users** no Supabase.
3. Confirme o e-mail, volte ao site e entre. A biblioteca deve mostrar seu endereço de e-mail.
4. Importe um deck, ajuste quantidades, recarregue e confira os dados.
5. Saia. A URL direta `my-decks.html` deve pedir login. Entre com outra conta: a biblioteca anterior não deve aparecer.
6. Havendo listas da versão anterior no mesmo navegador/origem, a primeira abertura de uma biblioteca nova oferece **Recuperar decks anteriores deste navegador**. A cópia exige confirmação e preserva os dados originais. Não importe listas de outra pessoa em uma máquina compartilhada.

## Sessões, dados e limites

- A sessão é validada em `/auth/v1/user` no Supabase. Tokens ficam em cookies `HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS, sem `localStorage` ou `sessionStorage`. A renovação usa o refresh token e atualiza os cookies; a saída revoga a sessão atual no provedor. A API não registra senhas nem devolve tokens ao JavaScript.
- Operações de escrita exigem origem configurada. Login/cadastro validam entradas e têm limitação em memória de 10 tentativas por endereço de e-mail e 100 por IP de conexão em 10 minutos, além dos limites do Supabase. O servidor não confia em `X-Forwarded-For` arbitrário. No Render, conexões de proxy podem compartilhar esse limite; réplicas e reinícios não compartilham os contadores. Para tráfego maior, será preciso rever essa proteção.
- **Contas** são persistidas no Supabase e funcionam em outros dispositivos. **Decks** continuam locais, em `teamSandwich.myDecks.v1:<id-do-usuario>`. Não há sincronização ou backup de decks na nuvem. Limpar os dados do navegador apaga as listas; mantenha os arquivos TXT originais. A separação por conta é de interface/armazenamento local, não criptografia contra alguém com acesso ao perfil do navegador ou às ferramentas de desenvolvimento.
- Inicializar/revalidar o acesso requer rede. Falhas do serviço bloqueiam a interface; cookies não são apagados por indisponibilidade temporária. A conta é revalidada ao retornar à aba e periodicamente enquanto a página está visível.
- Recuperação automática de senha, login social, edição/exclusão de conta e sincronização de decks não fazem parte desta entrega. Não habilite MFA obrigatório para esses usuários sem implementar o fluxo correspondente.
- O [plano Free do Supabase](https://supabase.com/pricing) informa 50 mil usuários ativos mensais, banco de 500 MB, 2 projetos ativos e pausa após uma semana de inatividade. É um plano gratuito, não um período de teste. O uso precisa respeitar também limites de e-mail e API. Estimativa para Auth: **US$ 0/mês dentro dessas cotas**, mais o Render e SMTP nos respectivos planos gratuitos; domínio próprio e excessos não estão incluídos.

## Validação da implementação

Execute `npm run check` e `npm test`. Os testes cobrem contratos do Supabase com respostas simuladas, cookies, renovação, saída, CSRF, limites de entrada/tentativas, ausência de configuração, cadastro, tradução e preservação/separação dos decks. Eles não criam usuários reais, não comprovam entrega de e-mail e não substituem a conferência acima com um projeto configurado.

Documentação oficial consultada em 26/11/2026: [autenticação por senha](https://supabase.com/docs/guides/auth/passwords), [endpoints Auth](https://supabase.github.io/auth/), [sessões](https://supabase.com/docs/guides/auth/sessions).
