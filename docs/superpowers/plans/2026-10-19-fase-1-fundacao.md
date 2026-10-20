# BicoJá — Fase 1: Fundação e Tela Inicial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o projeto rodando com o visual novo (cores, fonte, tema claro/escuro, componentes base, menu inferior, PWA, cabeçalhos de segurança) e a Tela Inicial + Busca funcionando com os serviços reais do banco.

**Architecture:** Next.js 15 App Router rodando pelo `server.js` existente. Design system em tokens CSS (Tailwind v4 `@theme`) com variantes claro/escuro por classe no `<html>`. Componentes de interface pequenos em `components/ui/`, peças de layout em `components/layout/`, regras puras (categorias, busca, contraste) em `lib/` com testes Vitest.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, `lucide-react`, `zod`, `motion`, Vitest + Testing Library (jsdom), Prisma/PostgreSQL+PostGIS, Redis.

**Spec:** `docs/superpowers/specs/2026-10-19-bicoja-frontend-design.md`

### Roteiro de fases (cada uma com seu próprio plano, escrito quando a anterior terminar)

1. **Fundação e Tela Inicial** ← este plano
2. Contas: cadastro em etapas, código por email, CPF + foto, login, "Termine seu cadastro", modos, "Quero fazer bicos", Perfil
3. Descoberta: anúncios do prestador, pedidos (normal com janela flexível + urgente), perfil público, Início do prestador (abas Urgentes/Pedidos), "Estou disponível", localização
4. Chat: socket autenticado, conversas, mensagens com foto, cartão de proposta (Aceitar/Negociar/Recusar), bolha flutuante
5. Contrato: pagamento simulado com valor retido + taxa 0%, código de conclusão, cancelamento e prazos 3/7 dias com avisos, avaliações, Ganhos, notificações
6. Polimento: PWA offline, auditoria de acessibilidade, testes ponta a ponta, explicação do back end + lista de pendências para o amigo

## Global Constraints

- Idioma da interface e dos nomes no código: português (como o resto do projeto).
- Fonte Nunito; texto base **17px**; títulos 22–26px; nada abaixo de **14px**.
- Cores: laranja marca `#E8770C`; laranja texto/botão `#C25E05` e `#9A4A06`; laranja-claro `#FFF4E8`; cinza-azulado `#5E7889`; grafite `#2B3640`/`#1F2937`; vermelho `#DC2626` só urgência/erro; verde `#16A34A` online/sucesso; fundo branco.
- Contraste WCAG AA (≥ 4.5:1 texto normal, ≥ 3:1 texto ≥ 24px ou ≥ 19px negrito) nos temas claro **e** escuro.
- Área de toque mínima 48×48px. Todo ícone acompanhado de texto. Todo campo com rótulo visível.
- Transições 150–250ms; respeitar `prefers-reduced-motion`.
- Nada de sessão/dados de usuário em `localStorage` (só a preferência de tema).
- Proibido `dangerouslySetInnerHTML` com conteúdo de usuário.
- Logo: a original do Kazuo (`public/logo.png`), sem redesenho.
- Não apagar modelos/rotas existentes do back end.

## Review Focus

1. **Lista vazia** (banco sem serviços) → Início e Busca mostram um estado vazio amigável com ação ("Publique seu pedido"), nunca seção em branco. Teste na Task 6.
2. **Redis ou banco fora do ar** → a Tela Inicial ainda abre, com aviso "Não conseguimos carregar agora. Tente de novo." e botão de tentar novamente. Teste na Task 6.
3. **Textos longos** (nome de prestador ou título de serviço com 80+ caracteres) → cortam com reticências em 2 linhas, sem quebrar o layout. Teste na Task 3 (`Cartao`).
4. **Busca estranha** (vazia, só espaços, só emoji, 500 caracteres, maiúsculas sem acento) → não quebra; corta em 100 caracteres; vazia volta para todas as categorias. Teste na Task 5.
5. **Tema escuro sem "piscar"** ao abrir a página e contraste AA no escuro → teste de contraste dos tokens dos dois temas na Task 2.

---

### Task 1: Ambiente pronto (dependências, .env, banco, testes)

