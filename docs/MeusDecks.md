# Meus Decks — protótipo local

Inicie com `npm start` e abra `http://127.0.0.1:5500`. Também funciona em um servidor estático como o Live Server. Entre pelo **Login** do cabeçalho ou do menu móvel e use a senha `teamsandwich`.

## Validação manual

1. Sem entrar, abra `my-decks.html`: a área permanece oculta e redireciona para `login.html`.
2. Teste uma senha incorreta: deve aparecer “Senha incorreta”, sem liberar a biblioteca.
3. Entre com `teamsandwich` e clique em **Importar deck**.
4. Selecione um `.txt` contendo `4 Lightning Bolt`. O nome do arquivo aparece como sugestão; você pode alterar o nome e corrigir a lista antes de salvar. Há um exemplo com sideboard em `tests/fixtures/mono-red-burn.txt`.
5. Salve, abra a caixa do deck e altere **Possuídas** para `2` (ou clique duas vezes em `+`). A carta deve ficar vermelha com **2 de 4 · Faltam 2**.
6. Recarregue: o mesmo deck permanece aberto pela identificação na URL, com as duas cópias possuídas. Fechar e reabrir o navegador pode exigir entrar novamente; os decks permanecem salvos.
7. Teste renomear, adicionar uma carta ao principal ou ao sideboard, editar **Exigidas**, completar uma carta e remover uma entrada. Recarregue para confirmar as alterações.

## Armazenamento e acesso

- Os decks, seções e quantidades ficam no `localStorage`, chave **`teamSandwich.myDecks.v1`**, usando o módulo `AppStorage` existente. As imagens usam o catálogo/cache Scryfall existente, com consulta em lotes. Não são necessárias para importar ou editar.
- O acesso fica no `sessionStorage`, chave `teamSandwich.deckAccess.v1`. A senha não é persistida. **Sair** bloqueia a área sem apagar os decks. O antigo usuário de demonstração não libera acesso.
- Este bloqueio é uma conveniência de protótipo no cliente, contornável por quem controla o navegador. Não oferece autenticação de servidor nem proteção de dados sensíveis.
- Os dados pertencem à origem (protocolo, host e porta) e ao perfil do navegador. `localhost` e `127.0.0.1`, ou portas diferentes, têm bibliotecas diferentes. Limpar os dados do site apaga os decks. Não há sincronização entre navegadores ou dispositivos.
- Abas na mesma origem recebem mudanças pelo evento `storage`; em edições simultâneas, prevalece a última gravação. As cópias possuídas são controladas por entrada de cada deck e seção, não como uma coleção global.
- Se o armazenamento estiver cheio ou bloqueado, a interface informa que as alterações ficaram somente na página. Dados salvos inválidos bloqueiam a gravação para evitar sobrescrita.

## Formato de importação

Aceita quantidade inteira de 1 a 1000 seguida do nome, por exemplo `4 Lightning Bolt`, `4x Lightning Bolt`, `2 Island`, exportações com impressão como `4 Lightning Bolt (M11) 146`, cabeçalhos `Deck`/`Mainboard` e `Sideboard`, além de prefixos `SB:`. Entradas repetidas na mesma seção e impressão são somadas. Cópias possuídas começam em zero. Linhas sem quantidade, com quantidade inválida ou acima do limite são enumeradas e impedem salvar até a correção. Limites: 256 KB por arquivo, 1000 entradas por deck e 200 decks. Nomes não encontrados no catálogo continuam editáveis com “Imagem indisponível”.

## Escopo

Esta entrega usa o modo de demonstração em um navegador autorizado no pedido. O servidor Node existente continua servindo arquivos e o proxy de torneios; não recebe nem salva decks. Um modo compartilhado exigirá armazenamento central e validação da senha e das operações no servidor antes da publicação. Importação do metagame fica para uma etapa futura.

Validação automatizada: `npm run check` e `npm test`. Os testes de Meus Decks cobrem bloqueio, senha, importação estrita, sideboard, edição, recarga, indisponibilidade de imagens e falhas de armazenamento.
