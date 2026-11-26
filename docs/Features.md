# Funcionalidades

## Contas e biblioteca

Cadastro com e-mail, senha e confirmação; login, renovação de sessão e saída via Supabase Auth no servidor Node. Decks e wishlist persistidos por usuário no Supabase, disponíveis em outros dispositivos, com recuperação explícita das listas antigas, rascunhos e controle de conflitos. Configure também [Listas da conta](ListasDaConta.md). Exige configuração no Render/Supabase: [guia de autenticação](Autenticacao.md).

## Catálogo e navegação

`card.html` inicia automaticamente o catálogo do jogo selecionado, sem botão de carga inicial. Pesquisa por nome e coleção, autocomplete, importação TXT, seleção de lojas, grade/lista, filtros e paginação existentes continuam disponíveis. Ao avançar além das cartas carregadas, a paginação busca o próximo lote automaticamente, sem botão `Load more cards` e sem baixar todo o catálogo antecipadamente. Skeleton e estado `aria-busy` acompanham a primeira consulta; falhas oferecem repetição sem recarregar o documento.

Cards priorizam imagem, nome em até duas linhas com tooltip, preço normal CAD, coleção/número e ações centralizadas. A grade padrão usa colunas de no mínimo 180 px, três colunas em telas intermediárias e duas no breakpoint móvel. Imagens ausentes mantêm um placeholder com a mesma proporção. Os filtros Magic atuam sobre resultados carregados; Pokémon tem categoria própria e não exibe filtros de cores/tipos Magic. Seus preços são enriquecidos apenas na página visível. Ordenações locais consideram os dados recuperados até aquele momento.

Os dois botões do cabeçalho têm estado exclusivo `aria-pressed`. Magic é o padrão; a URL preserva o jogo entre catálogo, detalhes e competitivo. Pokémon foi habilitado após consulta real de busca, detalhes, imagens e correspondência de impressão. Sem adaptador registrado, seu botão fica desabilitado. Falha temporária da fonte é apresentada como erro recuperável.

## Detalhes e preços

O catálogo Pokémon abre por coleções: uma grade pesquisável por nome/código leva a `card.html?game=pokemon&set=...`. Dentro da coleção, o seletor permite trocar de set e combinar a categoria; a consulta remota usa `set.id` para não misturar edições. O título mostra o nome da coleção. Pesquisas globais por nome continuam abrangendo todos os sets, com opção de restringir pelo seletor. Importações de decks não são convertidas em navegação por coleção.

O ID da impressão determina imagem, nome, regras, mana quando aplicável, raridade, coleção, número e legalidade. O painel principal especifica CAD normal e fonte. Datas de atualização de mercado são distintas da data de consulta; atualização ausente é declarada.

Valores foil/etched e os mercados são separados e identificados. USD/EUR são convertidos para estimativas em CAD com a taxa diária do Bank of Canada; TIX permanece uma unidade digital. Uma impressão sem preço normal permanece indisponível, mesmo que existam valores foil ou de outra edição. Não há conversão fixa ou preço estimado apresentado como cotação real. A comparação por edição carrega automaticamente e permite navegar para outra impressão. Galeria e carregamento adicional continuam disponíveis.

A seção “Store availability” fica imediatamente abaixo do painel de preço, inclusive no celular. Cada logo é o link para a pesquisa da carta na loja, sem texto “View price”. O aplicativo não consulta estoque ao vivo. A paleta verde anterior voltou a ser usada em todas as páginas.

Em Pokémon, cartas de mesmo nome podem ter efeitos distintos. A seção as identifica como cartas relacionadas por nome, sem alegar equivalência de reimpressão. Só são mostrados preços com associação explícita de variante/mercado.

## Lands

A opção do menu aparece somente em Magic e abre `card.html?view=lands`. Há 14 categorias: Fetch, Shock, Fast, Original Dual, Check, Pain, Filter, Bond, Horizon, Pathway, Triomes, Surveil, Utility e Creature Lands. O manifesto `Lands.cycles` usa listas curadas de nomes Oracle completos; a consulta usa correspondência exata, e `unique=cards` evita duplicar reimpressões. Nomes oficiais são usados como identificadores naturais do manifesto, com validação ao vivo de cobertura e unicidade de `oracle_id`.

Filtros de identidade de cor e legalidade são enviados à fonte. A identidade selecionada aceita cartas cuja identidade esteja contida nas cores escolhidas. Pesquisa textual e ordenação alfabética/preço usam o conjunto já carregado. Detalhes e comparação de impressões reutilizam o fluxo comum. Utility/Creature são seleções iniciais curadas, não um catálogo exaustivo de todo terreno utilitário existente.

