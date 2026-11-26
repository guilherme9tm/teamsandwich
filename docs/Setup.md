# Execução e validação

## Dependências

- Aplicação estática: navegador moderno com Fetch, AbortController/AbortSignal.timeout, módulos Intl e dialog nativo. Não abrir por `file://`.
- Servidor para contas/TopDeck e testes: Node.js 22.13+ (Node 24 recomendado) e npm.
- Não há banco local, migrações próprias, Docker, build ou dependência de produção. Contas usam Supabase Auth; veja [configuração de cadastro e login](Autenticacao.md).

## Instalação e servidor completo

Na raiz do repositório:

```powershell
npm ci
Copy-Item -LiteralPath .env.example -Destination .env
npm start
```

Abra `http://127.0.0.1:5500`. `.env` é opcional para iniciar; sem a chave, catálogo, Lands e torneios Pokémon funcionam e Magic competitivo informa a configuração ausente.

Variáveis:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `5500` | Porta HTTP |
| `HOST` | `127.0.0.1` | Interface do servidor local |
| `TOPDECK_API_KEY` | vazio | Chave de leitura da TopDeck, exclusiva do servidor |

Obtenha a chave no [portal de desenvolvedores TopDeck](https://topdeck.gg/docs/tournaments-v2) e preencha `.env` localmente. Não a coloque em HTML, JavaScript de navegador, parâmetros de URL ou Git. Reinicie o servidor ao mudar variáveis. `.env` e `node_modules` são ignorados. O servidor disponibilizado é de desenvolvimento; qualquer publicação exige hospedagem HTTPS apropriada e aplicação das condições das fontes.

O catálogo Scryfall, TCGdex e os endpoints públicos Limitless usados não exigem credenciais. Nenhum serviço pago foi habilitado.

## Modo estático

Para manter o fluxo original, Live Server ou outro servidor estático também funciona:

```powershell
python -m http.server 5500
```

Esse modo não disponibiliza contas, login ou o proxy TopDeck. Não execute ambos os servidores na mesma porta.

Entradas úteis:

- `login.html`: cadastro e login com e-mail e senha (Supabase configurado); [teste e persistência local](MeusDecks.md).
- `card.html`: catálogo automático de Magic.
- `card.html?game=pokemon&name=Pikachu`: pesquisa Pokémon.
- `card.html?view=lands`: catálogo especializado de terrenos.
- `competitive.html?game=pokemon`: resultados públicos Limitless.
- `competitive.html?game=mtg`: resultados TopDeck, após configurar servidor/chave.

## Testes

```powershell
npm run check
npm test
npm run test:live
```

`check` verifica sintaxe JavaScript e referências locais de assets HTML. `test` usa `node:test`, respostas determinísticas identificadas como fixtures e jsdom para comportamento de páginas, erros, importações, preços, localização, estatísticas e proxy. Os testes não precisam de chaves nem rede externa.

`test:live` é opcional e utiliza rede: verifica os 14 ciclos na Scryfall, busca/detalhes/exclusão de Pocket e correspondência de impressão TCGdex, além de campeonatos e classificação Limitless. Respeita a fila dos provedores. Não valida TopDeck autenticada; essa validação depende de chave real e pode ser feita pela página competitiva com o servidor configurado. Uma falha de rede não deve ser substituída por resultados fictícios.

## Verificação visual

A revisão visual posterior à entrega inicial utilizou a prévia integrada do VS Code em larguras ampla e estreita. Foram revisados home, catálogo, detalhes e navegação competitiva. Para ampliar a validação, conferir também 360, 768 e 1440 px, foco/teclado, troca de idioma e preview de impressão. Abrir uma impressão sem USD normal e confirmar que o preço de outra impressão não aparece como seu valor. O bloqueio do acesso direto ao Chrome registrado na primeira entrega não impediu a revisão posterior pela prévia integrada.

## Solução de problemas

- Mensagem `TOPDECK_API_KEY`: usar `npm start` e configurar a chave; servidor estático sozinho não basta.
- 429: aguardar o cooldown antes de repetir. Não criar outras chaves para contornar limites.
- Preço Pokémon ausente: pode não existir variante/ID de mercado validável; detalhes identificam a cobertura limitada.
- Nome de carta na interface em outro idioma: a tradução da interface não altera o idioma oficial dos dados.
- Importação não persistida: permitir armazenamento de sessão; o parser informa formato inválido ou limite excedido.
- Limpar preferência/cache: remover `lang`, `scryfallCache`, `tcgdexCache` ou `fileCards` pelo armazenamento do navegador, conforme necessário. Nenhum cache contém chaves privadas.
