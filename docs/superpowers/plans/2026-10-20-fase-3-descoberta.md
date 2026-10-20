# BicoJá — Fase 3: Descoberta (endereço, pedidos, anúncios, disponibilidade, perfil público, Início do prestador) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cliente salva o endereço, publica pedido normal (com "quando" flexível) ou urgente com fotos; prestador cria anúncios com fotos, liga "Estou disponível agora" e vê pedidos perto dele em abas "Urgentes" / "Pedidos"; todos veem o perfil público do prestador e a página do anúncio; a Tela Inicial e a Busca passam a usar categoria salva, disponibilidade e distância.

**Architecture:** Mesmo padrão da Fase 2: serviços em `lib/<area>/*.ts` recebendo `prisma` (testados contra o banco de teste), rotas finas em `app/api/*` (sessão + zod + rate limit), telas em `app/(app)/*`. Distância calculada no Postgres com `ST_DistanceSphere(ST_MakePoint(lng, lat), ST_MakePoint($lng, $lat))` sobre as colunas `latitude/longitude` (sem coluna geometry nova). Imagens de pedido/anúncio reutilizam o pipeline `sharp` da foto de perfil, generalizado.

**Tech Stack:** igual à Fase 2 (Next.js 15, Prisma/PostGIS, Redis, zod, sharp, Vitest).

**Spec:** `docs/superpowers/specs/2026-10-19-bicoja-frontend-design.md` (§8 telas, §9 modelo, §14 localização). Rascunho aprovado: `.superpowers/brainstorm/.../fase3-v2.html`.

## Global Constraints

- Tudo das Fases 1 e 2 continua valendo (tokens, 17px, toque 48px, ícone com texto, contraste AA, `outline-foco`, nada de sessão em `localStorage`, textos simples).
- Endereço digitado à mão: rua (2–100), número (1–10), complemento (opcional, ≤ 60), bairro (2–60), cidade (2–60). Geocodifica `"<rua>, <número>, <bairro>, <cidade>"`; se falhar, tenta `"<bairro>, <cidade>"`; se falhar de novo, erro no campo `bairro`.
- **Privacidade:** para prestadores e visitantes, um pedido expõe só categoria, descrição, fotos, quando, **bairro, cidade e distância** — nunca rua, número, complemento, latitude/longitude exatas, email ou telefone do cliente. Perfil público e anúncio nunca expõem email/telefone.
- Pedido: descrição 10–500; até **3** fotos. Anúncio: título 5–80, descrição 10–800, preço 0–100000 (opcional = "combinar"), até **5** fotos.
- Quando: `DIA_CERTO` (data obrigatória, não no passado), `ENTRE_DIAS` (início ≤ fim, fim não no passado, no máximo 60 dias de janela), `QUALQUER_DIA`; horário opcional `"HH:MM"`, início < fim.
- Urgente: `urgenteAte = criação + 3 h`; aba "Urgentes" = `urgente && urgenteAte > agora`; depois disso aparece na aba "Pedidos".
- Disponível: ligar grava `disponivelAte = agora + 8 h`; "disponível de verdade" = `disponivel && disponivelAte > agora`.
- Imagens de pedido/anúncio: JPG/PNG/WEBP ≤ 5 MB, regravadas em WEBP com lado maior ≤ 1280 px (`fit: "inside"`), sem EXIF; salvas em `uploads/pedidos/` e `uploads/anuncios/`; URL `/api/arquivos/<pasta>/<uuid>.webp`.
- Rate limit: criar pedido 10/h por conta; criar/editar anúncio 30/h; enviar imagem 30/10 min; disponibilidade 30/10 min; endereço 10/10 min.
- "Conversar" e "Quero atender" mostram "Em breve" (chat é Fase 4). Avaliações: seção só aparece se existir alguma (Fase 5).
- Não mexer nas rotas antigas do amigo (`/api/servicos`, `/api/propostas`); só acrescentar campos ao modelo `Servico`.

## Review Focus