## Torneios e decklists

`competitive.html` consulta TopDeck para Magic (servidor/chave necessários) e Limitless para Pokémon. A interface permite jogo, formato, período, campeonato, jogador e arquétipo. Pesquisas de jogador/arquétipo operam sobre classificações já carregadas, com esse escopo indicado na tela. Campeonatos têm links para a fonte. Resultados podem ser visualizados como Top 8, Top 16 ou todas as colocações disponíveis. Não há pressuposição de lista pública ou resultado completo.

As abas Resultados, Análise e Ferramentas de decks organizam a página sem exibir todos os formulários simultaneamente. As abas aceitam teclado (setas, Home e End) e mantêm os dados carregados ao trocar de painel.

O visualizador de decklists apresenta jogador, arquétipo, campeonato, colocação, formato, origem e data de consulta, texto com quantidades e sideboard, além de imagens quando o catálogo resolve os identificadores. Listas podem ser copiadas e impressas. Listas coladas pelo usuário são identificadas como importações locais e não entram na amostra publicada de torneios.

O parser aceita `4 Card Name`, identificadores Arena `4 Card Name (SET) 123` e, em Pokémon, `4 Card Name SET 123` com cabeçalhos contados de Pokémon/Trainer/Energy. Nomes e códigos não reconhecidos permanecem indisponíveis; não são associados por aproximação a outra impressão.

A estimativa utiliza preços CAD normais disponíveis. O total só é denominado estimativa total quando todas as cópias foram precificadas; caso contrário, aparece subtotal parcial com cobertura `cópias com preço / cópias totais`. Uma edição explicitamente informada não é substituída por outra. Em listas sem impressão, a interface informa o uso de edição representativa. URLs externas são abertas na origem e não convertidas em snapshots históricos fictícios.

## Análise competitiva

É obrigatório escolher um formato. Apenas o jogo ativo participa da análise. A amostra pode ser limitada a campeonato, arquétipo, período, Top 8/16/todas as listas e seção principal/sideboard/ambas. Listas sem dados não entram no denominador; IDs duplicados são removidos. A interface mostra tamanho da amostra, fonte e período e esclarece que isso não representa todo o metagame.

Para cada carta, com `N` listas válidas e `D` listas contendo a carta:

- Frequência = `100 × D / N`.
- Média por deck analisado = `total de cópias / N`, incluindo listas que não a utilizam.
- Média entre decks que a utilizam = `total de cópias / D`, disponível no módulo de análise.
- Presença absoluta = `D`; uma carta conta apenas uma vez por lista, mesmo com várias impressões.
- Core/Staples: frequência `>= core`, padrão 70%.
- Variants/Flex Slots: `flex <= frequência < core`, padrão 10%.
- Uncommon Choices: frequência `< flex`. Validação exige `0 <= flex < core <= 100`.

Rankings incluem barras de frequência e distribuição absoluta por arquétipo. O módulo também preserva contagens por formato e calcula frequências mensais com denominador específico de cada mês. A evolução textual aparece somente quando há pelo menos dois meses na amostra; não existe histórico persistente nem projeção. A comparação de duas listas mostra quantidades e diferenças por carta/seção e recusa jogos/formatos misturados.

Magic combina reimpressões por Oracle ID quando fornecido, ou nome oficial inglês quando o resultado competitivo não fornece esse identificador. Pokémon mantém coleção+número: nomes iguais podem representar regras diferentes. A equivalência funcional de reimpressões Pokémon ainda não foi validada, portanto suas frequências permanecem por identificador de impressão e a limitação está visível. Cartas alternativas de construção não são classificadas como artes/edições de Magic.

## Idiomas e acessibilidade

Inglês é o padrão inicial. O seletor oferece en, pt, es, fr e de; preferência persistida e fallback inglês para chave ausente. Todas as páginas, incluindo login e Meus Decks, restauram essa preferência. A troca atualiza títulos, menus, formulários, mensagens e rótulos de acessibilidade, sincroniza os seletores e outras abas e preserva os campos em edição. `js/locales.js` centraliza novas traduções; `js/i18n.js` mantém as originais. Dados oficiais das cartas continuam em inglês independentemente da interface; não há tradução automática. Campos e botões novos têm rótulos, foco visível, estados desabilitados e status anunciáveis. A revisão visual posterior utilizou a prévia integrada do VS Code; os testes de DOM continuam complementares e não verificam geometria.