**Files:**
- Modify: `package.json` (React 19, deps novas, script `test`)
- Create: `vitest.config.mts`, `vitest.setup.ts`, `.env.example`, `.claude/launch.json`
- Modify: `.env` (acrescentar variáveis — nunca commitar)
- Delete (já existe backup em `Downloads/BicoJa-backup-antes-do-github`, arquivos não rastreados): `app/anuncio/`, `app/context/`, `app/perfil/`, `index.js`
- Test: `lib/__tests__/sanidade.test.ts`

**Interfaces:**
- Produces: `npm test` (= `vitest run`), alias `@/` funcionando nos testes, servidor em `http://localhost:3000` via `npm run dev`.

- [ ] **Step 1:** `npm install react@19 react-dom@19 lucide-react zod motion` e `npm install -D @types/react@19 @types/react-dom@19 vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths`. Esperado: termina sem `ERR!` (avisos de peer ok). Se `ioredis@^6` não existir, fixar `ioredis@^5` e anotar no commit.
- [ ] **Step 2:** Criar `vitest.config.mts` (plugins `react()` + `tsconfigPaths()`, `environment: "jsdom"`, `setupFiles: ["./vitest.setup.ts"]`) e `vitest.setup.ts` (`import "@testing-library/jest-dom/vitest"`). Script `"test": "vitest run"`.
- [ ] **Step 3: Teste de sanidade** — `lib/__tests__/sanidade.test.ts`: `expect(1 + 1).toBe(2)`. Rodar `npm test` → PASS.
- [ ] **Step 4:** `.env.example` com chaves sem valores: `DATABASE_URL`, `REDIS_URL=redis://localhost:6379`, `NEXTAUTH_URL=http://localhost:3000`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. No `.env` real, acrescentar as que faltam; `NEXTAUTH_SECRET` gerado com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`; VAPID com `npx web-push generate-vapid-keys`.
- [ ] **Step 5:** `npx prisma migrate deploy --schema Prisma/schema.prisma` → "All migrations have been successfully applied" (ou "No pending migrations").
- [ ] **Step 6:** Apagar os arquivos do protótipo antigo listados acima.
- [ ] **Step 7:** `.claude/launch.json` com configuração `bicoja` (`npm run dev`, porta 3000). Subir e abrir `http://localhost:3000` → página carrega sem erro no terminal.
- [ ] **Step 8: Commit** — `chore: ambiente da fase 1 (React 19, vitest, deps de UI)` (sem `.env`).

### Task 2: Tokens de cor, fonte e tema claro/escuro

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `lib/cores.ts`, `lib/tema.ts`, `components/layout/ScriptTema.tsx`, `components/layout/SeletorTema.tsx`
- Test: `lib/__tests__/cores.test.ts`, `components/layout/__tests__/SeletorTema.test.tsx`

**Interfaces:**
- Produces:
  - `export const tokens: { claro: Record<NomeToken, string>; escuro: Record<NomeToken, string> }` em `lib/cores.ts`, `NomeToken = "fundo" | "superficie" | "superficieSuave" | "texto" | "textoSuave" | "marca" | "marcaTexto" | "marcaSuave" | "urgencia" | "sucesso" | "borda"`.
  - `export function razaoContraste(corA: string, corB: string): number` (hex → razão WCAG).
  - `export type PreferenciaTema = "sistema" | "claro" | "escuro"`; `lerPreferenciaTema(): PreferenciaTema`; `salvarPreferenciaTema(p: PreferenciaTema): void` (chave `bicoja-tema`, com try/catch) em `lib/tema.ts`.
  - Classes Tailwind geradas pelos tokens: `bg-fundo`, `bg-superficie`, `text-texto`, `text-texto-suave`, `bg-marca`, `text-marca-texto`, `bg-marca-suave`, `bg-urgencia`, `text-sucesso`, `border-borda`, etc. Tema escuro = classe `escuro` no `<html>`.

- [ ] **Step 1: Teste que falha** — `cores.test.ts`:
  - `razaoContraste("#FFFFFF", "#000000")` ≈ 21 (toBeCloseTo, 1).
  - Para cada tema: `razaoContraste(texto, fundo) >= 4.5`, `razaoContraste(textoSuave, fundo) >= 4.5`, `razaoContraste(marcaTexto, fundo) >= 4.5`, `razaoContraste("#FFFFFF", urgencia) >= 4.5` (botão de urgência), `razaoContraste(texto, marcaSuave) >= 4.5`.
  - `tokens.claro.marca === "#E8770C"`, `tokens.claro.urgencia === "#DC2626"`, `tokens.claro.fundo === "#FFFFFF"`.