1. **Prestador tenta ver rua/número do cliente** (pela lista, pela página do pedido ou pela resposta JSON) → nunca recebe. Teste na Task 4 (os `select` não incluem os campos) e Task 8.
2. **Pedido urgente com mais de 3 horas** → sai da aba "Urgentes" e aparece em "Pedidos", sem sumir. Teste na Task 4.
3. **Endereço que o mapa não acha, ou serviço do Nominatim fora do ar** → mensagem amigável no campo bairro, nada salvo pela metade. Teste na Task 3.
4. **Prestador sem perfil (cliente comum) abre `/prestador` ou cria anúncio pela API** → é levado ao "Quero fazer bicos"; API responde 403. Teste na Task 5 e Task 9.
5. **Datas estranhas no "quando"** (fim antes do início, dia no passado, janela de 6 meses, hora "25:99") → erro claro no campo certo. Teste na Task 4.

---

### Task 1: Modelos novos e campos de anúncio

**Files:**
- Modify: `Prisma/schema.prisma`; Create: `Prisma/migrations/20261020200000_descoberta_fase3/migration.sql` (gerada com `migrate diff --from-schema-datasource`, aplicada com `migrate deploy`, como na Fase 2; parar o servidor dev antes do `prisma generate`)
- Test: `lib/pedidos/__tests__/banco.int.test.ts`

**Interfaces:**
- Produces (schema):
  - `model EnderecoUsuario { id String @id @default(uuid()); userId String @unique; rua String; numero String; complemento String?; bairro String; cidade String; latitude Float; longitude Float; updatedAt DateTime @updatedAt; user User @relation(..., onDelete: Cascade) }`
  - `enum TipoQuando { DIA_CERTO ENTRE_DIAS QUALQUER_DIA }`, `enum StatusPedido { ABERTO FECHADO CANCELADO }`
  - `model Pedido { id; clienteId; categoria String; descricao String; fotos String[] @default([]); urgente Boolean @default(false); urgenteAte DateTime?; quandoTipo TipoQuando; dataInicio DateTime? @db.Date; dataFim DateTime? @db.Date; horaInicio String?; horaFim String?; rua; numero; complemento String?; bairro; cidade; latitude Float; longitude Float; status StatusPedido @default(ABERTO); createdAt; updatedAt; cliente User @relation("PedidosCliente", ..., onDelete: Cascade); @@index([status, categoria]) }`
  - `Servico` + `categoria String @default("outros")`, `ativo Boolean @default(true)`, `fotos String[] @default([])`, `updatedAt DateTime @default(now()) @updatedAt`.
  - `PerfilPrestador` + `disponivelAte DateTime?`.

- [ ] **Step 1: Teste que falha** — cria `EnderecoUsuario` (único por usuário: segundo create → `P2002`), `Pedido` urgente com `fotos` e cascade ao apagar o usuário; `Servico` novo nasce com `categoria "outros"`, `ativo true`, `fotos []`.
- [ ] **Step 2:** `npm run test:integracao -- pedidos` → FAIL.
- [ ] **Step 3:** Alterar schema, gerar/aplicar migração (dev e teste), `prisma generate`; conferir `migrate diff --exit-code` = 0.
- [ ] **Step 4:** testes → PASS.
- [ ] **Step 5: Commit** — `feat: modelos de endereço, pedidos e campos de anúncio`.

### Task 2: Imagens de pedidos e anúncios

**Files:**
- Modify: `lib/contas/foto.ts` → mover o núcleo para `lib/imagens.ts`; `lib/contas/foto.ts` passa a usar `lib/imagens.ts` (comportamento da Fase 2 igual)
- Create: `app/api/arquivos/imagens/route.ts` (POST), `app/api/arquivos/[pasta]/[nome]/route.ts` (GET; substitui `app/api/arquivos/fotos/[nome]/route.ts`, mesmas URLs continuam funcionando)
- Test: `lib/__tests__/imagens.test.ts`, `lib/__tests__/imagens.int.test.ts`

