# BicoJá — Fase 2: Contas (cadastro, código, foto, login, perfil, modos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pessoa cria conta em 4 passos (escolha → dados → código no email → foto), continua de onde parou, entra com email ou celular, recupera senha por código, vê e edita o Perfil, troca de modo e vira prestador pelo "Quero fazer bicos".

**Architecture:** Regras de negócio em `lib/contas/*` (funções puras + serviços que recebem o `prisma`), rotas finas em `app/api/contas/*` que só validam (zod), checam sessão/rate limit e chamam os serviços. Sessão continua NextAuth JWT; o token carrega `id`, `modoAtual`, `emailVerificado`, `temFoto` e é atualizado com `useSession().update()`. `middleware.ts` protege páginas e manda quem não terminou o cadastro para o passo que falta. Testes de serviço rodam contra um **banco de teste real** (`banco_servicos_teste` no mesmo Docker).

**Tech Stack:** Next.js 15, NextAuth v4 (JWT), Prisma/PostgreSQL, Redis (rate limit existente), zod, bcryptjs, sharp, nodemailer, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-bicoja-frontend-design.md` (§7 Contas, §8 Perfil, §12 Segurança)

## Global Constraints

- Tudo da Fase 1 continua valendo (cores/tokens, 17px, toque 48px, ícone sempre com texto, rótulo visível, contraste AA, `outline-foco`, nada de sessão em `localStorage`).
- **Sem CPF.** Dados do cadastro: nome, email, celular, senha, foto.
- 1 conta por email e 1 por celular. Celular brasileiro com DDD: 10 ou 11 dígitos (aceita `+55`, espaços, parênteses, traço).
- Senha: mínimo 8, máximo 72 caracteres; bloqueia lista de senhas óbvias e senha que contenha o primeiro nome ou a parte antes do `@` do email (≥ 4 letras).
- Código: 6 dígitos, vale **10 minutos**, máximo **5 tentativas**, reenviar só depois de **60 segundos**; guardado só como hash.
- Foto: JPG/PNG/WEBP, até **5 MB**, conteúdo conferido pelo `sharp`; regravada 512×512 WEBP sem metadados (remove GPS); salva em `uploads/fotos/` (fora de `public/`), servida por `/api/arquivos/fotos/[nome]`.
- Rate limit (Redis, `checkRateLimit`): cadastro 5/10min por IP; enviar código 5/10min por conta e por IP; confirmar código 10/10min; entrar 10/10min por IP+identificador; foto 10/10min por conta.
- Respostas de "esqueci a senha" **não revelam** se o email existe.
- Textos para o usuário em português simples; erros dizem o que fazer.
- Não apagar `/api/register` nem modelos antigos.

## Review Focus

1. **Duas abas/cliques duplos no "Continuar" dos dados** → não cria duas contas nem quebra; o segundo vê "Esse email já tem conta. Quer entrar?". Teste na Task 3 (unique do banco tratado).
2. **Celular digitado de jeitos diferentes** (`(91) 98888-7777`, `91988887777`, `+55 91 98888 7777`) → é o mesmo celular no cadastro e no login. Teste na Task 2 e Task 5.
3. **Código expirado, errado 5 vezes ou já usado** → mensagem clara e opção "Mandar novo código"; nunca aceita. Teste na Task 4.
4. **Arquivo que não é imagem renomeado para .jpg, ou foto de 20 MB** → recusado com mensagem amigável, nada salvo. Teste na Task 6.
5. **Pessoa logada com cadastro incompleto tenta abrir /perfil ou /conversas** → vai para o passo que falta; depois de terminar, volta ao normal. Teste na Task 7.

---

### Task 1: Banco de teste, migração e e-mail

**Files:**
- Modify: `Prisma/schema.prisma`; Create: migração `Prisma/migrations/<data>_contas_fase2/`
- Create: `.env.test` (não commitado; `.env.example` ganha `DATABASE_URL_TESTE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE`), `vitest.integracao.setup.ts`, `lib/email.ts`
- Modify: `vitest.config.mts` (setup de integração só para arquivos `*.int.test.ts`), `.gitignore` (`uploads/`, `.env.test`)
- Test: `lib/__tests__/email.test.ts`, `lib/contas/__tests__/banco.int.test.ts`

**Interfaces:**
- Produces (schema):
  - `enum Modo { CLIENTE PRESTADOR }`; `User` + `modoAtual Modo @default(CLIENTE)`, `telefone String? @unique` (já existe, ganha unique), usa `image` para a foto, `emailVerified` já existe.
  - `enum TipoCodigo { EMAIL_CADASTRO RECUPERAR_SENHA }`; `model CodigoVerificacao { id String @id @default(uuid()); userId String; tipo TipoCodigo; codigoHash String; expiraEm DateTime; tentativas Int @default(0); usadoEm DateTime?; createdAt DateTime @default(now()); user User @relation(..., onDelete: Cascade); @@index([userId, tipo]) }`.
  - `model PerfilPrestador { id String @id @default(uuid()); userId String @unique; categorias String[]; bio String?; bairro String; cidade String; latitude Float; longitude Float; raioKm Int @default(10); precoBase Float?; disponivel Boolean @default(false); ultimoSinal DateTime?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; user User @relation(..., onDelete: Cascade) }`.
- Produces: `export async function enviarEmail(para: string, assunto: string, texto: string): Promise<void>` — com `SMTP_HOST` vazio, imprime no terminal `[EMAIL para <para>] <assunto>\n<texto>` e não lança erro.
- Produces: `npm run test:integracao` (= `vitest run --config vitest.integracao.config.mts`) que antes roda `prisma migrate deploy` no banco de teste; `npm test` continua só com testes rápidos (exclui `*.int.test.ts`).

- [ ] **Step 1:** Criar o banco de teste: `docker exec postgres_bicoja createdb -U admin banco_servicos_teste` e `docker exec postgres_bicoja psql -U admin -d banco_servicos_teste -c "CREATE EXTENSION IF NOT EXISTS postgis"`. `.env.test` com `DATABASE_URL` apontando para ele.
- [ ] **Step 2: Teste que falha** — `banco.int.test.ts`: criar dois `User` com o mesmo `telefone` lança erro Prisma `P2002`; `CodigoVerificacao` e `PerfilPrestador` podem ser criados e são apagados junto com o `User` (cascade).
- [ ] **Step 3:** `npm run test:integracao` → FAIL (modelos não existem).
- [ ] **Step 4:** Alterar `schema.prisma`, `npx prisma migrate dev --name contas_fase2 --schema Prisma/schema.prisma` (banco de dev), configs de integração (`globalSetup` roda `prisma migrate deploy` com `.env.test`; `fileParallelism: false`; cada teste limpa as tabelas que usa com `deleteMany`).
- [ ] **Step 5:** `npm run test:integracao` → PASS.
- [ ] **Step 6: Teste que falha** — `email.test.ts`: sem `SMTP_HOST`, `enviarEmail("a@b.test","Assunto","Seu código é 123456")` resolve e `console.log` recebe texto contendo `a@b.test` e `123456`.
- [ ] **Step 7:** `npm i nodemailer && npm i -D @types/nodemailer`; implementar `lib/email.ts` (transporte criado só se `SMTP_HOST` existir). `npm test` → PASS.
- [ ] **Step 8: Commit** — `feat: banco de teste, modelos de contas e envio de email`.

### Task 2: Regras puras — telefone, senha e esquemas de validação

**Files:**
- Create: `lib/contas/telefone.ts`, `lib/contas/senha.ts`, `lib/contas/esquemas.ts`
- Test: `lib/contas/__tests__/telefone.test.ts`, `senha.test.ts`, `esquemas.test.ts`

**Interfaces:**
- Produces:
  - `normalizarTelefone(entrada: string): string | null` → só dígitos, sem `55` do país, 10 ou 11 dígitos, DDD 11–99; senão `null`.
  - `formatarTelefone(digitos: string): string` → `"(91) 98888-7777"` / `"(91) 3222-1111"`; aceita parcial (para máscara enquanto digita).
  - `ehEmail(texto: string): boolean`.
  - `problemaNaSenha(senha: string, contexto: { nome?: string; email?: string }): string | null` → mensagem em português ou `null`.
  - `esquemaCadastro` (zod): `{ escolha: "CONTRATAR" | "FAZER_BICOS" | "OS_DOIS"; nome: string (2–80, trim); email: string (email, minúsculo, trim, ≤ 120); telefone: string (transformado por `normalizarTelefone`, erro "Celular inválido. Use DDD + número."); senha: string }` com `superRefine` usando `problemaNaSenha`.
  - `esquemaEntrar`: `{ identificador: string; senha: string }`; `esquemaCodigo`: `{ codigo: /^\d{6}$/ }`; `esquemaRedefinirSenha`: `{ email, codigo, novaSenha }`; `esquemaPerfil`: `{ nome?, telefone? }`; `esquemaPrestador`: `{ categorias: CategoriaId[] (1–5); bairro: 2–60; cidade: 2–60; raioKm: 1–50 int; precoBase?: number 0–100000; bio?: ≤ 300 }`.
  - `export type Escolha = "CONTRATAR" | "FAZER_BICOS" | "OS_DOIS"`; `escolhaParaPapel(e: Escolha): { role: Role; modoAtual: Modo }` → CONTRATAR→`CONTRATANTE/CLIENTE`, FAZER_BICOS→`PRESTADOR/PRESTADOR`, OS_DOIS→`AMBOS/CLIENTE`.

- [ ] **Step 1: Testes que falham:**
  - `normalizarTelefone`: `"(91) 98888-7777"`, `"91988887777"`, `"+55 91 98888 7777"`, `"55 (91) 98888-7777"` → `"91988887777"`; `"9132221111"` → `"9132221111"`; `"98888-7777"` (sem DDD) → `null`; `"00988887777"` → `null`; `"abc"` → `null`.
  - `formatarTelefone("91988887777")` → `"(91) 98888-7777"`; `formatarTelefone("9132221111")` → `"(91) 3222-1111"`; `formatarTelefone("919")` → `"(91) 9"`.
  - `problemaNaSenha`: `"1234567"` → contém "8"; `"12345678"` e `"senha123"` → mensagem de senha óbvia; `"mariasilva1"` com nome `"Maria Silva"` → mensagem sobre nome; `"joaozinho99"` com email `"joaozinho@x.com"` → mensagem sobre email; `"a".repeat(73)` → mensagem de máximo; `"casa-amarela-7"` → `null`.
  - `esquemaCadastro.safeParse` com email `" Maria@Email.COM "` → `"maria@email.com"`; telefone com máscara → só dígitos; nome com 1 letra → erro no campo `nome`.
  - `escolhaParaPapel("OS_DOIS")` → `{ role: "AMBOS", modoAtual: "CLIENTE" }`.
- [ ] **Step 2:** `npm test -- lib/contas` → FAIL.
- [ ] **Step 3:** Implementar. Lista de senhas óbvias com ~30 itens (12345678, 123456789, 87654321, senha123, senha1234, 11111111, 00000000, qwerty123, abc12345, bicoja123, brasil123, mudar123, password…), comparação em minúsculas sem acento (`simplificar` de `lib/busca`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: regras de telefone, senha e validação de contas`.

