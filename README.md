# Kloset

Guarda-roupa virtual pessoal. Mobile-first, editorial e minimalista: a usuária abre
o guarda-roupa, monta looks com as peças que tem, guarda esses looks em coleções,
pede sugestão por ocasião e anuncia o que não usa mais no **K Bazar**.

Cada usuária entra com a conta Google dela, e o closet vive na nuvem: Postgres pro
metadado e Storage pra foto, num projeto Supabase próprio do Kloset. A peça de uma
não é visível pra outra, e quem garante isso é a Row Level Security no banco, não
checagem de tela. O aparelho fica com uma cópia do que veio de lá, pro app abrir
instantâneo: metadado em `localStorage`, foto em IndexedDB. As peças de
demonstração continuam em `data/seed-items.ts`.

## Como rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Precisa de um `.env.local` com as chaves do projeto Supabase (as duas são
públicas, vão pro navegador de qualquer jeito):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave publicável>
```

`ANTHROPIC_API_KEY` continua opcional: sem ela, as rotas de IA respondem 501 e o
cadastro segue manual.

Outros comandos: `npm run build` (build de produção), `npm start` (servir o build).

## Ideias centrais

- **O closet é de quem entrou.** Conta obrigatória, login com Google, e cada peça,
  look e coleção pertence a uma usuária só. Na primeira entrada, o closet que já
  existia naquele navegador sobe pra conta inteiro, sem perder foto nem look.
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
- **Cadastrar não exige foto.** "Nova peça" abre uma escolha: formulário completo (foto
  ou link) ou catálogo rápido, toque no tipo e na cor, sem foto nenhuma. É o mesmo
  desenho que já existe no resto do app, só colorido pela cor escolhida.
- **Foto com fundo, mas não precisa ficar assim.** No formulário completo, uma foto
  recém-escolhida ganha um botão "Recortar fundo": régua de tolerância, apagador manual,
  três saídas (usar o recorte, usar a foto como veio, ou desistir e cair no desenho). O
  recorte é sempre opcional, nunca trava quem só quer guardar a foto como tirou.
- **Cadastro em lote, pra não tirar foto peça por peça.** "Nova peça" também abre um
  caminho pra várias fotos de uma vez (uma peça por foto) e outro pra uma foto só com
  várias peças deitadas juntas, separadas sozinhas por recorte. As duas caem na mesma
  grade de revisão: cada peça já recortada, com contorno vermelho na que ficou duvidosa,
  nome e família sugeridos pela IA quando disponível, e um toque abre a peça no mesmo
  formulário completo de sempre pra ajustar antes de confirmar o lote inteiro.

## Telas

| Tela | Arquivo |
| --- | --- |
| Entrar (porta de entrada) | `components/kcloset/AuthGate.tsx` |
| Abertura (guarda-roupa) | `components/kcloset/HomeScreen.tsx` + `WardrobeScene.tsx` |
| Closet (acervo, busca, filtro e Espelho) | `components/kcloset/ClosetScreen.tsx` |
| Peça em detalhe | `components/kcloset/ItemDetailScreen.tsx` |
| Nova peça, escolha do método | `components/kcloset/AddMethodScreen.tsx` |
| Nova peça, formulário completo | `components/kcloset/AddItemScreen.tsx` |
| Nova peça, recortar fundo (dentro do formulário) | `components/kcloset/ui/CutoutEditor.tsx` |
| Nova peça, catálogo rápido | `components/kcloset/QuickAddScreen.tsx` |
| Nova peça, revisão do cadastro em lote | `components/kcloset/BatchReviewScreen.tsx` |
| Looks (coleções, todos, favoritos) | `components/kcloset/LooksScreen.tsx` |
| Coleção aberta | `components/kcloset/BoardScreen.tsx` |
| Look em detalhe | `components/kcloset/LookDetailScreen.tsx` |
| Calendário de uso | `components/kcloset/CalendarScreen.tsx` |
| Estatísticas | `components/kcloset/StatsScreen.tsx` |
| Ocasião e sugestões | `components/kcloset/OccasionScreen.tsx`, `OccasionResultScreen.tsx` |
| K Bazar | `components/kcloset/BazaarScreen.tsx` |
| Tema | `components/kcloset/ThemeScreen.tsx` |
| Conta (nome do closet, sair, apagar) | `components/kcloset/AccountScreen.tsx` |

## Estrutura

```
app/                     layout, página, estilos globais e as rotas de API (importar por link)
components/kcloset/      uma tela por arquivo + o orquestrador (KclosetApp)
components/kcloset/ui/   primitivos (Chip, HeartButton, OutfitCanvas, GarmentView, ...)
components/icons/        desenho das peças (silhuetas preenchidas) e cabide
data/                    acervo de demonstração, famílias e ocasiões
lib/                     nuvem (Supabase), migração, paleta, tema, cache local, imagem, link de loja, datas e sugestões
supabase/functions/      Edge Function (apagar conta), em Deno, fora do build do Next
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
- **Catálogo rápido** (`AddMethodScreen.tsx`, `QuickAddScreen.tsx`): "Nova peça" abre
  uma escolha entre o formulário completo e este atalho. Toque na cor, toque no tipo,
  a peça entra sem foto, sem sair da tela, para cadastrar o guarda-roupa inteiro em
  poucos minutos. Reaproveita o que já existe: `Garment` e `SHAPE_OPTIONS` para os
  desenhos, `decorateItems` para colorir pela cor escolhida, `addItem` de
  `KclosetApp.tsx` para salvar. A única diferença de infraestrutura é `quickAddItem`,
  um irmão fino de `addItem` que não navega nem avisa a cada toque, extraído para um
  `createItem` comum, o que dá para encadear várias peças seguidas.