**Interfaces:**
- Produces (`lib/imagens.ts`):
  - `type PastaImagem = "fotos" | "pedidos" | "anuncios"`.
  - `processarImagem(bytes: Buffer, modo: "avatar" | "galeria"): Promise<{ ok: true; webp: Buffer } | { ok: false; erro: string }>` — avatar = 512×512 `cover` (como hoje); galeria = `resize(1280, 1280, { fit: "inside", withoutEnlargement: true })`; mesmas mensagens de erro da Fase 2.
  - `salvarImagem(pasta: PastaImagem, webp: Buffer): Promise<string>` → URL `/api/arquivos/<pasta>/<uuid>.webp`.
  - `caminhoDaImagem(pasta: string, nome: string): string | null` — pasta fora da lista ou nome fora de `/^[0-9a-f-]{36}\.webp$/` → `null`.
  - `urlDeImagemValida(url: string, pasta: PastaImagem): boolean` — casa o padrão **e** o arquivo existe.
  - `apagarImagem(url: string): Promise<void>` (ignora se não existir).
- `POST /api/arquivos/imagens?pasta=pedidos|anuncios` (sessão; campo `imagem`; 200 `{ ok, url }`).

- [ ] **Step 1: Testes que falham:** galeria 3000×1000 vira largura 1280 e altura ~427 (proporção mantida), sem EXIF; imagem 400×300 em galeria não aumenta; `caminhoDaImagem("../x", "a.webp")` e `caminhoDaImagem("pedidos", "../../.env")` → `null`; integração: `salvarImagem("pedidos", ...)` cria arquivo e `urlDeImagemValida(url, "pedidos")` → true, com pasta errada → false, URL de arquivo inexistente → false; testes de foto da Fase 2 continuam passando.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar; apagar a rota antiga `app/api/arquivos/fotos/[nome]` (a nova `[pasta]/[nome]` cobre `fotos`).
- [ ] **Step 4:** `npm test` + `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `feat: imagens de pedidos e anúncios reaproveitando a proteção das fotos`.

### Task 3: Meu endereço

**Files:**
- Create: `lib/enderecos.ts`, `app/api/contas/endereco/route.ts` (GET/PUT), `components/endereco/FormEndereco.tsx`
- Modify: `lib/contas/esquemas.ts` (+ `esquemaEndereco`), `app/(app)/perfil/page.tsx` (seção "Meu endereço")
- Test: `lib/__tests__/enderecos.int.test.ts`, `components/endereco/__tests__/FormEndereco.test.tsx`

**Interfaces:**
- Produces:
  - `esquemaEndereco` (valores da Global Constraints; trim).
  - `type EnderecoCompleto = { rua; numero; complemento: string | null; bairro; cidade; latitude: number; longitude: number }`.
  - `geocodificarEndereco(e: { rua; numero; bairro; cidade }): Promise<{ latitude; longitude } | null>` — tenta endereço completo, depois bairro+cidade (usa `geocodeEndereco` de `lib/maps`).
  - `salvarEndereco(prisma, userId, dados): Promise<{ ok: true; endereco: EnderecoCompleto } | { ok: false; campo: "bairro"; erro: string }>` (upsert).
  - `enderecoDoUsuario(prisma, userId): Promise<EnderecoCompleto | null>`.
  - `FormEndereco({ inicial?: Partial<EnderecoCompleto>; textoBotao: string; onSalvo: (e: EnderecoCompleto) => void })` — campos com `autoComplete` (`address-line1`, `address-line2`, `address-level3`, `address-level2`), cidade padrão "Belém", número com `inputMode="numeric"`; mostra o erro do servidor no campo.
  - Perfil ganha "Meu endereço": mostra `Rua, nº · Bairro` + "Mudar endereço"; sem endereço mostra o formulário com "Salvar endereço".

- [ ] **Step 1: Testes que falham:** `geocodeEndereco` mockado — completo falha e bairro acha → salva com as coordenadas do bairro; os dois falham → `{ ok:false, campo:"bairro", erro:"Não achamos esse endereço. Confira o bairro e a cidade." }` e nada é salvo; `geocodeEndereco` lança erro (serviço fora do ar) → mesmo erro amigável; salvar de novo atualiza (1 registro só). `FormEndereco` tem rótulos "Rua", "Número", "Complemento (opcional)", "Bairro", "Cidade" e cidade "Belém" pré-preenchida.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** testes → PASS.
- [ ] **Step 5: Commit** — `feat: meu endereço salvo no perfil`.

### Task 4: Pedidos (serviço e rotas)

**Files:**
- Create: `lib/pedidos/esquemas.ts`, `lib/pedidos/pedidos.ts`, `app/api/pedidos/route.ts` (POST criar, GET meus), `app/api/pedidos/[id]/route.ts` (GET detalhe, PATCH cancelar)
- Test: `lib/pedidos/__tests__/esquemas.test.ts`, `lib/pedidos/__tests__/pedidos.int.test.ts`

**Interfaces:**
- Produces:
  - `esquemaPedido` (zod): `{ categoria: CategoriaId; descricao: 10–500; fotos: string[] (0–3); urgente: boolean; quando: { tipo: "DIA_CERTO" | "ENTRE_DIAS" | "QUALQUER_DIA"; dataInicio?: "AAAA-MM-DD"; dataFim?: "AAAA-MM-DD"; horaInicio?: "HH:MM"; horaFim?: "HH:MM" } }`; regras da Global Constraints com `path` no campo certo (`["quando","dataFim"]` etc.); urgente força `quando.tipo = "QUALQUER_DIA"`; recebe `hoje` (para testar) via `criarEsquemaPedido(hoje: Date)`.
  - `criarPedido(prisma, clienteId, dados, agora = new Date()): Promise<{ ok: true; id: string } | { ok: false; campo: string; erro: string }>` — exige endereço salvo (`{campo:"endereco", erro:"Salve seu endereço primeiro."}`), copia o endereço para o pedido, valida fotos com `urlDeImagemValida(url,"pedidos")`, urgente → `urgenteAte = agora + 3h`.
  - `type PedidoParaPrestador = { id; categoria; descricao; fotos; urgente: boolean /* ainda na janela */; quandoTipo; dataInicio; dataFim; horaInicio; horaFim; bairro; cidade; distanciaKm: number; createdAt; cliente: { nome: string /* só primeiro nome */; foto: string | null } }`.
  - `pedidosParaPrestador(prisma, prestadorId, aba: "urgentes" | "pedidos", agora = new Date()): Promise<PedidoParaPrestador[]>` — `$queryRaw` com: status ABERTO, `categoria = ANY(perfil.categorias)`, distância ≤ `perfil.raioKm`, cliente ≠ prestador; urgentes = `urgente AND "urgenteAte" > agora` ordenado por `createdAt DESC`; pedidos = o resto, ordenado por distância e depois `createdAt DESC`; `LIMIT 50`. **O SQL não seleciona rua, número, complemento, latitude, longitude, email, telefone.**
  - `contarUrgentes(prisma, prestadorId, agora)` → número para o contador da aba.
  - `meusPedidos(prisma, clienteId)` (tudo do próprio pedido, incluindo `urgenteAgora: boolean`), `detalhePedido(prisma, id, quemVe: { userId?: string })` → dono vê tudo; outros veem o formato `PedidoParaPrestador` (com distância só se `quemVe` tiver perfil de prestador ou endereço); `cancelarPedido(prisma, id, clienteId)` → só o dono, só se ABERTO.
  - Rotas: `POST /api/pedidos` (sessão + 10/h), `GET /api/pedidos` (meus), `GET /api/pedidos/[id]`, `PATCH /api/pedidos/[id]` `{ acao: "cancelar" }` (403 se não for dono).

- [ ] **Step 1: Testes que falham:**
  - Esquema (com `hoje = 2026-10-20`): `ENTRE_DIAS` 23/10→20/10 → erro em `["quando","dataFim"]` "A data final vem depois da inicial."; `DIA_CERTO` 19/10 → "Escolha hoje ou um dia depois."; janela 20/10→30/12 → "Escolha um período de até 60 dias."; `horaInicio "25:99"` → erro de hora; `horaInicio 18:00, horaFim 08:00` → "O horário final vem depois do inicial."; descrição de 5 letras → erro em `descricao`; 4 fotos → erro em `fotos`.
  - Integração (geocode mockado; prestador com perfil em `-1.4300,-48.4700`, raio 10 km, categorias `["encanamento"]`):
    - sem endereço salvo → `{campo:"endereco"}`;
    - pedido de encanamento a ~1 km aparece em `pedidos`; pedido de pintura não aparece; pedido a ~30 km não aparece; pedido do próprio prestador não aparece;
    - urgente criado agora aparece em `urgentes` e **não** em `pedidos`; o mesmo com `agora + 3h01` aparece em `pedidos` e não em `urgentes`;
    - `Object.keys` do item de `pedidosParaPrestador` **não** contém `rua`, `numero`, `complemento`, `latitude`, `longitude`; `cliente.nome` é só o primeiro nome;
    - `detalhePedido` visto por outro usuário não tem `rua`; visto pelo dono tem;
    - `cancelarPedido` por outro usuário → `{ok:false}`; pelo dono → status CANCELADO e some da lista do prestador;
    - foto com URL inventada (`/api/arquivos/pedidos/<uuid>.webp` inexistente) → erro no campo `fotos`.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar (distância: `ST_DistanceSphere(ST_MakePoint(p.longitude, p.latitude), ST_MakePoint(${lng}, ${lat})) / 1000`).
- [ ] **Step 4:** testes → PASS.
- [ ] **Step 5: Commit** — `feat: pedidos normal e urgente com privacidade do endereço`.

### Task 5: Anúncios do prestador (serviço e rotas)

**Files:**
- Create: `lib/anuncios/esquemas.ts`, `lib/anuncios/anuncios.ts`, `app/api/anuncios/route.ts` (POST criar, GET meus), `app/api/anuncios/[id]/route.ts` (PATCH editar/pausar/ativar)
- Test: `lib/anuncios/__tests__/anuncios.int.test.ts`

**Interfaces:**
- Produces:
  - `esquemaAnuncio`: `{ titulo 5–80; categoria: CategoriaId; descricao 10–800; preco?: 0–100000; fotos: string[] (0–5) }`.
  - `criarAnuncio(prisma, prestadorId, dados)` → exige `PerfilPrestador` (`{ ok:false, semPerfil:true }`); categoria precisa estar nas categorias do perfil (`campo:"categoria"`, "Essa categoria não está no seu perfil. Mude em 'Mudar o que eu faço'."); lat/lng copiadas do perfil; `preco` ausente grava `0` e o anúncio mostra "Preço a combinar" (ruling: `Servico.preco` é obrigatório no modelo do amigo); fotos validadas com `urlDeImagemValida(url,"anuncios")`; também grava `localizacao` com `ST_SetSRID(ST_MakePoint(lng,lat),4326)` como a rota do amigo faz, para a busca geográfica antiga continuar funcionando.
  - `editarAnuncio(prisma, id, prestadorId, dados | { ativo: boolean })` → só o dono; fotos removidas são apagadas do disco.
  - `meusAnuncios(prisma, prestadorId)`; `anuncioPublico(prisma, id)` → `{ id, titulo, categoria, descricao, preco, fotos, prestador: { id, nome, foto, bairro, cidade, disponivelAgora } } | null` (só `ativo`; **sem email/telefone**).
  - Rotas: 403 com `semPerfil:true` quando não há perfil; 404 para anúncio de outro dono no PATCH.

- [ ] **Step 1: Testes que falham:** cliente sem perfil → `semPerfil`; categoria fora do perfil → erro no campo; criação copia lat/lng do perfil e `ativo=true`; sem preço grava 0; editar anúncio de outro → `{ok:false}`; pausar → `anuncioPublico` devolve `null`; `anuncioPublico` não tem `email`/`telefone` em nenhum nível (checar `JSON.stringify`).
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5: Commit** — `feat: anúncios do prestador com fotos e pausa`.

### Task 6: "Estou disponível agora" e quem está disponível

**Files:**
- Create: `lib/prestadores.ts`, `app/api/prestador/disponivel/route.ts` (PATCH `{ ligado: boolean }`)
- Test: `lib/__tests__/prestadores.int.test.ts`

**Interfaces:**
- Produces:
  - `mudarDisponibilidade(prisma, userId, ligado: boolean, agora = new Date())` → `{ ok: true; disponivelAte: Date | null } | { ok: false; semPerfil: true }`; ligar = `agora + 8h`.
  - `estaDisponivel(p: { disponivel: boolean; disponivelAte: Date | null }, agora = new Date()): boolean`.
  - `type PrestadorResumo = { id; nome; foto; categorias: CategoriaId[]; bairro; cidade; precoBase: number | null; distanciaKm: number | null; disponivelAgora: boolean }`.
  - `prestadoresDisponiveis(prisma, perto: { latitude; longitude } | null, limite: number, agora = new Date())` → só disponíveis de verdade; com `perto`: dentro do `raioKm` de cada prestador, ordenados por distância; sem `perto`: mais recentes no sinal (`disponivelAte DESC`), `distanciaKm: null`.
  - `perfilPublico(prisma, prestadorId)` → `{ id, nome, foto, membroDesde, bairro, cidade, raioKm, categorias, bio, disponivelAgora, anuncios: anúncios ativos (formato de `anuncioPublico` sem o bloco prestador) } | null` — sem email/telefone.

- [ ] **Step 1: Testes que falham:** ligar grava `disponivelAte` = agora+8h; com `agora + 8h01` o prestador some de `prestadoresDisponiveis`; desligar some na hora; cliente sem perfil → `semPerfil`; com `perto` a 25 km e raio 10 → não aparece; dois prestadores a 1 e 3 km → ordem por distância; `perfilPublico` sem email/telefone e só com anúncios ativos.
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5: Commit** — `feat: estou disponível agora (desliga em 8 horas)`.

### Task 7: Tela Inicial e Busca com categoria, disponibilidade e distância

**Files:**
- Modify: `lib/servicos.ts` (`buscarServicos` usa `categoria` salva + texto; só `ativo`; distância quando houver `perto`), `components/inicio/SecaoDisponiveis.tsx` (mostra `PrestadorResumo`, link `/prestadores/[id]`), `components/ui/CartaoServico.tsx` (aceita "Preço a combinar" quando preço 0/null), `app/(app)/page.tsx`, `app/(app)/buscar/page.tsx`
- Test: atualizar `lib/__tests__/servicos.test.ts` e `components/inicio/__tests__/inicio.test.tsx`

**Interfaces:**
- Consumes: `prestadoresDisponiveis`, `enderecoDoUsuario`.
- Produces: `ServicoResumo` ganha `categoria`, `fotos`, `distanciaKm: number | null`; `buscarServicos({ texto?, categoria?, perto? }, limite)`; Tela Inicial: "Disponíveis agora" = até 6 `prestadoresDisponiveis(endereço do cliente ou null)`; vazio → `EstadoVazio` "Ninguém disponível agora" + "Publicar meu pedido"; abaixo, nova seção "Anúncios perto de você" com 6 `buscarServicos({ perto }, 6)`.

- [ ] **Step 1: Testes que falham:** `buscarServicos({ categoria: "encanamento" })` pede `where.categoria = "encanamento"` e `ativo: true`; texto ainda usa o dicionário (teste antigo "pia vazando" passa usando a categoria salva); `CartaoServico` com `precoAPartirDe={0}` mostra "Preço a combinar"; `SecaoDisponiveis` com prestador mostra o link `/prestadores/<id>` e "Disponível agora".
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: tela inicial com disponíveis agora e busca por categoria`.

