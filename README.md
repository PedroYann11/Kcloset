# Kcloset

Guarda-roupa virtual pessoal. Mobile-first, editorial e minimalista: a usuária abre
o guarda-roupa, monta looks com as peças que tem, guarda esses looks em coleções,
pede sugestão por ocasião e anuncia o que não usa mais no **K Bazar**.

Sem backend por enquanto. As peças de demonstração ficam em `data/seed-items.ts` e
tudo que a usuária cria (peças novas com foto, looks, coleções e favoritos) é
persistido no `localStorage` do próprio aparelho.

## Como rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Outros comandos: `npm run build` (build de produção), `npm start` (servir o build).

## Ideias centrais

- **Quatro famílias de peça**: roupas de cima, roupas de baixo, calçados e
  acessórios (`CategoryId`). É a divisão que o móvel consegue mostrar de forma
  plausível e que a montagem de look usa, um espaço por família. Vestido e macacão
  são `tops` com `fullBody`, e ocupam o look inteiro.
- **A abertura é só a marca e o móvel.** Nada de atalhos em volta: enquanto as portas
  estão fechadas não há nem barra de navegação. Ela aparece quando o guarda-roupa é
  aberto, e cada peça lá dentro leva para a sua família no Closet.
- **Closet é onde se monta o look.** O Espelho fica no topo e vai se preenchendo
  conforme a usuária toca nas peças; tocar de novo tira a peça. É de lá também que
  saem as sugestões por ocasião. Acessórios são o único espaço que aceita várias peças
  no mesmo look, e aparecem separados em bolsas, óculos, joias e outros.
- **Looks são só looks.** A aba guarda os looks salvos em coleções no espírito do
  Pinterest ("Praia", "Trabalho"), com favoritos e etiquetas.
- **Pouca palavra na tela.** O app não explica o que a interface já mostra: sem textos
  de apoio, sem instruções de uso, sem travessões.
- **O tema é dela.** A aba Tema personaliza as cores do app inteiro (Geral) ou só de
  uma página por vez (Guarda-roupa, Closet, Looks, Bazar), a partir de quatro cores que
  derivam a paleta inteira.

## Telas

| Tela | Arquivo |
| --- | --- |
| Abertura (guarda-roupa) | `components/kcloset/HomeScreen.tsx` + `WardrobeScene.tsx` |
| Closet (acervo, busca, filtro e Espelho) | `components/kcloset/ClosetScreen.tsx` |
| Peça em detalhe | `components/kcloset/ItemDetailScreen.tsx` |
| Nova peça | `components/kcloset/AddItemScreen.tsx` |
| Looks (coleções, todos, favoritos) | `components/kcloset/LooksScreen.tsx` |
| Coleção aberta | `components/kcloset/BoardScreen.tsx` |
| Look em detalhe | `components/kcloset/LookDetailScreen.tsx` |
| Calendário de uso | `components/kcloset/CalendarScreen.tsx` |
| Estatísticas | `components/kcloset/StatsScreen.tsx` |
| Ocasião e sugestões | `components/kcloset/OccasionScreen.tsx`, `OccasionResultScreen.tsx` |
| K Bazar | `components/kcloset/BazaarScreen.tsx` |
| Tema | `components/kcloset/ThemeScreen.tsx` |

## Estrutura

```
app/                     layout, página, estilos globais e as rotas de API (importar por link)
components/kcloset/      uma tela por arquivo + o orquestrador (KclosetApp)
components/kcloset/ui/   primitivos (Chip, HeartButton, OutfitCanvas, GarmentView, ...)
components/icons/        desenho das peças (silhuetas preenchidas) e cabide
data/                    acervo de demonstração, famílias e ocasiões
lib/                     paleta, tema, localStorage, imagem, link de loja, datas e sugestões
types/                   tipos do domínio
```

`KclosetApp` é o único componente `"use client"` da árvore: ele concentra o roteador
de telas e o estado compartilhado (acervo, favoritos, looks, coleções, montagem,
sugestões). As telas são de apresentação, recebem dados e callbacks.

## Detalhes de implementação

- **Desenho das peças** (`components/icons/garments.tsx`): cada forma (blusa, camisa,
  vestido, calça, saia, tênis, bota, bolsa e as demais) é uma silhueta preenchida com o
  tom do tecido, uma dobra mais fechada e um fio de contorno. A caixa de desenho de cada
  forma define a proporção, que é o que faz a calça descer mais que o top na haste.