- **Recorte de fundo** (`lib/cutout.ts`, `ui/CutoutEditor.tsx`): uma foto, um recorte.
  Por pixel, distância euclidiana até a cor média de um anel nas bordas da imagem decide
  o alfa, com uma faixa de transição para a borda sair suave; um apagador manual
  (`Uint8ClampedArray` numa `useRef`) pode forçar um pixel a transparente por cima disso,
  e o alfa final é sempre o menor dos dois, então a régua de tolerância nunca desfaz o
  que foi apagado à mão. O resultado é recortado na caixa justa dos pixels visíveis antes
  de virar o Blob final, senão a peça apareceria pequena dentro do próprio quadro no
  Espelho. Uma foto de até 800px processa em dezenas de milissegundos, então não precisa
  de Web Worker aqui. `CutoutEditor` é um componente de edição, não uma tela: `onCancel`
  mantém a foto original sem tocar nela, `onConfirm` chama o `applyPhoto` que já existia,
  `onUseDrawing` chama o `clearPhoto` que já existia. Como o editor cobre a tela inteira,
  o formulário por baixo fica `inert` enquanto ele está aberto, para não continuar
  focável nem alcançável por leitor de tela.
- **Cadastro em lote** (`lib/cutout.ts`, `BatchReviewScreen.tsx`, `app/api/import/classify`):
  separar várias peças na mesma foto é conectividade de pixel, não só distância de cor.
  `findIslands` usa a mesma `computeAlphaMask` de sempre pra decidir fundo e frente, e
  soma busca de componente conectado (preenchimento por vizinhança, pilha explícita) pra
  saber quais pixels de frente pertencem à mesma peça; duas peças encostadas sem espaço
  nenhum entre si viram uma ilha só, é o próprio significado de componente conectado. O
  alfa de cada ilha é um array novo do tamanho da própria caixa, não um pedaço do array
  compartilhado, porque a caixa de duas peças vizinhas pode se sobrepor um pouco mesmo
  sem elas se tocarem; sem isolar assim, o canto de uma peça vazaria colado na vizinha.
  Mesma folga da Fase 3: até 6 peças numa foto de 800px, o recorte inteiro processa em
  dezenas de milissegundos, então continua sem Web Worker. `BatchReviewScreen` é
  autocontida como `AddItemScreen`: recebe os arquivos escolhidos e resolve sozinha o
  recorte, a classificação em lote pela IA (`/api/import/classify`, mesma validação de
  vocabulário da rota de link, sem `bestImage` porque cada foto já é uma peça diferente)
  e a edição de cada candidato, sem `KclosetApp` precisar saber de nada disso. Editar um
  candidato reaproveita o próprio `AddItemScreen` (`initialDraft`, `initialPhoto`), montado
  com `key` do índice pra cada edição nascer limpa, sem UI paralela pra duplicar campo.
  Card de baixa confiança (contorno vermelho) é caixa encostando na borda da foto original
  ou pixel visível de menos dentro da própria caixa, sem precisar de IA pra desconfiar.