### Task 8: Telas do cliente — publicar pedido, urgente, meus pedidos

**Files:**
- Create: `components/pedidos/SeletorCategoria.tsx`, `components/pedidos/SeletorQuando.tsx`, `components/pedidos/EnviarImagens.tsx`, `components/pedidos/FormPedido.tsx` (variante `urgente`), `components/pedidos/CartaoPedido.tsx`, `app/(app)/pedidos/page.tsx`, `app/(app)/pedidos/novo/page.tsx`, `app/(app)/pedidos/urgente/page.tsx`, `app/(app)/pedidos/[id]/page.tsx`
- Test: `components/pedidos/__tests__/*.test.tsx`

**Interfaces:**
- Produces:
  - `SeletorCategoria({ valor, onChange, erro? })` — chips em `radiogroup` com as 9 categorias.
  - `SeletorQuando({ valor, onChange, erros? })` — segmento "Dia certo · Entre dias · Qualquer dia" (`radiogroup`), inputs `type="date"` (min = hoje) e `type="time"` opcionais com rótulos visíveis.
  - `EnviarImagens({ pasta: "pedidos" | "anuncios"; maximo: number; valor: string[]; onChange })` — botão "Adicionar foto" (some ao atingir o máximo), miniaturas com botão "Remover foto N", envia cada uma para `/api/arquivos/imagens`, mostra erro amigável por foto.
  - `FormPedido({ urgente: boolean; endereco: EnderecoCompleto | null })` — sem endereço mostra `FormEndereco` primeiro; urgente esconde `SeletorQuando` e usa vermelho; envia para `POST /api/pedidos` e vai para `/pedidos/<id>?novo=1` (urgente → mensagem "Avisamos quem está perto").
  - `/pedidos` (Meus pedidos): abertos primeiro; selo "Urgente" (enquanto na janela) / "Aberto" / "Fechado" / "Cancelado"; vazio → "Você ainda não publicou pedidos" + botões normal/urgente.
  - `/pedidos/[id]`: dono vê tudo + "Cancelar pedido" (confirmação em duas etapas: "Cancelar pedido" → "Sim, cancelar"); prestador vê a versão sem endereço + "Quero atender" (Em breve).