- **Cores** (`lib/palette.ts`): a cor escrita no cadastro ("Preto", "Rosa pó", "Jeans")
  vira um tecido concreto dentro do tema de preto, cinza e rosa pastel. O que não é
  reconhecido cai num cinza claro neutro.
- **Busca e filtro** (`ClosetScreen`): a busca varre nome, cor, estação e estilo;
  os filtros são cor, estação, estilo e favoritas. O contador de cada família reflete os
  resultados, então dá para ver em qual delas está a peça procurada.
- **Cadastro por link** (`lib/link-import.ts`, `app/api/import/*`): a usuária cola o link
  do produto e a peça entra pronta. O servidor lê `og:` e JSON-LD da página, e a IA
  escolhe qual das fotos do anúncio serve de foto de closet e preenche família, tipo,
  cor, estação e estilo. Três coisas medidas em teste real, não supostas:
  1. Algumas lojas (Shein, Renner, Zara, Riachuelo) servem só a casca do app com
     anti-robô, e nenhum user-agent de crawler resolve. Para essas, o caminho que
     funciona é colar a URL da própria imagem: o CDN de imagem entrega sem bloqueio.
     Por isso o mesmo campo aceita link de página e link de imagem.
  2. A foto tem que passar pela nossa origem (`/api/import/image`), senão CORS impede o
     download e o canvas contaminado faz `toDataURL` falhar no compressor.
  3. Sem `ANTHROPIC_API_KEY` a rota de IA responde 501 e o cadastro segue manual, então
     a chave é opcional.

  O endpoint que busca URL arbitrária valida o destino (`parsePublicUrl`) para não virar
  vetor de SSRF contra a rede interna de quem hospeda.
- **Fotos das peças** (`lib/image.ts`): a imagem escolhida é redesenhada num `canvas`
  para no máximo 800px no lado maior e exportada em JPEG a 0.8, virando um data URL
  base64 guardado junto com a peça. Peça sem foto cai no desenho da sua forma.
- **Persistência** (`lib/storage.ts`): uma única chave, `kcloset:v2`. Na primeira
  leitura, um acervo gravado no formato antigo (`kcloset:v1`, seis categorias) é
  migrado para as quatro famílias. A gravação só começa depois da leitura inicial,
  para não sobrescrever o que já estava salvo; se a cota do navegador estourar, o app
  avisa em vez de falhar em silêncio.
- **Guarda-roupa** (`WardrobeScene.tsx`): o móvel é SVG (carcaça laqueada clara, duas
  hastes, prateleiras, gavetas, portas) e as peças que dão para tocar são `<button>` de
  HTML posicionados por cima em porcentagem, então cada peça é um elemento focável de
  verdade, com `aria-label` da família.
- **Registro de uso** (`LookDetailScreen`, `CalendarScreen`, `StatsScreen`): "Vesti hoje"
  grava a data no look e o calendário mostra o mês inteiro, com registro em qualquer dia
  e desfazer. As estatísticas somam por peça, mostram o look mais usado e o que ainda
  não entrou em nenhum look.
- **Excluir peça** (`ItemDetailScreen`): a peça sai do closet, dos favoritos, do Espelho
  e dos looks salvos; look que fica sem nenhuma peça é removido junto. Peça de
  demonstração apagada fica registrada em `removedSeedIds` e não volta.
- **Tema** (`lib/theme.ts`, `ThemeScreen`): uma receita de 4 cores (fundo, texto,
  destaque, tom do guarda-roupa) deriva todas as variáveis CSS do app (`--c-ink`,
  `--c-paper`, `--case-face` e as demais) nas mesmas proporções de contraste do design
  original. Existe uma receita Geral e, por página, uma receita própria opcional que a
  substitui só ali; `KclosetApp` calcula o escopo da tela atual e aplica as variáveis
  derivadas como `style` no corpo do app, então nenhuma outra tela precisa saber que o
  tema existe, ela só usa `bg-paper`, `text-ink` etc. como sempre usou. Persistido em
  `localStorage` numa chave própria, `kcloset:theme:v1`.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · lucide-react · @anthropic-ai/sdk
