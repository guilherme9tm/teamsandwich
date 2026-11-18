# Fontes de dados

Pesquisa e consultas reais em 18/11/2026. Os links abaixo são referências de implementação; respostas e termos podem mudar. A aplicação não faz scraping.

## Scryfall — Magic

- Fonte: [API Scryfall](https://scryfall.com/docs/api). Sem chave. O frontend já usava essa integração.
- Endpoints efetivos: `GET /sets`, `/cards/search`, `/cards/{id}`, `/cards/named`, `/cards/autocomplete`, `/cards/{set}/{number}/{lang}` e `POST /cards/collection`.
- `search` usa `unique=cards`; galeria usa `unique=prints`, `oracleid`, variações e paginação. A consulta de ciclos usa nomes completos com o operador exato `!`, nunca palavras parciais. Imports usam até 30 entradas por lote, abaixo do limite de 75 identificadores do endpoint collection.
- Identidade funcional: `oracle_id`; impressão: `id`, coleção e número. A associação de uma resposta collection não depende da posição no array, pois cartas ausentes são omitidas pela fonte.
- Preços de origem: `usd`, `usd_foil`, `usd_etched`, `eur`, `eur_foil`, `tix`, cada um com moeda/acabamento explícitos. A interface converte USD/EUR para CAD; TIX permanece uma unidade digital. O preço principal usa o valor normal da impressão selecionada. Foil de outra impressão nunca substitui esse valor.
- Cache: cinco minutos; coleções, uma hora; LRU de até 160 entradas/4 MiB estimados, com snapshot na sessão do navegador. Até duas requisições ativas, início espaçado em 120 ms, timeout de 10 s e fila limitada. Resposta 429 respeita Retry-After.
- `fetchedAt` registra a consulta da resposta; não é a data de atualização do mercado. Quando a fonte não informa a atualização, a interface declara isso. A verificação via Node identifica o aplicativo no User-Agent.

## Bank of Canada — conversão para CAD

- Referência: [Valet API](https://www.bankofcanada.ca/valet-api-how-to/). Consulta pública sem chave: `GET https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json?recent=1`.
- A camada de preços preserva os registros originais e multiplica USD/EUR pelas taxas diárias correspondentes para exibir estimativas em CAD no catálogo, detalhes, edições e totais de decks. Os detalhes mostram a fonte e a data do câmbio. Não são cotações ou estoques das lojas.
- Timeout de oito segundos, deduplicação de chamadas simultâneas e cache de sessão. Em falhas, taxas válidas de até sete dias podem ser reutilizadas; sem taxa válida, a conversão fica indisponível. Valores ausentes continuam ausentes e preços zero continuam zero.

## TCGdex — Pokémon TCG

Referências: [REST](https://tcgdex.dev/rest), [filtros e paginação](https://tcgdex.dev/rest/filtering-sorting-pagination), [assets](https://tcgdex.dev/assets), [FAQ](https://tcgdex.dev/faq).

- Gratuita, sem chave; a FAQ não publica um teto rígido. O adaptador usa transporte serial, intervalo de 150 ms, timeout de 12 s, cache de cinco minutos/100 entradas e snapshot de sessão limitado a 1 milhão de caracteres. Trata 404, 429 e respostas inválidas.
- Endpoints: `/v2/en/series/tcgp`, `/cards?name=...&pagination:page=...&pagination:itemsPerPage=30`, `/cards/{id}`, `/sets`, `/sets/{id}`. Filtros usam `set.id`, `category` e `abbreviation.official`. A listagem de coleções solicita ordenação por `releaseDate` descendente.
- A série `tcgp` fornece os identificadores de Pocket que são excluídos do catálogo, coleções e acesso direto. Pokémon TCG Pocket não é tratado como o jogo físico.
- Impressão: identificador TCGdex e `localId`. Dados: categoria, tipos, ataques, habilidades, legalidade, idioma, imagens, variantes. Assets recebem `/high.webp` ou `/low.webp` para cartas e `.webp` para símbolos.
- Preços são exibidos somente quando `variants_detailed` fornece `variantId`, ID do mercado e um registro de preço com esse mesmo ID. TCGplayer: `marketPrice` em USD, normal/holo/reverse. Cardmarket: tendência em EUR quando o acabamento tem campo correspondente explícito. Metadados legados de preço sem associação explícita são omitidos.
- A fonte reconhece problemas de correspondência de mercados na FAQ. Os filtros conservadores reduzem ambiguidades, mas não certificam a correção do banco externo. Cobertura incompleta é informada na interface.
- Busca retorna objetos breves. Detalhes e preços são recuperados apenas para a página visível. A comparação de cartas de mesmo nome carrega seis detalhes por página; mesmo nome não prova mesmas regras.
- Decklists Limitless usam siglas como `TWM`. O adaptador consulta `abbreviation.official`, exige uma única coleção, compara número ignorando apenas zeros iniciais e confirma o nome antes de associar imagem/preço. Não há fallback para outra edição quando uma impressão explícita não é encontrada.

## Limitless — torneios Pokémon

Referências: [guia de desenvolvedores](https://docs.limitlesstcg.com/developer.html), [torneios](https://docs.limitlesstcg.com/developer/tournaments).

- Endpoints públicos não exigem chave, exceto regras de categorização `/games/.../decks`, que não são usados. Consulta via `https://play.limitlesstcg.com/api/tournaments?game=PTCG&limit=24&page=...&format=...` e `/tournaments/{id}/standings`.
- Dados: nome, data, formato, participantes e, quando publicados, classificação, jogador, arquétipo e decklist estruturada `pokemon`/`trainer`/`energy`.
- Não se presume que todas as listas estejam publicadas ou que plataforma/local existam no resultado. Filtros de período são aplicados aos campeonatos recuperados. Aumentar o período não baixa automaticamente todas as páginas.
- Cache em memória de dez minutos/80 URLs, deduplicação de consultas, intervalo de 500 ms, timeout de 15 s e espera após 429. Conferir limites nos headers da fonte ao operar em escala.
- A documentação de acesso consultada não concede explicitamente uma licença geral de revenda ou redistribuição comercial. O projeto fornece atribuição e links; verificar condições com a fonte antes de reutilizar dados em produto comercial. Não há importação por scraping.

## TopDeck.gg — torneios Magic

Referências: [Tournaments V2](https://topdeck.gg/docs/tournaments-v2), [OpenAPI](https://topdeck.gg/openapi.json), [Developer Terms](https://topdeck.gg/developer-terms).

- Requer `TOPDECK_API_KEY` no servidor. Endpoints usados: `GET https://topdeck.gg/api/v2/tournaments` com jogo, formato, datas, página e `perPage=24`; `GET /v2/tournaments/{TID}` para metadados/classificação pública. O navegador chama apenas o proxy local.
- A API exige atribuição visível e chave fora de navegadores. Os termos permitem exibição de registros públicos com crédito; proíbem comercializar os dados e scraping sem autorização. Acesso atual gratuito não é garantia de gratuidade futura.
- Limites documentados: tiers de 5, 50 e 100 requisições/minuto por chave, além de quota diária. O projeto usa somente GET e espaça chamadas de servidor em 1,5 s, cache de dez minutos/200 respostas, fila com até 30 pedidos e timeout de 15 s. Não usa o endpoint bulk de cinco chamadas/minuto.
- Normalização aceita somente campos públicos necessários. `registeredCount` representa inscrições, não necessariamente jogadores com resultado. Colocação vem de `standing`, sem inventar posição pela ordem do array. Decklists podem ser texto, objeto estruturado ou URL; formatos desconhecidos ficam indisponíveis.
- Sem chave configurada, a página apresenta instruções explícitas. Os contratos e o proxy têm testes determinísticos; a consulta real autenticada não pôde ser validada nesta entrega porque não foi fornecida credencial.

## Alternativas avaliadas

- [Pokémon TCG API](https://docs.pokemontcg.io/sdks/overview/): depreciada; a documentação anuncia encerramento em 01/03/2027. Não foi adotada para uma nova integração.
- [Scrydex](https://scrydex.com/docs/pokemon/api-reference): mantida, autenticação com API key e team ID; [créditos](https://scrydex.com/docs/getting-started/api-credits) e [planos pagos](https://scrydex.com/pricing). Não foi contratada nem integrada; TCGdex atende ao catálogo sem custo/chave.
- [MTGJSON](https://www.mtgjson.com/): catálogo e arquivos de dados úteis para enriquecimento futuro, sem necessidade de baixar sua base no navegador. Não é usado como feed de resultados competitivos nesta implementação.

## Consistência e indisponibilidade

Ausência de preço não vira zero. Cada preço inclui impressão, moeda, acabamento e origem. A consulta de detalhes por ID não cai silenciosamente na busca por nome. Torneios vazios não recebem conteúdo demonstrativo. Listas importadas pelo usuário ficam separadas de listas publicadas. Falhas, limites e repetição são apresentados ao usuário; análise usa apenas listas efetivamente recuperadas.