- [ ] **Step 1: Testes que falham:** `SeletorQuando` troca para "Entre dias" e mostra dois campos de data com rótulos "De" e "Até"; `EnviarImagens` com `maximo=3` e 3 valores esconde "Adicionar foto" e mostra 3 "Remover foto"; `CartaoPedido` urgente mostra selo "Urgente" vermelho.
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5: Verificação no navegador** (375 px, claro/escuro): salvar endereço, publicar pedido "entre dias" com 1 foto, publicar urgente, ver em "Meus pedidos", cancelar.
- [ ] **Step 6: Commit** — `feat: telas de publicar pedido, urgente e meus pedidos`.

### Task 9: Telas do prestador — Início, anúncios

**Files:**
- Create: `lib/prestador-pagina.ts` (`exigirPrestador(): Promise<{ userId; perfil }>` que faz `redirect("/quero-fazer-bicos")` sem perfil), `components/prestador/InterruptorDisponivel.tsx`, `components/prestador/AbasPedidos.tsx`, `components/prestador/FormAnuncio.tsx`, `app/(app)/prestador/page.tsx`, `app/(app)/prestador/anuncios/page.tsx`, `app/(app)/prestador/anuncios/novo/page.tsx`, `app/(app)/prestador/anuncios/[id]/page.tsx`, `app/(app)/prestador/servicos/page.tsx` e `app/(app)/prestador/ganhos/page.tsx` (só "Em breve: aqui vão aparecer…")
- Modify: `components/perfil/TrocarModo.tsx` (trocar para prestador → `/prestador`), `app/(app)/quero-fazer-bicos/page.tsx` (ao terminar → `/prestador`)
- Test: `components/prestador/__tests__/*.test.tsx`

