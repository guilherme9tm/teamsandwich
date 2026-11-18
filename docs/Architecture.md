# Arquitetura

Atualizado em 18/11/2026. Este documento descreve o código implementado neste repositório.

## Diagnóstico e stack

O projeto original é uma aplicação multipágina em HTML5, CSS e JavaScript clássico, sem React, bundler, banco de dados ou backend. Sidebar, pesquisa, lojas, importação TXT, paginação e galeria foram preservadas. Na revisão visual posterior solicitada pelo usuário, a interface passou a usar azul profundo, dourado e tipografia Segoe UI/Bahnschrift. Não foram fornecidas capturas junto ao pedido inicial; a revisão posterior utilizou a prévia real integrada do VS Code.

A aplicação continua executável em hospedagem estática. `server.js` acrescenta um servidor Node opcional, sem dependências de produção, para servir os mesmos arquivos e consultar TopDeck com credenciais privadas. O único pacote instalado, `jsdom`, é uma dependência de desenvolvimento para testes de integração do DOM. Não há migrações porque não existe banco.

## Estrutura e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html`, `js/script.js` | Entrada, pesquisa, coleções obtidas automaticamente e links de lojas existentes |
| `card.html`, `js/card.js` | Grid/lista, ações, paginação local e filtros das cartas já recuperadas |
| `js/card-search.js` | Primeira carga automática, paginação remota, lotes de importação, skeleton, erros e repetição |
| `card-detail.html`, `js/card-detail.js` | Carta selecionada, regras, legalidade e preços da impressão identificada |
| `js/card-arts.js` | Edições, comparação de preços e galeria paginada; links selecionam outra impressão |
| `js/card-data.js` | Contrato comum, registro de provedores, adaptador Scryfall, cache e transporte Magic |
| `js/pokemon-provider.js` | Transporte TCGdex, exclusão de Pocket, normalização, variantes e correspondência de coleções |
| `js/prices.js` | Registros de preço, identificação de acabamento/moeda/fonte e formatação sem câmbio fixo |
| `js/common.js` | Sidebar, pesquisa compartilhada, autenticação demonstrativa, idioma, jogo e navegação |
| `js/lands.js` | Manifesto dos 14 ciclos, consultas exatas e filtros específicos de terrenos |
| `competitive.html`, `js/competitive.js` | Torneios, classificações, decklists, importação colada, comparação e análise |
| `js/tournament-data.js` | Adaptadores Limitless/TopDeck e normalização pública de resultados/decklists |
| `js/meta-analysis.js` | Funções puras para frequência, médias, categorias, distribuição e comparação |
| `js/deck-import.js` | Parser limitado, quantidades, seções, identificadores e compatibilidade de imports antigos |
| `js/storage.js` | Preferências e cache de sessão com tolerância a bloqueio de armazenamento |
| `js/i18n.js`, `js/locales.js` | Módulo de localização existente ampliado para cinco idiomas e fallback inglês |
| `css/expansion.css` | Ajustes compactos, novos controles, responsividade e impressão de decklists |
| `server.js` | Arquivos públicos e proxy restrito da TopDeck; nunca serve `.env` |
| `tests/`, `scripts/` | Testes nativos Node, integração jsdom, verificação de sintaxe e smoke de APIs reais |

## Contrato e fluxo

`CardData.provider()` retorna exclusivamente o jogo ativo, Magic por padrão. Cada adaptador implementa `search`, `get`, `named`, `sets`, `autocomplete`, `collection`, `arts` e `localized`. `selectGame` só aceita provedores registrados. O seletor desabilita jogos sem adaptador; Pokémon está habilitado após validação real do TCGdex. URLs incluem `game`, evitando abrir uma impressão no jogo errado. A escolha de jogo fica na URL; a preferência de idioma fica em armazenamento local.

O modelo comum contém `id`, `game`, `source`, `name`, `collection`, `number`, `images`, `prices`, `fetchedAt`, `priceUpdatedAt`, `serialization` e `metadata`. Identificadores externos são sempre contextualizados por jogo/fonte. `toView` mantém compatibilidade com os componentes originais sem misturar regras Pokémon e Magic.

Fluxo de catálogo: parâmetros da URL → provedor → cache/fila → API → normalização → filtros → página visível. Nenhuma base completa é baixada na inicialização. Scryfall retorna sua primeira página; TCGdex solicita 30 registros. Somente as cartas Pokémon visíveis recebem enriquecimento de detalhes/preços, com dois consumidores e transporte serializado. Mudanças de página abortam os consumidores obsoletos.

Fluxo competitivo: Limitless pública diretamente no navegador; TopDeck somente por `/api/topdeck/*` no servidor. Resultados são carregados por campeonato ou pela ação explícita de carregar a página. Decklists externas permanecem links: o aplicativo não busca silenciosamente uma lista possivelmente editada após o evento.

## Persistência e segurança

Não há contas reais nem autenticação de senha. O demonstrativo local original continua existindo; não é adequado para acesso protegido. Senhas não são persistidas. O servidor não usa banco e só guarda cache temporário em memória. Preferências de idioma, lojas e layout ficam no navegador; imports e cache de catálogo ficam na sessão. Torneios não são persistidos em disco.

Chaves TopDeck são lidas de variável de ambiente, enviadas exclusivamente ao domínio fixo da fonte e nunca devolvidas ao frontend. O proxy admite somente listagem e classificação públicas, sem `view=staff`, rodadas, cadastro ou operações de escrita. Campos não necessários, como Discord e contato, são descartados na resposta ao cliente.

## Limites arquiteturais atuais

O sistema de localização customizado existente foi mantido, sem adicionar uma biblioteca de runtime. A interface tem traduções para en/pt/es/fr/de; nomes e textos oficiais das cartas continuam em inglês. Não há integração Scrydex, ingestão histórica persistente, equivalência funcional global de reimpressões Pokémon ou armazenamento central de torneios. A validação TopDeck com credencial real permanece pendente. A revisão visual posterior foi feita na prévia integrada do VS Code, conforme `Changes.md`.