- [ ] **Step 2:** `npm test -- cores` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar `lib/cores.ts` com os valores da Global Constraints no tema claro; tema escuro [escolha do implementador] com fundo grafite escuro (ex. `#14181C`), mantendo marca `#E8770C` e ajustando `marcaTexto`/`textoSuave` até passar o teste. Espelhar os mesmos valores em `globals.css` (`@theme` + `.escuro { --cor-...: ... }`), base `font-size: 17px` no `html`, `@media (prefers-reduced-motion: reduce)` zerando transições/animações.
- [ ] **Step 4:** `npm test -- cores` → PASS.
- [ ] **Step 5: Teste que falha** — `SeletorTema.test.tsx`: renderiza 3 opções com rótulo visível ("Igual ao celular", "Claro", "Escuro"); clicar "Escuro" adiciona classe `escuro` no `document.documentElement` e salva `"escuro"`; clicar "Claro" remove a classe.
- [ ] **Step 6:** Implementar `lib/tema.ts`, `SeletorTema` (grupo de botões `role="radiogroup"`) e `ScriptTema` (script inline no `<head>` que aplica a classe antes da pintura para não piscar; lê `bicoja-tema` e `matchMedia('(prefers-color-scheme: dark)')`). Em `layout.tsx`: trocar Geist por `Nunito` (`next/font/google`, pesos 400/600/700/800/900, variável `--font-nunito`), `lang="pt-BR"`, `suppressHydrationWarning` no `<html>`, `viewport.themeColor` claro `#FFFFFF` / escuro igual ao fundo escuro.
- [ ] **Step 7:** `npm test` → PASS.
- [ ] **Step 8: Commit** — `feat: tokens de cor, fonte Nunito e tema claro/escuro`.

### Task 3: Componentes base de interface

**Files:**
- Create: `components/ui/Botao.tsx`, `Campo.tsx`, `Chip.tsx`, `Cartao.tsx`, `Avatar.tsx`, `Esqueleto.tsx`, `EstadoVazio.tsx`, `components/ui/index.ts`
- Test: `components/ui/__tests__/*.test.tsx`

**Interfaces:**
- Produces (todos exportados de `@/components/ui`):
  - `Botao(props: { variante?: "principal" | "secundario" | "urgente" | "fantasma"; tamanho?: "normal" | "grande"; icone?: LucideIcon; carregando?: boolean; larguraTotal?: boolean } & ButtonHTMLAttributes)` — também `href?: string` renderiza `next/link`.
  - `Campo(props: { rotulo: string; erro?: string; ajuda?: string; icone?: LucideIcon } & InputHTMLAttributes)`.
  - `Chip(props: { ativo?: boolean; icone?: LucideIcon; children; href?: string; onClick? })`.
  - `CartaoServico(props: { titulo: string; nomePrestador: string; fotoUrl?: string | null; nota?: number | null; totalAvaliacoes?: number; distanciaKm?: number | null; precoAPartirDe?: number | null; online?: boolean; href: string })`.
  - `Avatar(props: { nome: string; fotoUrl?: string | null; tamanho?: number; online?: boolean })`.
  - `Esqueleto(props: { className?: string })`, `EstadoVazio(props: { icone: LucideIcon; titulo: string; texto: string; acao?: { rotulo: string; href: string } })`.

- [ ] **Step 1: Testes que falham:**
  - `Botao`: tem classe com `min-h-12` (48px); `carregando` → `aria-busy="true"` e desabilitado; `href` → renderiza `<a>`; `variante="urgente"` usa `bg-urgencia`.
  - `Campo`: `getByLabelText("Email")` encontra o input; com `erro="Email inválido"` → `aria-invalid="true"` e `aria-describedby` aponta para o texto do erro.
  - `Chip`: `ativo` → `aria-pressed="true"` (quando botão) ou `aria-current="page"` (quando link).
  - `CartaoServico`: título de 120 caracteres tem classe `line-clamp-2`; preço `80` aparece como `R$ 80,00` (`Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"})`); `distanciaKm=1.234` → "1,2 km"; `online` → texto acessível "Disponível agora"; sem nota → "Novo".
  - `Avatar`: sem foto mostra iniciais ("Maria Silva" → "MS"); `alt` = nome.
  - `EstadoVazio`: mostra título, texto e link de ação.