**Interfaces:**
- Produces:
  - `InterruptorDisponivel({ ligado: boolean; ate: string | null })` — `role="switch"`, `aria-checked`, texto "Estou disponível agora" + "Desliga sozinho às HH:MM" quando ligado; chama `PATCH /api/prestador/disponivel`.
  - `AbasPedidos({ urgentes: PedidoParaPrestador[]; pedidos: PedidoParaPrestador[] })` — `tablist` com "Urgentes" (contador) e "Pedidos"; começa em "Urgentes" se houver algum, senão "Pedidos"; vazio de cada aba com texto próprio ("Nenhum pedido urgente perto agora").
  - Início do prestador: saudação, `InterruptorDisponivel`, `AbasPedidos`, atalho "Meus anúncios (N ativos)".
  - Anúncios: lista com "Pausar"/"Ativar" e "Editar"; `FormAnuncio` (título, `SeletorCategoria` limitado às categorias do perfil, descrição, `EnviarImagens` máx. 5, preço com "Prefiro combinar").
- [ ] **Step 1: Testes que falham:** `InterruptorDisponivel` ligado tem `aria-checked="true"` e mostra "Desliga sozinho às 18:40" para `ate` = 18:40 local; `AbasPedidos` com 2 urgentes começa na aba Urgentes com contador "2" e trocar de aba mostra os normais.
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5: Verificação no navegador:** cliente comum abrindo `/prestador` vai para "Quero fazer bicos"; prestador liga disponível, vê o pedido urgente do cliente (Task 8) em "Urgentes", cria anúncio com foto, pausa e reativa.
- [ ] **Step 6: Commit** — `feat: início do prestador com abas e anúncios`.