### Task 3: Serviço de cadastro e rota `POST /api/contas/cadastro`

**Files:**
- Create: `lib/contas/cadastro.ts`, `app/api/contas/cadastro/route.ts`, `lib/contas/requisicao.ts`
- Test: `lib/contas/__tests__/cadastro.int.test.ts`

**Interfaces:**
- Consumes: `esquemaCadastro`, `escolhaParaPapel` (Task 2); `enviarCodigo` (Task 4 — nesta task a rota chama `enviarCodigo` depois de criar; implementar Task 4 antes de ligar a rota, ou ligar no fim da Task 4).
- Produces:
  - `type ResultadoCadastro = { ok: true; userId: string } | { ok: false; campo: "email" | "telefone"; erro: string }`.
  - `criarConta(prisma: PrismaClient, dados: z.infer<typeof esquemaCadastro>): Promise<ResultadoCadastro>` — hash `bcrypt` custo 10; grava `role`/`modoAtual`; email/telefone duplicados (checagem prévia **e** captura de `P2002`) → `{ ok:false, campo, erro }` com textos "Esse email já tem conta. Quer entrar?" / "Esse celular já tem conta. Quer entrar?".
  - `lib/contas/requisicao.ts`: `ipDaRequisicao(req: Request): string` (primeiro item de `x-forwarded-for`, senão `"local"`); `limitar(chave: string, limite: number, janelaSeg: number): Promise<boolean>` (usa `checkRateLimit`); `responderErro(status: number, erro: string, campo?: string)` → `NextResponse.json({ ok:false, erro, campo }, { status })`.
  - Rota: 400 com `{campo, erro}` do zod (primeiro erro); 409 duplicado; 429 limite; 201 `{ ok:true }`. A página faz `signIn("credentials", { identificador: email, senha, redirect:false })` depois do 201.

