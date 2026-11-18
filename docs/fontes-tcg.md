# Fontes de dados para expansão a outros TCGs

> Documento histórico de 29/09/2026. Pokémon foi integrado posteriormente via TCGdex. Consulte [DataSources.md](DataSources.md) e [Changes.md](Changes.md) para o estado e as limitações atuais.

Pesquisa documental em 29/09/2026. As fontes abaixo são candidatas para integrações futuras; nesta etapa apenas MTG está conectado. Disponibilidade, cobertura e condições de uso devem ser verificadas novamente antes de ativar cada integração.

| Jogo / fonte | Identificação e catálogo | Imagens, artes e versões | Preços e dados específicos | Avaliação para integração |
| --- | --- | --- | --- | --- |
| Pokémon — [TCGdex](https://tcgdex.dev/rest/card) | `id`, `name`, `localId`, `rarity`, coleção em `set.id`/`set.name`. | Imagem em `image`; variantes de acabamento em `variants`. Acabamento e arte alternativa precisam ser tratados separadamente. | O exemplo de consulta de carta inclui HP, tipos, ataques, fraquezas e legalidade. Preços precisam de avaliação adicional; não são garantidos pelo contrato básico consultado. | Boa correspondência com o modelo comum; montar URLs de imagem conforme a documentação de assets. Busca e paginação têm [documentação própria](https://tcgdex.dev/de/rest/filtering-sorting-pagination). |
| Flesh and Blood — [The Fab Cube](https://github.com/the-fab-cube/flesh-and-blood-cards/blob/develop/README.md) | Dataset JSON/CSV de cartas e coleções; `unique_id` estável para cartas, impressões e edições. A entidade carta considera nome + pitch. | Impressões, foils e edições são entidades associadas; confirmar referências de imagem e raridade no schema da versão escolhida. | Pitch e demais atributos exigem metadados específicos. Preços não são prometidos pelo README consultado. | Adequado para indexação local de um snapshot versionado; não baixar o dataset completo a cada busca. Confirmar schema e estratégia de atualização antes de implementar. |
| Yu-Gi-Oh! — [YGOPRODeck v7](https://ygoprodeck.com/api-guide/) | `id`, `name`; `card_sets` informa coleção, código e raridade. | `card_images` lista imagens e artes alternativas. A API exige baixar e hospedar as imagens, em vez de hotlink contínuo. | Preços em `card_prices` e `card_sets`; atributos de monstro, ataque/defesa, tipo e informações de Link/Pêndulo. | Boa cobertura. Cada resultado pode agregar múltiplas impressões: preço/raridade precisam manter sua associação à edição. Planejar hospedagem de imagens antes de habilitar. |
| Digimon — [DigimonCard.io](https://digimoncard.io/api-documentation) | `id`, `name`, `rarity`, `set_name`; consulta por nome ou número. | O exemplo atual não fornece URL de imagem nem agrupamento completo de artes. Confirmar o mapeamento; hotlink de imagens é proibido pela fonte. | Nível, custo, evolução, DP, cores, atributos e efeitos; preço não consta no exemplo consultado. | Limite documentado de 15 requisições/10 segundos, com bloqueio temporário ao exceder. Não reutilizar limites do Scryfall. Confirmar cobertura de versões e hospedagem de imagens. |
| One Piece — [OPTCG API](https://www.optcgapi.com/documentation) | Endpoints de sets, starter decks, promos e DON!!; busca por identificador como `OP01-001`. | Validar o schema de cada família e a distinção de versões/arts antes de definir o identificador interno. | A [página da fonte](https://www.optcgapi.com/) informa atualização de preços e foco na edição inglesa. Campos detalhados e cobertura devem ser confirmados em amostras reais. | API GET sem autenticação, mantida pela comunidade; cache e consultas moderadas. A validação do schema está pendente, então não é apresentada como integração pronta. |

## Contrato interno e extensão

`CardData.normalizeCard()` recebe um objeto independente da API:

```js
{
  id: 'identificador-da-fonte',
  game: 'mtg',
  source: 'scryfall',
  name: 'Nome',
  collection: { id: 'codigo', name: 'Coleção' },
  number: '123',
  rarity: 'rare',
  images: { small: 'https://…', normal: 'https://…', large: 'https://…' },
  prices: { usd: null, eur: null },
  serialization: { isSerialized: false, number: null, total: null },
  metadata: { /* características específicas do jogo */ }
}
```

Valores indisponíveis permanecem `null` ou objetos vazios; não representar preço ausente como zero. Identificadores devem ser considerados em conjunto com `game` e `source`. Cada adaptador implementa `search`, `get`, `named`, `sets`, `autocomplete`, `collection`, `arts` e `localized`, e é registrado com `CardData.register(adapter)`.

O adaptador MTG está isolado em `createMtgProvider()`. O transporte atual `createClient()` é específico do Scryfall e nunca recebe URLs arbitrárias. Um novo provedor deverá ter seu próprio transporte, limites e normalização, respeitando condições da fonte. `toView()` adapta o contrato comum aos componentes MTG existentes; os filtros, legalidades e lojas específicos de Magic deverão ser adaptados ao ativar outro jogo.

Esta separação permite acrescentar jogos sem reescrever o controle de busca, cache e paginação. Fontes que exigem segredos ou hospedagem de imagens deverão aguardar a etapa de infraestrutura/backend autorizada pelo usuário.