### Task 10: Páginas públicas — perfil do prestador e anúncio

**Files:**
- Create: `app/(app)/prestadores/[id]/page.tsx`, `app/(app)/servicos/[id]/page.tsx`, `components/publico/GaleriaFotos.tsx`, `components/publico/BotaoConversar.tsx` (desabilitado com "Conversar (em breve)")
- Test: `components/publico/__tests__/GaleriaFotos.test.tsx`

**Interfaces:**
- Consumes: `perfilPublico`, `anuncioPublico`.
- Produces: perfil público como no rascunho (foto, nome, "Disponível agora", região/raio, "no BicoJá desde", bio, anúncios ativos, botão conversar); seção "O que dizem" só se houver avaliações (Fase 5 — por enquanto não renderiza). Página do anúncio: galeria, título, preço ("a partir de" ou "Preço a combinar"), descrição, cartão do prestador com link para o perfil. Inexistente/pausado → `notFound()` com página 404 amigável (`app/not-found.tsx`: "Não achamos essa página" + "Voltar ao início").
  - `GaleriaFotos({ fotos: string[]; titulo: string })` — rolagem horizontal com `scroll-snap`, cada foto com `alt` "Foto N de <titulo>", sem fotos não renderiza nada.
- [ ] **Step 1: Teste que falha:** `GaleriaFotos` com 2 fotos tem 2 imagens com `alt` "Foto 1 de Conserto" e "Foto 2 de Conserto"; sem fotos → container vazio.
- [ ] **Step 2:** → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5:** Navegador: da Tela Inicial → "Disponíveis agora" → perfil público → anúncio; nenhum email/telefone na página (buscar `@` e o celular no HTML).
- [ ] **Step 6: Commit** — `feat: perfil público do prestador e página do anúncio`.

### Task 11: Verificação final

- [ ] **Step 1:** Atualizar `scripts/dados-teste.mjs`: categorias nos serviços de exemplo, `PerfilPrestador` (com `disponivel` ligado por 8 h) para os prestadores de exemplo, endereço para a conta de teste.
- [ ] **Step 2:** `npm test`, `npm run test:integracao`, `npx tsc --noEmit`, `npm run build` (servidor dev parado) → verdes.
- [ ] **Step 3:** Teclado e leitor de tela nas telas novas (abas, interruptor, seletor de quando).
- [ ] **Step 4:** Mostrar ao Kazuo e anotar ajustes.