- [ ] **Step 1: Testes que falham (banco real):** cria conta e a senha salva não é o texto puro (`bcrypt.compare` dá true); `OS_DOIS` grava `AMBOS`/`CLIENTE`; mesmo email de novo → `{ok:false, campo:"email"}`; mesmo celular com outra máscara → `{ok:false, campo:"telefone"}`; **duas chamadas em paralelo** com o mesmo email → exatamente uma `ok:true` e outra `ok:false` com `campo:"email"`.
- [ ] **Step 2:** `npm run test:integracao -- cadastro` → FAIL.
- [ ] **Step 3:** Implementar `criarConta`, `requisicao.ts` e a rota.
- [ ] **Step 4:** `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `feat: criar conta com email e celular únicos`.

### Task 4: Códigos por email (cadastro e recuperar senha)

**Files:**
- Create: `lib/contas/codigos.ts`, `app/api/contas/codigo/enviar/route.ts`, `app/api/contas/codigo/confirmar/route.ts`, `app/api/contas/senha/recuperar/route.ts`, `app/api/contas/senha/redefinir/route.ts`
- Test: `lib/contas/__tests__/codigos.int.test.ts`

**Interfaces:**
- Produces:
  - `gerarCodigo(): string` (6 dígitos com `crypto.randomInt`, zeros à esquerda).
  - `enviarCodigo(prisma, userId: string, tipo: TipoCodigo, agora = new Date()): Promise<{ ok: true } | { ok: false; esperarSegundos: number }>` — bloqueia se o último do mesmo tipo tem < 60 s; invalida (`usadoEm = agora`) códigos anteriores do tipo; salva `codigoHash` = HMAC-SHA256(`NEXTAUTH_SECRET`, `userId:tipo:codigo`); envia email com o código e "vale por 10 minutos".
  - `conferirCodigo(prisma, userId, tipo, codigo: string, agora = new Date()): Promise<{ ok: true } | { ok: false; motivo: "errado" | "expirado" | "tentativas" | "inexistente"; restantes?: number }>` — compara em tempo constante (`timingSafeEqual`); errado incrementa `tentativas`; na 5ª errada vira `"tentativas"`; ok marca `usadoEm`. Para `EMAIL_CADASTRO` ok também grava `user.emailVerified = agora`.
  - `redefinirSenha(prisma, email, codigo, novaSenha): Promise<{ ok: true } | { ok: false; erro: string }>` — email inexistente responde igual a código errado.
  - Rotas: `codigo/enviar` (sessão obrigatória; tipo EMAIL_CADASTRO; 429 com `esperarSegundos`), `codigo/confirmar` (sessão; mensagens: errado → "Código errado. Você ainda tem N tentativas.", expirado → "Esse código venceu. Peça um novo.", tentativas → "Muitas tentativas. Peça um novo código."), `senha/recuperar` (sem sessão; **sempre** 200 `{ok:true}`), `senha/redefinir` (sem sessão).
  - Ligar `enviarCodigo(..., "EMAIL_CADASTRO")` no fim de `POST /api/contas/cadastro`.

- [ ] **Step 1: Testes que falham:** `gerarCodigo()` sempre casa `/^\d{6}$/` (100 chamadas); enviar duas vezes em < 60 s → segunda `{ok:false, esperarSegundos}` entre 1 e 60; código certo → ok e `emailVerified` preenchido; usar o mesmo código de novo → `inexistente`; código de 11 minutos atrás → `expirado`; 5 erros → 5º retorna `tentativas` e o código certo depois também falha; novo envio invalida o anterior; o banco nunca guarda o código em texto (o `codigoHash` não contém os 6 dígitos); `redefinirSenha` com código certo troca a senha (login com a nova funciona via `bcrypt.compare`) e com email inexistente retorna o mesmo erro de código errado.
- [ ] **Step 2:** `npm run test:integracao -- codigos` → FAIL.
- [ ] **Step 3:** Implementar (capturar `console.log` do `enviarEmail` nos testes para ler o código enviado).
- [ ] **Step 4:** `npm run test:integracao` e `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: códigos por email para confirmar cadastro e recuperar senha`.

### Task 5: Login por email ou celular e sessão com dados do cadastro

**Files:**
- Modify: `lib/auth.ts`
- Create: `lib/contas/entrar.ts`, `types/next-auth.d.ts`
- Test: `lib/contas/__tests__/entrar.int.test.ts`

**Interfaces:**
- Produces:
  - `autenticar(prisma, identificador: string, senha: string): Promise<{ id: string; name: string | null; email: string | null; image: string | null } | null>` — se `ehEmail` busca por email minúsculo, senão por `normalizarTelefone`; `null` para qualquer falha (mesma resposta para "não existe" e "senha errada").
  - `lib/auth.ts`: provider de credenciais com campos `identificador` e `senha`; rate limit 10/10min por IP+identificador (excedido → `null` e log); `pages: { signIn: "/entrar" }`; callback `jwt` grava no token `id`, `modoAtual`, `emailVerificado: boolean`, `temFoto: boolean`, `role`; com `trigger === "update"` relê o usuário do banco; callback `session` expõe `session.user.{id, modoAtual, emailVerificado, temFoto, role, image, name}`.
  - `types/next-auth.d.ts`: tipos de `Session["user"]` e `JWT` com esses campos (remove os `as any` novos).

- [ ] **Step 1: Testes que falham:** entra com email em maiúsculas; entra com celular `"(91) 98888-7777"` quando cadastrado como `"91988887777"`; senha errada → `null`; identificador inexistente → `null`; usuário sem senha (conta antiga) → `null`.
- [ ] **Step 2:** `npm run test:integracao -- entrar` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Testes → PASS; `npx tsc --noEmit` → 0 erros.
- [ ] **Step 5: Commit** — `feat: entrar com email ou celular e sessão com etapa do cadastro`.

### Task 6: Foto de perfil (upload seguro) e arquivo público

**Files:**
- Create: `lib/contas/foto.ts`, `app/api/contas/foto/route.ts`, `app/api/arquivos/fotos/[nome]/route.ts`
- Test: `lib/contas/__tests__/foto.test.ts`, `lib/contas/__tests__/foto.int.test.ts`

**Interfaces:**
- Produces:
  - `processarFoto(bytes: Buffer): Promise<{ ok: true; webp: Buffer } | { ok: false; erro: string }>` — > 5 MB → "A foto é muito grande. Escolha uma de até 5 MB."; `sharp(...).metadata()` falha ou formato fora de jpeg/png/webp → "Esse arquivo não é uma foto. Tente outra."; ok → `.rotate()` (respeita orientação) `.resize(512, 512, { fit: "cover" }).webp({ quality: 82 })` sem `withMetadata`.
  - `salvarFotoPerfil(prisma, userId, webp: Buffer): Promise<string>` → grava `uploads/fotos/<uuid>.webp`, apaga a foto anterior do usuário se for dessa pasta, atualiza `user.image = "/api/arquivos/fotos/<uuid>.webp"`, devolve a URL.
  - `POST /api/contas/foto` (sessão; `multipart/form-data` campo `foto`; 413/400 com `erro`; 200 `{ ok:true, url }`).
  - `GET /api/arquivos/fotos/[nome]` — nome deve casar `/^[0-9a-f-]{36}\.webp$/` (senão 404); responde `image/webp`, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`.

