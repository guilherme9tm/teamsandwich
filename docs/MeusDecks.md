# Meus Decks — biblioteca da conta

Configure o Supabase Auth conforme o [guia de autenticação](Autenticacao.md), inicie com `npm start` e abra `http://127.0.0.1:5500`. Aplique também o SQL de [Listas da conta](ListasDaConta.md). Cadastre sua conta e entre com e-mail e senha. Live Server sozinho não oferece autenticação.

## Validação manual

1. Sem entrar, abra `my-decks.html`: a área permanece oculta e redireciona para `login.html`.
2. Teste uma senha incorreta: deve aparecer “E-mail ou senha incorretos”, sem liberar a biblioteca.
3. Entre com sua conta e clique em **Importar deck**.
4. Selecione um `.txt` contendo `4 Lightning Bolt`. O nome do arquivo aparece como sugestão; você pode alterar o nome e corrigir a lista antes de salvar. Há um exemplo com sideboard em `tests/fixtures/mono-red-burn.txt`.
5. Salve, abra a caixa do deck e altere **Possuídas** para `2` (ou clique duas vezes em `+`). A carta deve ficar vermelha com **2 de 4 · Faltam 2**.
6. Recarregue: o mesmo deck permanece aberto pela identificação na URL, com as duas cópias possuídas. Fechar e reabrir o navegador pode exigir entrar novamente; os decks permanecem salvos.
7. Teste renomear, adicionar uma carta ao principal ou ao sideboard, editar **Exigidas**, completar uma carta e remover uma entrada. Recarregue para confirmar as alterações.
8. Para retirar uma lista inteira, abra sua caixa e clique em **Excluir decklist**. A confirmação mostra o nome da lista. Cancelar mantém os dados; confirmar remove o deck e suas cartas deste navegador, inclusive após recarregar e em outros dispositivos, depois de confirmado o salvamento.

## Armazenamento e acesso

- Decks, seções e quantidades ficam no Supabase, vinculados ao usuário, e são carregados ao abrir a página. Imagens usam os catálogos Scryfall/TCGdex; não são copiadas para o banco. O navegador mantém rascunhos de gravações pendentes e cópias locais.
- O acesso depende de sessão real validada pelo Supabase, com tokens em cookies HttpOnly. **Sair** revoga a sessão atual e bloqueia a área sem apagar os decks. A antiga chave de demonstração não libera acesso.
- O banco protege as listas com RLS por usuário. Caches e rascunhos locais não são criptografados contra alguém com acesso ao perfil do navegador. Listas antigas só são copiadas após confirmação, preservando a origem.
- As listas confirmadas na nuvem ficam disponíveis em outros dispositivos com a mesma conta. Limpar o navegador pode apagar rascunhos ainda não sincronizados, mas não apaga o que já foi confirmado pelo servidor.
- Cada lista usa uma revisão. Alterações concorrentes geram um aviso de conflito; o rascunho é preservado. Não há mesclagem automática.
- Falhas de rede deixam o salvamento pendente e permitem tentar novamente. Se o armazenamento local estiver bloqueado, mantenha a página aberta até a confirmação do servidor. Dados inválidos não são tratados como uma biblioteca vazia.

## Formato de importação

### Magic e Pokémon

Na janela de importação, selecione **Magic: The Gathering** ou **Pokémon TCG** antes de salvar. O jogo fica associado ao deck e é preservado ao recarregar. Decks antigos sem esse campo continuam sendo Magic. O filtro de jogo da biblioteca não apaga nem altera as listas.

Para Pokémon, use nomes de cartas em inglês, conforme o catálogo integrado. Exemplo de formato (não é um deck completo de competição):

```text
Pokémon: 1
4 Tangela TWM 1
Trainer: 0
Energy: 0
Total Cards: 4
```

Os cabeçalhos com contagem do Pokémon TCG Live, inclusive `Treinador`, `Energia` e `Total de cartas`, são aceitos. A coleção e o número são preservados; a fonte confirma também o nome antes de associar a imagem. Cartas sem impressão informada são pesquisadas por nome. O formulário de adição manual também aceita `Tangela TWM 1`. Não há validação de formato competitivo ou da legalidade do deck.

As capas da biblioteca usam a primeira carta do principal (ou a primeira entrada disponível). As imagens de Magic vêm da Scryfall e as de Pokémon do TCGdex. Consultas iguais compartilham o carregamento; o cache de imagens separa jogo, nome, coleção e número. Imagens ausentes ou falhas de rede mantêm uma mensagem de indisponibilidade, sem trocar por uma carta diferente. Falhas nas imagens não impedem editar. Inicializar e revalidar a conta exige rede. O login e a biblioteca vazia exibem Sol Ring e Pikachu; a página inicial consulta cartas reais do jogo ativo.

Aceita quantidade inteira de 1 a 1000 seguida do nome, por exemplo `4 Lightning Bolt`, `4x Lightning Bolt`, `2 Island`, exportações com impressão como `4 Lightning Bolt (M11) 146`, cabeçalhos `Deck`/`Mainboard` e `Sideboard`, além de prefixos `SB:`. Entradas repetidas na mesma seção e impressão são somadas. Cópias possuídas começam em zero. Linhas sem quantidade, com quantidade inválida ou acima do limite são enumeradas e impedem salvar até a correção. Limites: 256 KB por arquivo, 1000 entradas por deck e 200 decks. Nomes não encontrados no catálogo continuam editáveis com “Imagem indisponível”.

## Escopo

Esta entrega usa autenticação real gerenciada. O servidor Node intermedia autenticação e persistência das listas no Supabase, além do proxy de torneios. A wishlist aceita cartas pelo catálogo e pelos detalhes, com quantidades desejadas e identificação da impressão. Importação do metagame fica para uma etapa futura.

Validação automatizada: `npm run check` e `npm test`. Os testes de Meus Decks cobrem sessão real por contrato, separação por usuário, importação estrita, sideboard, edição, recarga, indisponibilidade de imagens e falhas de armazenamento.