- [ ] **Step 2:** `npm test -- components/ui` → FAIL.
- [ ] **Step 3:** Implementar. Cantos `rounded-2xl` (cartões/blocos) e `rounded-full` (chips), sombra suave, `transition` 200ms e `active:scale-[0.98]` nos tocáveis, foco visível `focus-visible:outline-3 outline-marca`. Ícones `lucide-react` com `aria-hidden`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: componentes base de interface acessíveis`.

### Task 4: Estrutura das telas (cabeçalho, menu inferior, logo)

**Files:**
- Create: `public/logo.png` (cópia do logo original enviado pelo Kazuo), `components/layout/MenuInferior.tsx`, `components/layout/Cabecalho.tsx`, `components/layout/PularParaConteudo.tsx`, `app/(app)/layout.tsx`
- Move: `app/page.tsx` → `app/(app)/page.tsx` (conteúdo substituído na Task 6)
- Delete: `app/push-notification-button.tsx` só **depois** de mover sua lógica para `components/notificacoes/BotaoNotificacoes.tsx` (mesmo comportamento; usado na Fase 2 no Perfil)
- Test: `components/layout/__tests__/MenuInferior.test.tsx`

**Interfaces:**
- Produces: `MenuInferior(props: { modo: "cliente" | "prestador" })`. Itens cliente: Início `/`, Pedidos `/pedidos`, Conversas `/conversas`, Perfil `/perfil`. Itens prestador: Início `/prestador`, Serviços `/prestador/servicos`, Conversas `/conversas`, Ganhos `/prestador/ganhos`, Perfil `/perfil`. Na Fase 1 o modo vem fixo `"cliente"`.

- [ ] **Step 1: Teste que falha** — com `usePathname` mockado para `/conversas`: o link "Conversas" tem `aria-current="page"`; há 4 links no modo cliente e 5 no prestador; cada link tem texto visível; `nav` tem `aria-label="Menu principal"`.
- [ ] **Step 2:** `npm test -- MenuInferior` → FAIL.
- [ ] **Step 3:** Implementar. Menu fixo embaixo no celular (com `env(safe-area-inset-bottom)`), vira barra lateral/superior a partir de `md`. Conteúdo com `pb` suficiente para não ficar escondido atrás do menu. `PularParaConteudo` é o primeiro elemento focável. Rotas ainda inexistentes podem dar 404 nesta fase.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: estrutura das telas com menu inferior e logo`.

### Task 5: Categorias e busca inteligente por dicionário

**Files:**
- Create: `lib/categorias.ts`, `lib/busca.ts`
- Test: `lib/__tests__/busca.test.ts`

**Interfaces:**
- Produces:
  - `export type CategoriaId = "consertos" | "eletrica" | "encanamento" | "pintura" | "montagem" | "limpeza" | "mudanca" | "jardim" | "outros"`.
  - `export const CATEGORIAS: { id: CategoriaId; nome: string; icone: LucideIcon; palavras: string[] }[]` (nomes: Consertos, Elétrica, Encanamento, Pintura, Montagem, Limpeza, Mudança, Jardim, Outros).
  - `export function normalizar(texto: string): string` (minúsculas, sem acento, só letras/números/espaço, máx. 100 caracteres).
  - `export function interpretarBusca(texto: string): CategoriaId[]` — categorias ordenadas por relevância; vazio → `[]`.

- [ ] **Step 1: Testes que falham:**
  - `interpretarBusca("minha pia tá vazando")[0] === "encanamento"`
  - `interpretarBusca("CHUVEIRO QUEIMOU")[0] === "eletrica"`
  - `interpretarBusca("pintar a parede da sala")[0] === "pintura"`
  - `interpretarBusca("montar guarda roupa")[0] === "montagem"`
  - `interpretarBusca("faxina pos obra")[0] === "limpeza"`
  - `interpretarBusca("frete de geladeira")[0] === "mudanca"`
  - `interpretarBusca("cortar grama")[0] === "jardim"`
  - Erro de digitação: `interpretarBusca("vasamento")[0] === "encanamento"`, `interpretarBusca("tomada em curto")[0] === "eletrica"`
  - `interpretarBusca("")` e `interpretarBusca("   ")` e `interpretarBusca("🔥🔥")` → `[]`
  - `normalizar("a".repeat(500)).length === 100`
  - `normalizar("Elétrica")` → `"eletrica"`
