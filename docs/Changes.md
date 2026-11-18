# Alterações e estado da entrega

Data: 18/11/2026.

## Revisão visual solicitada após a entrega

A pedido do usuário, a paleta verde foi substituída por azul profundo e dourado, com tipografia de sistema Segoe UI/Bahnschrift. O cabeçalho reúne busca e seletor de jogo em uma linha no desktop; a navegação ganhou indicação da página ativa. A marca agora usa texto e monograma, sem depender da imagem horizontal no cabeçalho. Os estilos são carregados no HTML para evitar o carregamento tardio da aparência. Home, cards, detalhes, formulários e estados de foco compartilham os mesmos tokens. O competitivo usa abas para reduzir a quantidade de controles simultâneos. Esta revisão foi inspecionada na prévia integrada do VS Code em larguras ampla e estreita; a restrição anterior do acesso direto ao Chrome permanece apenas como registro histórico da primeira entrega.

## Diagnóstico

Foram inspecionados os três HTMLs originais, módulos JavaScript, estilos, documentação e fluxo de dados. O projeto utiliza JavaScript puro e Scryfall; já tinha abstração de provedores, cache em memória, importação, galeria e paginação incremental. Não havia React, banco, runner de testes, integração Pokémon ou dados competitivos conectados. A primeira busca já era automática quando recebia nome/coleção; a entrada vazia foi ampliada para abrir o catálogo automaticamente.

## Arquivos criados

- `js/pokemon-provider.js`, `js/prices.js`, `js/locales.js`, `js/lands.js`.
- `competitive.html`, `js/tournament-data.js`, `js/meta-analysis.js`, `js/competitive.js`.
- `css/expansion.css`, `server.js`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`.
- `scripts/check.js`, `scripts/live-check.js` e testes em `tests/`.
- `docs/Architecture.md`, `docs/DataSources.md`, `docs/Features.md`, `docs/Setup.md`, `docs/Changes.md`.

## Arquivos modificados

`index.html`, `card.html`, `card-detail.html`, `js/card-data.js`, `js/card-search.js`, `js/card.js`, `js/card-detail.js`, `js/card-arts.js`, `js/common.js`, `js/deck-import.js`, `js/i18n.js`, `js/script.js` e `README.md`. Documentos antigos de pesquisa receberam uma indicação de conteúdo histórico.

## Implementação por fase

1. Diagnóstico: arquitetura real identificada e recursos existentes preservados.
2. Interface: grid compacto, nome limitado/tooltip, placeholders, ações centralizadas, skeleton, carga inicial vazia, erros e repetição, comparação automática de edições. Removido câmbio CAD fixo de 1,38; preços agora mantêm moeda/acabamento/impressão.
3. Jogos/idiomas: TCGdex conectado com dados reais; Pocket excluído; Magic/Pokémon exclusivos; URLs preservam contexto; cinco idiomas com inglês padrão e preferência persistente. Mantido o mecanismo de localização customizado existente, em vez de adicionar dependência de runtime.
4. Lands: 14 ciclos curados, busca exata, identidade de cor, legalidade, pesquisa, ordenação e detalhes compartilhados.
5. Competitivo: Limitless pública integrada e consultada ao vivo; proxy TopDeck implementado com chave de ambiente. Classificações, filtros, visualizador de listas, cópia, impressão, importação local, estimativas parciais, frequência, distribuição, comparação e evolução mensal quando a amostra permite.
6. Validação: testes nativos e integração DOM; documentação da aplicação efetiva. A revisão visual em navegador não foi concluída devido ao bloqueio descrito abaixo.

## Decisões e consistência

- Nenhuma migração de framework ou novo projeto. O servidor Node é opcional e só necessário para proteger a chave TopDeck.
- O jogo é determinado pela URL; apenas o idioma é persistido como preferência. Cartas permanecem em inglês.
- Cache de catálogo por sessão e memória com TTL; torneios em memória, sem base histórica persistente.
- Preço principal = CAD normal da impressão selecionada. Foil, EUR e outros valores têm identificação própria; ausência não vira zero nem valor de outra edição.
- Preços Pokémon legados sem identificadores explícitos de variante/mercado são omitidos, seguindo a limitação documentada da fonte.
- Pokémon de mesmo nome não é presumido como reimpressão funcional. A análise mantém coleção+número e informa essa limitação.
- Decklist externa permanece link de origem. Lista colada pelo usuário não vira resultado oficial nem entra silenciosamente na amostra publicada.
- Campos privados TopDeck não são enviados ao navegador. O servidor não aceita URLs arbitrárias nem operações de escrita.

## Cobertura dos critérios

Os testes verificam carga automática e erro/repetição; preços com zero/ausência/foil e ID de impressão; seleção de jogo e botão desabilitado sem adaptador; consulta Pokémon isolada e exclusão de Pocket; classificações e formatos reais de API por fixtures; importação, cópia e abertura de listas; cálculo/limites de frequência; classificação exata de Lands; persistência/fallback dos cinco idiomas; cache/expiração/deduplicação; proxy e proteção de arquivos privados. Testes de DOM não comprovam geometria, renderização de impressão ou sobreposição visual.

Execução confirmada: 33 testes determinísticos aprovados e sintaxe/referências locais verificadas. O smoke ao vivo aprovou os 14 ciclos (138 membros no manifesto), consulta/detalhes e correspondência TCGdex, com três registros de preço verificáveis na carta consultada, além de 24 campeonatos Limitless e 85 classificações no evento mais recente. A suíte determinística não depende de disponibilidade externa. Os dados de fixtures existem exclusivamente nos testes.

## Pendências e limites externos

- **TopDeck com credencial real:** não foi fornecida `TOPDECK_API_KEY`. Adapter/proxy/UI estão implementados e testados por contrato, mas acesso autenticado e cobertura real de torneios Magic permanecem sem validação. A tela informa isso claramente, sem campeonatos inventados.
- **Revisão visual:** a ferramenta Computer Use encerrou a revisão porque não conseguiu confirmar a URL atual do Chrome no Windows. CSS e DOM foram validados por código/testes; desktop, mobile e preview de impressão exigem revisão visual posterior.
- **Pokémon:** equivalência funcional de reimpressões e variantes não representadas nos dados de mercado continuam limitadas. Dados de mesmo nome podem ter regras diferentes. O aplicativo não apresenta agrupamento funcional global como concluído.
- **Torneios:** escopo das buscas é o conjunto carregado. Player/archetype precisam de classificações; períodos longos podem exigir outras páginas. Há resultados sem decklists, arquétipo ou local. URLs de listas podem ser alteradas na origem.
- **Fontes/termos:** TopDeck exige atribuição e restringe comercialização dos dados. Limitless não foi interpretada como licença irrestrita de redistribuição. Scrydex não foi contratada e a Pokémon TCG API depreciada não foi usada.
- **Histórico:** tendências calculadas somente a partir dos campeonatos carregados; sem importador permanente ou série histórica completa.
- **Contas:** autenticação local original continua demonstrativa. Não foi criada autenticação real nesta refatoração.

Próximas melhorias possíveis: revisão visual com navegador disponível, validação TopDeck configurada, catálogo verificado de equivalências Pokémon e persistência histórica mediante necessidade concreta. Nenhuma dessas limitações é preenchida com dados simulados em produção.