- [ ] **Step 1: Testes que falham:** `processarFoto` com PNG 800×600 gerado pelo `sharp` → `ok`, saída é WEBP 512×512 (conferir com `sharp(webp).metadata()`), e uma JPEG com EXIF GPS (gerar com `sharp(...).withExif({ IFD0: { Copyright: "x" } })` e `withMetadata`) sai **sem** `exif`; texto qualquer `Buffer.from("isso não é imagem")` → erro "não é uma foto"; buffer de 5 MB + 1 byte → erro "muito grande". Integração: `salvarFotoPerfil` cria o arquivo, troca `image`, e uma segunda foto apaga o arquivo da primeira. Rota GET com `nome="../../.env"` → 404.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `feat: foto de perfil com validação e remoção de metadados`.

### Task 7: Proteção de páginas e "continue de onde parou"

**Files:**
- Create: `middleware.ts`, `lib/contas/etapa.ts`
- Test: `lib/contas/__tests__/etapa.test.ts`

**Interfaces:**
- Produces:
  - `type Etapa = "codigo" | "foto" | "completo"`; `etapaDoCadastro(t: { emailVerificado?: boolean; temFoto?: boolean }): Etapa`.
  - `destinoParaPagina(caminho: string, token: { emailVerificado?: boolean; temFoto?: boolean } | null): string | null` — devolve para onde redirecionar ou `null`:
    - Páginas que exigem login: `/perfil`, `/pedidos`, `/conversas`, `/prestador`, `/quero-fazer-bicos` (e subpáginas). Sem token → `/entrar?voltar=<caminho>`.
    - Com token e etapa ≠ completo, nessas páginas → `/cadastro/codigo` ou `/cadastro/foto`.
    - Em `/cadastro/codigo` com email já verificado → próxima etapa; em `/cadastro/foto` sem email verificado → `/cadastro/codigo`; em `/entrar` ou `/cadastro` logado e completo → `/`.
    - `/`, `/buscar`, `/servicos/*` são livres (navegar sem login).
  - `middleware.ts` usa `getToken` (next-auth/jwt) + `destinoParaPagina`; `matcher` exclui `/api`, `/_next`, arquivos estáticos, `/icones`, `/logo.png`, `/sw.js`, `/manifest.webmanifest`.
  - `voltar` só aceita caminho interno (começa com `/` e não com `//`).