- **Fotos das peças** (`lib/image.ts`): a imagem escolhida é redesenhada num `canvas`
  para no máximo 800px no lado maior e exportada em PNG (preserva transparência,
  o que o recorte de fundo do cadastro em lote vai precisar). A proporção real da
  imagem é devolvida junto: é o que faz a peça aparecer inteira no Espelho, em vez de
  espremida num quadro fixo (`garmentAspect` em `GarmentView.tsx`).
- **Contas e nuvem** (`lib/supabase.ts`, `lib/cloud.ts`): projeto Supabase próprio
  do Kloset. Cinco tabelas (`profiles`, `items`, `looks`, `boards`, `favorites`),
  todas com RLS `user_id = auth.uid()` em select, insert, update e delete, e um
  bucket privado `photos` com uma pasta por usuária. O id da peça continua sendo
  texto gerado no cliente, com chave primária composta `(user_id, id)`: é isso que
  faz a migração do closet local ser cópia direta, sem reescrever id em cascata, e
  que impede duas usuárias de colidirem. `lib/cloud.ts` tem uma função por operação
  em vez de um "salvar tudo", porque reescrever o estado inteiro a cada toque
  funciona em `localStorage` e não funciona em banco. A tela responde na hora e a
  gravação vai atrás; se falhar, a usuária é avisada em vez de achar que salvou.
  Login é só Google, sem `@supabase/ssr` nem rota de callback: o app já é uma
  árvore client-side abaixo de `KclosetApp`, então o próprio cliente fecha o fluxo
  PKCE quando o Google devolve pra "/". O service worker não precisou mudar, porque
  já ignora tudo que não é a própria origem.
- **Migração do closet local** (`lib/migrate-local.ts`): o app rodou meses guardando
  tudo só no aparelho, então tem closet real nesse formato. Na primeira entrada ele
  sobe inteiro, peça por peça, com a foto indo do IndexedDB pro Storage, e a tela
  mostra o progresso. Toda escrita é upsert, então uma tentativa interrompida no
  meio recomeça sem duplicar; a marca de "já subi" só é gravada no fim; e o dado
  local nunca é apagado sozinho, fica como rede de segurança. A marca é uma chave
  só (`kloset:local-claim`, não uma por usuária) de propósito: o closet pré-conta
  tem um dono, a primeira pessoa que entrar, senão a segunda pessoa a usar aquele
  navegador receberia o closet da primeira dentro da conta dela.
- **Cache local** (`lib/storage.ts`, `lib/photo-store.ts`): os dois módulos que eram
  a casa do dado viraram o cache dele, quase sem mudar. Metadado numa chave de
  `localStorage` por usuária (`kloset:cache:<id>`, sem o campo `photo` dentro do
  JSON) e foto em IndexedDB como `Blob`, porque um closet de tamanho real não cabe
  em base64 na cota de 5MB (o Stylebook mede ~100KB por peça, e na casa de 25 peças
  o `localStorage` sozinho já estoura). Com isso o app abre mostrando o último
  closet conhecido antes da nuvem responder, e continua abrindo sem rede. Sair da
  conta limpa os dois, pra foto de uma pessoa não ficar no aparelho da próxima. A
  cadeia de formatos antigos (`kcloset:v2` com a foto embutida no JSON, `kcloset:v1`
  com seis categorias) continua sendo lida, porque é dela que a migração parte.
- **Apagar conta** (`supabase/functions/delete-account`): o navegador apaga as
  próprias linhas e as próprias fotos, mas não consegue apagar o usuário em si,
  que exige chave de serviço. A Edge Function faz essa parte, e apaga só quem
  pediu: o id sai do token apresentado, nunca do corpo da requisição. O resto vem
  junto pelo `on delete cascade` do schema.
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

Next.js 15 (App Router) · TypeScript · Tailwind CSS · lucide-react ·
@supabase/supabase-js · @anthropic-ai/sdk
