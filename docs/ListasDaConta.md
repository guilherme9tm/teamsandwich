# Decks e wishlist por conta

Decks e lista de desejos passam a ser guardados no PostgreSQL do mesmo projeto Supabase usado pelo login. O navegador fala com o Node no Render; o Node valida a sessão e usa o JWT daquele usuário na Data API do Supabase. A publishable key continua a mesma. Não são necessários outro banco, uma chave administrativa, novas dependências ou um serviço pago.

## Ativar no Supabase e no Render

1. No projeto Supabase usado pelo login, abra **SQL Editor → New query**.
2. Copie todo o conteúdo de `supabase/migrations/20261126_account_libraries.sql`, cole no editor e clique em **Run**. O script cria a tabela, as políticas de acesso e a função de salvamento. Não execute apenas a criação da tabela: as políticas e a função também são necessárias.
3. Confirme em **Table Editor** a presença de `user_libraries`, com RLS habilitado. **Não desative RLS**. Não é preciso preencher linhas manualmente: elas são criadas ao salvar uma lista.
4. Mantenha habilitada a **Data API** do Supabase com o schema `public` exposto. Nenhuma configuração nova é necessária se já estiver usando os padrões do projeto.
5. Envie as alterações ao GitHub e publique o commit no Render. As variáveis continuam `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `APP_ORIGIN=https://teamsandwich.onrender.com`.
6. Entre no site. Em **Meus Decks**, importe ou edite uma lista e espere aparecer **Salvo na sua conta**.
7. No catálogo ou nos detalhes de uma carta, clique em **☆ Desejo esta carta**. Abra **Lista de desejos** para alterar as cópias desejadas, filtrar por jogo ou remover cartas. A impressão e o jogo são preservados; clicar novamente na mesma impressão não duplica a entrada. Os detalhes continuam oferecendo os links de lojas canadenses.
8. Entre com a mesma conta em outro navegador/dispositivo e confira as listas. Depois teste outra conta: ela deve ver somente os próprios dados.

Até executar o SQL, as páginas de listas mostram que o armazenamento da conta precisa de configuração; nenhum sucesso de salvamento é simulado. Esta implementação não executou alterações no seu projeto Supabase nem publicou no Render.

## Dados anteriores

As listas locais da versão anterior não são enviadas automaticamente. Se a biblioteca da conta na nuvem ainda for nova e vazia, **Recuperar decks anteriores deste navegador** oferece uma cópia após confirmação. A biblioteca local vinculada ao usuário tem prioridade; se ela não existir, é oferecida a antiga biblioteca compartilhada. A origem é preservada. Em uma máquina compartilhada, confirme apenas listas que pertencem a você.

Uma biblioteca existente na nuvem nunca é substituída automaticamente pela cópia local. Para unir uma lista antiga a uma biblioteca já usada, importe o TXT original.

## Salvamento e conflitos

- O estado exibido distingue salvamento em andamento, confirmação pelo servidor e falha. Espere **Salvo na sua conta** antes de fechar a página.
- Se a rede falhar durante uma gravação, um rascunho fica no navegador, vinculado ao usuário e ao tipo da lista. A aplicação tenta novamente quando a conexão retorna; uma nova edição também pode iniciar outra tentativa. Se o armazenamento local estiver bloqueado, mantenha a página aberta até a confirmação da nuvem.
- Cada lista tem uma revisão. Duas abas/dispositivos que partirem da mesma revisão não podem sobrescrever silenciosamente uma à outra. Um conflito preserva o rascunho e interrompe novas gravações daquela cópia.
- Ao abrir novamente, um rascunho só é reenviado automaticamente se a revisão da nuvem continuar igual. Se ela mudou, a aplicação informa conflito. Uma resposta perdida após uma gravação pode gerar esse conflito conservador; a versão já salva não é apagada.
- As listas são carregadas ao abrir a página. O salvamento é automático; a seção de sincronização e os controles de recarga, download e restauração de backup foram removidos. Não há atualização em tempo real nem mesclagem automática entre dispositivos.

## Segurança e limites

Uma única tabela possui até duas linhas por usuário: `decks` e `wishlist`. Cada linha guarda a lista em JSONB e uma revisão; isso preserva o formato atual dos decks sem introduzir várias tabelas de cartas ou copiar os catálogos externos. O banco aplica RLS com `auth.uid() = user_id` em leitura, inserção e atualização. A função de gravação é `SECURITY INVOKER` e usa o usuário do JWT. A aplicação não usa `service_role` nem `sb_secret_`.

O servidor deriva a identidade da sessão e rejeita uma operação se a conta mudou desde que a página foi carregada. Não aceita `user_id` no corpo de salvamento. Limites: até 200 decks, 1.000 entradas por deck, 1.000 entradas na wishlist e 1 a 1.000 cópias por entrada. Há também limite de aproximadamente 4 MB por lista; ele pode ser alcançado antes dos limites de quantidade. As imagens continuam nas fontes Scryfall/TCGdex, sem ocupar o banco com arquivos.

O plano Free atual do Supabase inclui banco de 500 MB, compartilhado com as contas e demais dados do projeto. Esta estrutura começa com **US$ 0/mês dentro das cotas gratuitas**, mas não equivale a espaço ilimitado. Não há um serviço de backup automático contratado nem controles de exportação/restauração na interface. Mantenha os arquivos TXT originais em outro local. A exclusão de um usuário no Supabase remove as linhas associadas por chave estrangeira.

Quem controla o perfil do navegador pode acessar rascunhos, caches e cópias locais. Eles não são criptografados. A proteção de acesso entre usuários no servidor e no banco depende das políticas RLS; a divisão das chaves locais não substitui essas políticas.

## Validação

`npm run check` e `npm test` verificam sessão, propriedade, banco por contrato, persistência em um navegador novo, contas distintas, erros, filas de salvamento, conflitos, rascunhos, migração local e wishlist Magic/Pokémon. As chamadas externas são simuladas: esses testes não comprovam a aplicação real das políticas no seu banco.

Há um teste SQL opcional em `supabase/tests/account_libraries.sql`. Execute-o **somente em um projeto de testes**, depois da migração. Ele troca os papéis para `authenticated`/`anon`, testa isolamento e revisão e desfaz tudo com `ROLLBACK`. O teste SQL não foi executado nesta máquina porque não havia PostgreSQL disponível nem o Docker em execução. A validação com o projeto Supabase configurado continua necessária.

Fontes oficiais consultadas em 26/11/2026: [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [chaves e JWT](https://supabase.com/docs/guides/getting-started/api-keys), [RPC do PostgREST](https://docs.postgrest.org/en/stable/references/api/functions.html), [erros e conflitos](https://docs.postgrest.org/en/stable/references/errors.html), [plano Free](https://supabase.com/pricing).