- [ ] **Step 1: Testes que falham:** sem token em `/perfil` → `/entrar?voltar=%2Fperfil`; token sem email verificado em `/conversas` → `/cadastro/codigo`; verificado sem foto em `/perfil` → `/cadastro/foto`; completo em `/perfil` → `null`; sem token em `/` e `/buscar` → `null`; completo em `/entrar` → `/`; `/cadastro/codigo` com email verificado e sem foto → `/cadastro/foto`.
- [ ] **Step 2:** `npm test -- etapa` → FAIL.
- [ ] **Step 3:** Implementar; também exportar `caminhoSeguro(voltar: string | null): string` (inválido → `/`) e testar `"//evil.com"` → `/`, `"https://evil.com"` → `/`, `"/perfil"` → `/perfil`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: proteger páginas e retomar cadastro do passo que falta`.

### Task 8: Telas de Entrar, Cadastro (4 passos) e Esqueci minha senha

**Files:**
- Create: `app/(conta)/layout.tsx` (sem menu inferior; logo + "Voltar"), `app/(conta)/entrar/page.tsx`, `app/(conta)/cadastro/page.tsx` (passos 1 e 2 no cliente), `app/(conta)/cadastro/codigo/page.tsx`, `app/(conta)/cadastro/foto/page.tsx`, `app/(conta)/cadastro/pronto/page.tsx`, `app/(conta)/esqueci-senha/page.tsx`
- Create: `components/conta/BarraProgresso.tsx`, `CampoSenha.tsx`, `CampoTelefone.tsx`, `CampoCodigo.tsx`, `EscolhaModo.tsx`, `EnviarFoto.tsx`
- Test: `components/conta/__tests__/*.test.tsx`

**Interfaces:**
- Consumes: rotas das Tasks 3–6; `signIn`/`useSession().update()` do NextAuth; `Campo`, `Botao` (Fase 1).
- Produces (visual conforme `.superpowers/brainstorm/.../cadastro-v2.html`, **sem o passo de CPF**: 4 passos):
  - `BarraProgresso({ passo: number; total: number })` → `role="progressbar"` com `aria-valuenow`, `aria-valuemax`, texto "Passo 2 de 4".
  - `CampoSenha` → botão "Mostrar"/"Esconder" (`aria-pressed`), regra "Pelo menos 8 letras ou números" que fica verde (`✓`) quando cumprida, `autoComplete="new-password"` no cadastro e `"current-password"` no entrar.
  - `CampoTelefone` → máscara com `formatarTelefone` enquanto digita, `inputMode="tel"`, `autoComplete="tel-national"`.
  - `CampoCodigo` → 6 caixas, `inputMode="numeric"`, `autoComplete="one-time-code"`, colar "123456" preenche todas, Backspace volta à anterior; `onCompleto(codigo)` chamado ao preencher a 6ª.
  - `EscolhaModo` → `radiogroup` com Contratar / Fazer bicos / Os dois e o aviso "Pode mudar depois quando quiser."
  - `EnviarFoto` → prévia redonda; "Tirar foto agora" (`<input type="file" accept="image/*" capture="user">`) e "Escolher da galeria" (`accept="image/jpeg,image/png,image/webp"`); dicas; envia para `/api/contas/foto`; ao terminar chama `update()` e vai para `/cadastro/pronto`.
  - Código: contador "Mandar de novo em 0:45" (60 s), "Corrigir o email" volta para `/cadastro` (o passo 2 permite trocar o email só enquanto não verificado — rota `PATCH /api/contas/email` [Claude: incluir nesta task, sessão obrigatória, reenvia código]).
  - Entrar: "Email ou celular", senha, "Esqueci minha senha", "Criar conta grátis"; erro genérico "Email/celular ou senha não conferem."; respeita `?voltar=`.
  - Esqueci: passo 1 email → passo 2 código + nova senha → entra direto.
  - Mensagens de erro da API aparecem no campo certo (`campo`) e o foco vai para o primeiro campo com erro.

- [ ] **Step 1: Testes que falham:** `BarraProgresso` expõe valores ARIA e texto; `CampoSenha` alterna tipo `password`/`text` e mostra `✓` com 8+ caracteres; `CampoTelefone` digitando "91988887777" mostra "(91) 98888-7777"; `CampoCodigo` colando "123456" chama `onCompleto("123456")` e ignora letras; `EscolhaModo` marca `aria-checked` na opção clicada.
- [ ] **Step 2:** `npm test -- components/conta` → FAIL.
- [ ] **Step 3:** Implementar componentes e páginas.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Verificação no navegador** (375px, claro e escuro): criar conta completa (código aparece no terminal do servidor), fechar a aba no passo da foto, abrir `/perfil` → cai em `/cadastro/foto`; terminar → `/cadastro/pronto`; sair e entrar pelo celular com máscara diferente; "Esqueci minha senha" troca a senha; tentar 6 códigos errados mostra a mensagem certa.
- [ ] **Step 6: Commit** — `feat: telas de entrar, cadastro em 4 passos e recuperar senha`.

### Task 9: Perfil, troca de modo e "Quero fazer bicos"

**Files:**
- Create: `app/(app)/perfil/page.tsx`, `app/(app)/quero-fazer-bicos/page.tsx`, `components/perfil/TrocarModo.tsx`, `components/perfil/EditarDados.tsx`, `lib/contas/perfil.ts`, `lib/contas/prestador.ts`, `app/api/contas/perfil/route.ts`, `app/api/contas/modo/route.ts`, `app/api/contas/prestador/route.ts`
- Modify: `app/(app)/layout.tsx` (modo do menu vem da sessão), `app/(app)/page.tsx` (esconde `CartaoFazerBicos` para quem já é prestador)
- Test: `lib/contas/__tests__/perfil.int.test.ts`, `components/perfil/__tests__/TrocarModo.test.tsx`

**Interfaces:**
- Produces:
  - `atualizarPerfil(prisma, userId, { nome?, telefone? })` → mesmo tratamento de duplicado da Task 3 (`campo:"telefone"`).
  - `trocarModo(prisma, userId, modo: Modo): Promise<{ ok: true } | { ok: false; precisaVirarPrestador: true }>` → PRESTADOR só se existir `PerfilPrestador`; senão `precisaVirarPrestador`.
  - `virarPrestador(prisma, userId, dados: z.infer<typeof esquemaPrestador>)` → geocodifica `"<bairro>, <cidade>"` com `geocodeEndereco` (lib/maps); sem coordenadas → `{ ok:false, campo:"bairro", erro:"Não achamos esse bairro. Confira o nome e a cidade." }`; cria/atualiza `PerfilPrestador`, `role` vira `AMBOS` se era `CONTRATANTE`, `modoAtual = PRESTADOR`.
  - Rotas: `PATCH /api/contas/perfil`, `PATCH /api/contas/modo`, `PUT /api/contas/prestador` (sessão + zod + rate limit 10/10min).
  - **Perfil** (ordem): foto grande + nome + "Membro desde <mês/ano>"; `TrocarModo` (dois botões grandes "Modo cliente" / "Modo prestador", atual marcado; se precisar virar prestador → leva a `/quero-fazer-bicos`); "Quero fazer bicos" (só se ainda não for prestador); "Meus dados" (`EditarDados`: nome, celular, email somente leitura, "Trocar foto"); "Aparência" (`SeletorTema` da Fase 1); "Notificações" (`BotaoNotificacoes`); "Sair" (`signOut({ callbackUrl: "/" })`).
  - **Quero fazer bicos** (3 telas com `BarraProgresso`): 1 categorias (chips de seleção múltipla, 1–5), 2 região (bairro, cidade com padrão "Belém", raio 5/10/20/30 km em botões), 3 preço inicial (opcional, "Prefiro combinar na conversa") + bio curta opcional → "Começar a fazer bicos" → `update()` → `/prestador` (pode dar 404 até a Fase 3; ruling: mostrar `/perfil` com aviso de sucesso até lá).
  - Menu inferior usa `session.user.modoAtual` (sem sessão → cliente).

- [ ] **Step 1: Testes que falham:** `trocarModo` para PRESTADOR sem perfil → `precisaVirarPrestador`; `virarPrestador` com `geocodeEndereco` mockado retornando coordenadas cria `PerfilPrestador`, muda `role` de `CONTRATANTE` para `AMBOS` e `modoAtual` para `PRESTADOR`; com `null` → erro no campo `bairro`; `atualizarPerfil` com celular de outra conta → `campo:"telefone"`; `TrocarModo` mostra o modo atual com `aria-pressed="true"`.
- [ ] **Step 2:** testes → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run test:integracao`, `npx tsc --noEmit` → todos limpos.
- [ ] **Step 5: Verificação no navegador:** Perfil completo nos dois temas; trocar tema, editar nome, trocar foto; virar prestador pelos 3 passos e ver o menu mudar para 5 itens; voltar ao modo cliente.
- [ ] **Step 6: Commit** — `feat: perfil, troca de modo e cadastro de prestador`.

### Task 10: Verificação final da fase

- [ ] **Step 1:** `npm test`, `npm run test:integracao`, `npx tsc --noEmit`, `npm run build` (com o servidor de dev parado) → tudo verde.
- [ ] **Step 2:** Leitor de tela/teclado no cadastro inteiro: ordem do Tab, mensagens de erro lidas (`role="alert"`), foco no primeiro erro.
- [ ] **Step 3:** Mostrar ao Kazuo e anotar ajustes.