- [ ] **Step 2:** `npm test -- busca` → FAIL.
- [ ] **Step 3:** Implementar. Pontuação por palavra: igual = 3, palavra da busca começa com o radical do dicionário (≥4 letras) = 2, distância de edição ≤ 1 para palavras com ≥ 5 letras = 1. Dicionário com ~15–30 palavras por categoria (ex.: encanamento: pia, cano, torneira, vazamento, vazando, descarga, registro, caixa d'agua, esgoto, entupido, ralo, chuveiro pingando…). Categorias com pontuação 0 ficam de fora.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: categorias e busca por dicionário de palavras`.

### Task 6: Tela Inicial e tela de Busca com dados reais

**Files:**
- Create: `app/(app)/page.tsx` (substitui), `components/inicio/BuscaPrincipal.tsx`, `components/inicio/BotaoAjudaAgora.tsx`, `components/inicio/ListaCategorias.tsx`, `components/inicio/SecaoDisponiveis.tsx`, `components/inicio/CartaoPublicarPedido.tsx`, `components/inicio/CartaoFazerBicos.tsx`, `app/(app)/buscar/page.tsx`, `lib/servicos.ts`
- Test: `lib/__tests__/servicos.test.ts`, `components/inicio/__tests__/*.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIAS`, `interpretarBusca` (Task 5); `CartaoServico`, `Chip`, `Botao`, `EstadoVazio`, `Esqueleto` (Task 3).
- Produces:
  - `export type ServicoResumo = { id: string; titulo: string; descricao: string; preco: number; prestador: { id: string; nome: string | null } }`.
  - `export async function listarServicosRecentes(limite: number): Promise<ServicoResumo[]>` e `export async function buscarServicosPorTexto(texto: string, limite: number): Promise<ServicoResumo[]>` em `lib/servicos.ts` — Prisma direto (Server Component), **sem** expor email/telefone do prestador; texto normalizado com `normalizar` e busca `contains`, `mode: "insensitive"` em título e descrição.
  - Tela Inicial (Server Component) na ordem do mockup aprovado: saudação (nome se logado, "Olá!" se não; **sem bairro**), título "O que você precisa resolver hoje?", `BuscaPrincipal` (form GET para `/buscar?q=`; `<label>` visível ou `aria-label` + placeholder "Ex: pia vazando, montar armário…", `maxLength=100`, `enterKeyHint="search"`), `BotaoAjudaAgora` (vermelho, **um pouco menor** que o bloco de busca, texto "Preciso de ajuda agora" + "Avisamos quem está perto de você", link `/pedidos/urgente`), `ListaCategorias` (chips com rolagem horizontal, `scroll-snap`, links `/buscar?categoria=<id>`), `SecaoDisponiveis` (título "Disponíveis agora", até 6 `CartaoServico` de `listarServicosRecentes(6)` — na Fase 3 troca para prestadores online), `CartaoPublicarPedido` ("Não achou o que precisa?" → `/pedidos/novo`), `CartaoFazerBicos` ("💰 Quer ganhar dinheiro fazendo bicos?" + botão "Quero fazer bicos" → `/quero-fazer-bicos`).
  - Tela Busca: lê `q` e `categoria`; mostra "Entendemos: Encanamento" com chips das categorias interpretadas (trocáveis), e a lista de `buscarServicosPorTexto`. Sem resultado → `EstadoVazio` com ação "Publicar meu pedido".

- [ ] **Step 1: Testes que falham:**
  - `servicos.test.ts` (Prisma mockado com `vi.mock("@/lib/prisma")`): `listarServicosRecentes(6)` chama `findMany` com `take: 6`, `orderBy: { createdAt: "desc" }` e `select` do prestador **somente** `{ id: true, nome: true }`; `buscarServicosPorTexto("  PIA  ", 20)` busca `"pia"`.
  - `SecaoDisponiveis` com lista vazia → mostra `EstadoVazio` com link "Publicar meu pedido".
  - `SecaoDisponiveis` com `erro` → texto "Não conseguimos carregar agora." e botão "Tentar de novo".
  - `BotaoAjudaAgora` → link para `/pedidos/urgente`, com classe `bg-urgencia`.
  - `BuscaPrincipal` → input com `maxLength={100}` e rótulo acessível "O que você precisa?".
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar. A Tela Inicial captura erro do banco (try/catch em `lib/servicos.ts` chamado pela página) e passa `erro` para `SecaoDisponiveis`; "Tentar de novo" é um link para a própria página. `loading.tsx` com `Esqueleto` no lugar dos cartões. Animação de entrada sutil das seções com `motion` (fade + 8px, 200ms; desligada com `useReducedMotion`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Verificação no navegador** — `npm run dev`; em largura de celular (375px) e desktop, temas claro e escuro: Início mostra todas as seções na ordem; rolar categorias para o lado funciona; buscar "pia vazando" leva à Busca com "Encanamento"; navegação por Tab mostra foco visível; sem erros no console. Com Redis parado (`docker stop redis_bicoja`), Início ainda abre (a Fase 1 lê pelo Prisma, não pelo Redis); com Postgres parado, mostra a mensagem de erro amigável. Religar os contêineres no fim.
- [ ] **Step 6: Commit** — `feat: tela inicial e busca com dados reais`.

### Task 7: PWA e cabeçalhos de segurança

**Files:**
- Create: `next.config.ts`, `app/manifest.ts`, `scripts/gerar-icones.mjs`, `public/icones/` (gerados), `components/pwa/RegistrarServiceWorker.tsx`
- Modify: `public/sw.js` (ícone do push → `/icones/icone-192.png`), `app/layout.tsx`
- Test: `lib/__tests__/seguranca.test.ts`

**Interfaces:**
- Produces: `export const cabecalhosSeguranca: { key: string; value: string }[]` exportado de `lib/seguranca.ts` e usado em `next.config.ts` `headers()` para `/:path*`.

- [ ] **Step 1: Teste que falha** — `seguranca.test.ts`: contém `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` com `camera=(self), geolocation=(self), microphone=()`, e `Content-Security-Policy` contendo `default-src 'self'`, `frame-ancestors 'none'`, `connect-src 'self' ws: wss:` e `img-src 'self' data: blob:`.
- [ ] **Step 2:** `npm test -- seguranca` → FAIL.
- [ ] **Step 3:** Implementar `lib/seguranca.ts` (CSP em dev precisa de `'unsafe-eval'` em `script-src`; em produção não; `'unsafe-inline'` em `script-src` permitido nesta fase por causa do `ScriptTema` e do Next — anotar como pendência de nonce na Fase 6) e `next.config.ts`.
- [ ] **Step 4:** `scripts/gerar-icones.mjs` usa `sharp` (instalar como dependência: será usado também nos uploads da Fase 2) para gerar de `public/logo.png`: 192, 512, 512 maskable (com margem laranja `#E8770C`), `apple-touch-icon` 180. `app/manifest.ts`: `name: "BicoJá"`, `short_name: "BicoJá"`, `lang: "pt-BR"`, `start_url: "/"`, `display: "standalone"`, `background_color: "#FFFFFF"`, `theme_color: "#E8770C"`, ícones gerados. `RegistrarServiceWorker` registra `/sw.js` (já usado pelo push).
- [ ] **Step 5:** `npm test` → PASS; `npm run build` → sem erros. No navegador: DevTools › Application › Manifest sem erros e cabeçalhos presentes na resposta.
- [ ] **Step 6: Commit** — `feat: PWA instalável e cabeçalhos de segurança`.

### Task 8: Verificação final da fase

- [ ] **Step 1:** `npm test` → todos PASS. `npx tsc --noEmit` → 0 erros. `npm run build` → sucesso.
- [ ] **Step 2:** Revisão manual de acessibilidade na Tela Inicial e Busca: zoom do navegador em 200% sem cortar conteúdo; leitor de tela lê a ordem certa; nenhum texto menor que 14px (DevTools).
- [ ] **Step 3:** Mostrar ao Kazuo no navegador (celular e desktop, claro e escuro) e anotar ajustes pedidos para fazer antes da Fase 2.
- [ ] **Step 4: Commit** de ajustes, se houver.
