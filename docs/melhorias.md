# Melhorias aplicadas no frontend

> Documento histórico da implementação anterior. O estado atual inclui servidor opcional para TopDeck e está descrito em [Changes.md](Changes.md), [Architecture.md](Architecture.md) e [Setup.md](Setup.md).

O projeto continua sendo um site estático. Por solicitação do usuário, nenhum backend, banco de dados ou serviço de autenticação foi adicionado.

## Cobertura dos requisitos

| Requisitos | Entrega nesta etapa |
| --- | --- |
| REQ-01 a REQ-04 | Primeira página de busca exibida imediatamente; demais páginas sob demanda. Importação em lotes de 30 entradas, quantidades agrupadas e Sideboard independente. Traduções e miniaturas complementares não bloqueiam resultados. |
| REQ-05 a REQ-07 | Botão na página da carta abre uma galeria acessível, com todas as edições disponibilizadas pela fonte, paginação e imagens carregadas conforme necessário. A arte principal permanece na página; clicar em uma edição abre seus detalhes. |
| REQ-08 e REQ-09 | Identificação de edições serializadas e campos separados para número de série e número da coleção. Quando a fonte não informa o serial físico, essa limitação é indicada. |
| REQ-10 e REQ-11 | Pesquisa e comparação das cinco fontes em [fontes-tcg.md](fontes-tcg.md). |
| REQ-12 e REQ-13 | Registro de adaptadores, contrato normalizado e isolamento do Scryfall em `js/card-data.js`. Somente MTG está ativado. Novos jogos ainda precisam de seu adaptador, transporte e interface específica. |
| REQ-14 a REQ-18 | Backend adiado. Cache, controle de concorrência e erros foram implementados apenas no navegador. |
| REQ-19, REQ-20 e REQ-22 | Robustez do armazenamento em navegadores móveis, sincronização do perfil demonstrativo entre abas e ao retomar a página, campos compatíveis com preenchimento automático. A autenticação real continua pendente. |
| REQ-21 e parte de RNF-06 | Renovação segura de sessão depende do backend e não foi implementada. O login existente continua demonstrativo e não valida senha. Nenhuma senha ou token é persistido pelo frontend. |

## Busca e importação

- Resultados de busca e coleção são carregados por página da fonte; o botão **Charger plus de cartes / Load more cards** busca a próxima página. Os filtros e preços consideram somente as cartas já carregadas, conforme indicado na interface.
- Cache LRU em memória: até 160 respostas e aproximadamente 4 MiB de texto JSON, TTL de 5 minutos; coleções, 1 hora. O cache é por página/aba e se encerra ao recarregar.
- Consultas idênticas em andamento são compartilhadas; downloads limitados a dois simultâneos, com intervalo mínimo de 120 ms entre inícios por página/aba.
- Timeout de 10 segundos por download; HTTP 429 respeita `Retry-After`. Erros e dados inválidos não entram no cache. Uma falha ao carregar mais cartas preserva os resultados existentes e permite tentar novamente.
- Sugestões aparecem antes das miniaturas. Mudanças de consulta/página cancelam a espera pelos dados obsoletos; uma requisição compartilhada já em andamento pode terminar para atender outro consumidor ou alimentar o cache.
- Listas reconhecem `Deck`, `Mainboard`, `Commander`, `Companion`, `Sideboard`, `Sideboard (15)`, `SB:`, comentários e o formato `4 Lightning Bolt (M11) 149`. `Maybeboard`/`Considering` são ignorados. Nomes de cartas duplas com `//` são preservados.
- Quantidades não criam milhares de elementos nem consultas repetidas. Limites: 250 KiB por arquivo, 1.000 entradas e 1.000 exemplares por entrada; linhas inválidas são informadas antes de navegar.
- Entradas ausentes na resposta da API são associadas ao identificador original, sem deslocar os dados das cartas seguintes. Listas de versões antigas continuam aceitas.
- O Sideboard é carregado por solicitação e identificado nos resultados. Uma falha nessa consulta não remove o deck principal.

## Artes e serialização

A galeria usa o identificador Oracle com `unique=prints`, mantendo variações e desativando repetições por idioma na consulta. Os resultados também são agrupados por coleção e número de impressão, inclusive entre páginas, para mostrar cada edição uma única vez. Artes e tratamentos com números de impressão diferentes permanecem disponíveis. Páginas adicionais só são consultadas ao clicar no botão da galeria. Cartas com duas faces mostram ambas. Traduções preservam a coleção e o número da impressão, evitando trocar silenciosamente a arte por outra edição.

`promo_types: ["serialized"]` identifica a edição serializada. O campo `collector_number` nunca é usado como serial físico. O normalizador aceita `serial_number` e `serial_total` quando uma fonte os fornece, mas não presume que esses campos existam em todas as respostas do Scryfall.

## Validação

A implementação foi verificada com respostas simuladas da API e no Chrome em desktop e viewport móvel. Essas verificações não certificam disponibilidade das fontes externas nem compatibilidade em Safari/iOS real. Autenticação segura, cookies persistentes de sessão e renovação de tokens devem ser validados quando o backend for desenvolvido.
