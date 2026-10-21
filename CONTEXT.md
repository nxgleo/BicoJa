# CONTEXT.md — Projeto BicoJá

> [!NOTE]
> Mapa do projeto: o que existe, onde está e as regras que valem. É a referência central para front e back.
> **Fonte da verdade:** o código. O banco completo está em `Prisma/schema.prisma`; a explicação para iniciantes, em `docs/explicacao-do-back-end.md`; o que falta no back, em `docs/pendencias-para-o-amigo.md`.
> Atualizado em 21/10/2026 (depois das Fases 2 a 6 do front novo).

---

## 1. Visão Geral do Projeto

O **BicoJá** é um marketplace de serviços locais ("bicos"): conecta quem precisa de um serviço a prestadores da região, com mapa, conversa, pagamento protegido e avaliação.

- **Público:** pessoas com pouca intimidade com o celular. Textos curtos e simples, botões grandes, tudo acessível (leitor de tela, teclado, contraste).
- **Dois lados na mesma conta:** a pessoa escolhe ser **cliente**, **prestador** ou **os dois**, e troca de modo pelo menu.

**A jornada de um bico:**
1. O cliente busca um prestador perto (ou publica um **pedido**, normal ou **urgente**).
2. Os dois **conversam** no chat. O prestador manda uma **proposta** (valor + quando).
3. O cliente aceita: vira um **contrato** ("Combinado"). Os dois veem o telefone e o endereço um do outro.
4. O cliente escolhe o **pagamento**: PIX ou cartão pelo app (fica guardado) ou direto com o prestador.
5. O cliente recebe um **código de 4 números** e passa ao prestador quando o serviço termina.
6. O prestador digita o código: o serviço fica **concluído** e o dinheiro é liberado.
7. Os dois se **avaliam** com estrelas. O prestador vê tudo em **Ganhos**.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Função |
| :--- | :--- | :--- |
| **Front-End** | Next.js 15 (App Router), React 19, Tailwind CSS v4, fonte Nunito, ícones `lucide-react` | Telas, SSR, tema claro/escuro |
| **PWA** | `public/sw.js` (service worker próprio, sem Workbox) | Funciona sem internet (últimas páginas públicas) e recebe push |
| **Back-End** | Rotas `app/api/**` + servidor próprio `server.js` com Socket.IO | APIs HTTP e chat em tempo real |
| **Banco de Dados** | PostgreSQL + PostGIS, Prisma 5.22 | Dados e busca por distância |
| **Cache e limites** | Redis (`ioredis`) | Limite de tentativas (`limitar`) e cache da busca |
| **Login** | NextAuth.js (Credentials + JWT) | Entrar com email **ou** celular |
| **Validação** | zod | Todo dado que chega numa rota é conferido |
| **Imagens** | sharp | Fotos viram `.webp`, sem dados escondidos (EXIF/GPS) |
| **Notificações** | web-push (VAPID) | Push no celular, sem o conteúdo das mensagens |
| **Email** | nodemailer | Códigos. Sem `SMTP_HOST`, o email aparece no terminal |
| **Externas** | OpenStreetMap Nominatim; Mercado Pago (**ainda simulado**) | Endereço → coordenadas; pagamento |
| **Testes** | Vitest, Testing Library, axe-core | Unidade, integração (banco de teste) e acessibilidade |

---

## 3. Banco de Dados (`Prisma/schema.prisma`)

### Tabelas

| Tabela | Para que serve |
| :--- | :--- |
| `User` | Conta: nome, email, celular (único), senha (hash), foto (`image`), `role`, `modoAtual`, `emailVerified` |
| `Account`, `Session`, `VerificationToken` | Padrão do NextAuth (a sessão de verdade é JWT) |
| `CodigoVerificacao` | Códigos de 6 números do email (cadastro e recuperar senha), guardados com hash |
| `PerfilPrestador` | Serviços que faz, raio de atendimento, preço, "disponível agora" |
| `EnderecoUsuario` | Endereço com ponto no mapa (PostGIS) |
| `Servico` | **Anúncio** do prestador (categoria, fotos, ativo, localização) |
| `Pedido` | Pedido publicado pelo cliente (normal ou urgente) |
| `Conversa` | Chat entre um cliente e um prestador (um par = uma conversa) |
| `Mensagem` | Texto, foto (1 por mensagem), proposta ou aviso do sistema |
| `Contrato` | Serviço combinado: valor, data, pagamento, código, cancelamento, prazos |
| `Avaliacao` | Estrelas + comentário, uma por pessoa por contrato |
| `Aviso` | Avisos do sininho (dentro do app) |
| `Bloqueio`, `Denuncia` | Segurança no chat (as denúncias ainda não têm tela de revisão) |
| `PushSubscription` | Celulares inscritos para receber push |
| `Proposta` | **Antiga** (do primeiro back). O front novo não usa: a proposta agora vive no chat |

### Situações (enums)

| Enum | Valores |
| :--- | :--- |
| `Role` / `Modo` | `CONTRATANTE` `PRESTADOR` `AMBOS` / `CLIENTE` `PRESTADOR` |
| `StatusPedido` | `ABERTO` → `FECHADO` ou `CANCELADO` |
| `TipoQuando` | `DIA_CERTO` `ENTRE_DIAS` `QUALQUER_DIA` |
| `TipoMensagem` | `TEXTO` `PROPOSTA` `SISTEMA` |
| `StatusPropostaChat` | `PENDENTE` → `ACEITA`, `RECUSADA` ou `SUBSTITUIDA` (contraproposta) |
| `StatusContrato` | `COMBINADO` → `CONCLUIDO` ou `CANCELADO` |
| `MetodoPagamento` | `PIX` `CARTAO` `DIRETO` |
| `StatusPagamento` | `PENDENTE` → `RETIDO` (guardado no app) → `LIBERADO` ou `ESTORNADO`; ou `DIRETO` |

### Migrações (`Prisma/migrations`)

Quatro do primeiro back (até `20261003190724_add_push_subscriptions`) e quatro novas: `contas_fase2`, `descoberta_fase3`, `chat_fase4`, `contrato_fase5`.
Para criar uma nova: `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --script` e depois `migrate deploy`.

---

## 4. Estrutura de Pastas

```
app/
  (app)/         telas com o menu: início, buscar, pedidos, conversas, contratos,
                 avisos, perfil, prestador/(anuncios|servicos|ganhos), prestadores/[id], servicos/[id]
  (conta)/       entrar, cadastro (+ codigo, foto, pronto), esqueci-senha
  offline/       tela "Sem internet"
  api/           rotas (seção 5)
components/      telas em pedaços, por assunto: ui, layout, conta, chat, contratos, avisos,
                 pedidos, prestador, perfil, endereco, publico, notificacoes, pwa, inicio
lib/             regras do negócio (recebem `prisma` como argumento, por isso dá para testar)
  contas/ chat/ contratos/ pedidos/ anuncios/  +  auth, push, imagens, servicos, seguranca, ...
  cliente/       código que roda no navegador (api.ts, socket.ts)
Prisma/          schema.prisma + migrations
public/sw.js     service worker (sem internet + push)
server.js        Next + Socket.IO + chamada dos prazos a cada 15 min
middleware.ts    manda para entrar / passo que falta; encerra a sessão de cadastro pela metade (lib/contas/etapa.ts)
scripts/dados-teste.mjs  cria contas e dados de exemplo
docs/            explicação do back para iniciantes + pendências para o Leo
uploads/         fotos enviadas (fora do Git)
```

**Padrão:** a rota em `app/api` só confere o login, valida com zod e aplica o limite (`limitar`). A regra de verdade fica em `lib/`.

### Scripts do `package.json`

| Comando | O que faz |
| :--- | :--- |
| `npm run dev` | Liga o site em `http://localhost:3000` (`node server.js`) |
| `npm run build` / `npm start` | Versão de produção |
| `npm test` | Testes rápidos (177) |
| `npm run test:integracao` | Testes com banco (85), usam `banco_servicos_teste` do `.env.test` |
| `npx prisma generate --schema Prisma/schema.prisma` | Rodar à mão depois do `npm install`. No Windows, pare o `npm run dev` antes (senão dá EPERM) |

### Variáveis do `.env` (modelo em `.env.example`)

`DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (também protege o código de conclusão e as rotas internas), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SMTP_*` e `EMAIL_REMETENTE` (opcionais), `CONFIRMAR_EMAIL`.

> [!IMPORTANT]
> **`CONFIRMAR_EMAIL=nao`** (como está agora, para testar) pula o código do email no cadastro: toda conta conta como confirmada. Sem a variável, ou com `sim`, o código volta a ser pedido. **Em produção, use `sim`.**

---

## 5. Rotas e Endpoints (`app/api`)

🔒 = precisa estar logado · ✅ = precisa ter o cadastro completo · 🔑 = rota interna (cabeçalho `x-chave-interna`)

### Conta
| Rota | Métodos | O que faz |
| :--- | :--- | :--- |
| `/auth/[...nextauth]` | — | Login do NextAuth (email ou celular + senha, com limite de tentativas) |
| `/contas/cadastro` | POST | Cria a conta (e manda o código, se `CONFIRMAR_EMAIL` estiver ligado) |
| `/contas/codigo/enviar` · `/confirmar` | POST 🔒 | Manda / confere o código do email |
| `/contas/email` | PATCH 🔒 | Corrige o email enquanto ainda não foi confirmado |
| `/contas/senha/recuperar` · `/redefinir` | POST | Esqueci a senha (código por email) |
| `/contas/foto` | POST 🔒 | Foto de perfil |
| `/contas/perfil` | PATCH 🔒 | Nome e celular |
| `/contas/modo` | PATCH 🔒 | Troca entre cliente e prestador |
| `/contas/endereco` | GET PUT 🔒 | Meu endereço |
| `/contas/prestador` | PUT 🔒 | "Quero fazer bicos" (serviços, onde atende, preço) |
| `/prestador/disponivel` | PATCH 🔒 | "Disponível agora" |

### Descoberta, anúncios e pedidos
| Rota | Métodos | O que faz |
| :--- | :--- | :--- |
| `/anuncios` · `/anuncios/[id]` | POST GET · PATCH 🔒 | Anúncios do prestador |
| `/pedidos` · `/pedidos/[id]` | POST GET · GET PATCH 🔒 | Pedidos do cliente (urgente avisa prestadores perto por push) |
| `/arquivos/imagens` | POST 🔒 | Envia foto (anúncio, pedido, chat) |
| `/arquivos/[pasta]/[nome]` | GET | Mostra a foto. As do chat só para quem está na conversa |

### Conversa (chat)
| Rota | Métodos | O que faz |
| :--- | :--- | :--- |
| `/conversas` | GET POST ✅ | Minhas conversas / começar uma |
| `/conversas/nao-lidas` | GET ✅ | Número da bolinha |
| `/conversas/[id]` | GET ✅ | Mensagens (50 por página) |
| `/conversas/[id]/mensagens` | POST ✅ | Texto (até 2000 letras) ou 1 foto |
| `/conversas/[id]/propostas` · `/[mensagemId]` | POST ✅ | Mandar proposta · aceitar/recusar |
| `/conversas/[id]/lida` | POST ✅ | Marca como "visto" |
| `/conversas/[id]/bloqueio` | POST DELETE ✅ | Bloquear / desbloquear |
| `/conversas/[id]/denuncia` | POST ✅ | Denunciar (motivos prontos) |

### Serviço combinado, avisos e push
| Rota | Métodos | O que faz |
| :--- | :--- | :--- |
| `/contratos/[id]` | GET ✅ | Detalhes do serviço combinado |
| `/contratos/[id]/pagamento` | POST ✅ | Cliente escolhe PIX, cartão ou direto (**simulado**, sem dados de cartão) |
| `/contratos/[id]/concluir` | POST ✅ | Prestador digita o código de 4 números |
| `/contratos/[id]/cancelar` | POST ✅ | Cancelar com motivo pronto (estorna se estava retido) |
| `/contratos/[id]/avaliacao` | POST ✅ | Estrelas + comentário |
| `/avisos` · `/avisos/lidos` | GET · POST 🔒 | Sininho |
| `/notificacoes/inscrever` | POST DELETE 🔒 | Ligar / desligar push neste celular |
| `/notificacoes` | POST 🔑 | Mandar push (só o próprio servidor) |
| `/interno/prazos` | POST 🔑 | Prazos automáticos (chamada pelo `server.js` a cada 15 min) |

### Rotas antigas (do primeiro back, o front novo não usa)
`/register`, `/servicos`, `/servicos/[id]`, `/propostas`, `/propostas/[id]`, `/pagamentos/simular`. Os problemas delas estão em `docs/pendencias-para-o-amigo.md`.

### Tempo real (`server.js` + Socket.IO)
- Só conecta quem está logado (cookie do NextAuth) e vem do próprio site.
- Cada pessoa fica na sala `user:<id>`.
- Eventos: `chat:mensagens`, `chat:lida`, `chat:digitando`, `contrato:mudou`, `aviso:novo`.

---

## 6. Regras de Negócio

> [!IMPORTANT]
> Valem para qualquer rota nova.

**Cadastro e login**
- Passos: dados → código do email → foto (opcional) → pronto.
- O código do email pode ser desligado com `CONFIRMAR_EMAIL=nao`.
- Sem o email confirmado, a pessoa não conversa nem combina serviço (✅).
- A foto **não é obrigatória**: dá para "Pular por agora" e pôr depois no Perfil. Sem foto aparece a inicial do nome.
- As telas Entrar e Cadastro sempre abrem do começo. Se a pessoa cria a conta e sai antes de digitar o código, essa sessão pela metade é encerrada (`deveEncerrarSessao` no `middleware.ts`): ao voltar, começa pelo login, e o código é pedido depois de entrar.
- Código do email: 6 números, vale 10 minutos, 1 envio por minuto, 5 tentativas.

**Busca:** prestadores perto primeiro (PostGIS, até 30 km). O endereço vira coordenadas pelo Nominatim (tempo limite de 8 s).

**Pedido urgente:** precisa ser para as próximas 3 horas. Avisa por push até 50 prestadores disponíveis perto.

**Chat**
- Bloqueio impede mensagens nos dois sentidos.
- Telefone e endereço só aparecem depois de "Combinado".
- O push nunca leva o texto da mensagem.

**Pagamento e código**
- PIX ou cartão ficam **retidos** até o código.
- O código de 4 números é guardado criptografado (AES-256-GCM) e só o cliente vê.
- 5 erros bloqueiam por 15 minutos. Máximo de 30 tentativas por dia por pessoa.
- Taxa da plataforma: `TAXA_PLATAFORMA_PERCENTUAL` (hoje 0%).

**Prazos automáticos (a cada 15 min)**
- 3 dias depois da data, o cliente pode dizer "não aconteceu".
- 7 dias depois, o pagamento retido é liberado ao prestador.

**Cancelamento:** com motivo pronto. Estorna o que estava retido e avisa a outra pessoa.

**Avaliação:** só depois de concluído, uma por pessoa, aparece no perfil e no topo do chat.

**Limites (Redis)**
- Toda rota que grava tem `limitar(chave, quantidade, segundos)`, por pessoa (ou por IP quando ainda não há login).
- Exemplos: cadastro 20 a cada 10 min por IP; mensagens 40 por minuto; pedidos 10 por hora; denúncias 10 por dia.

---

## 7. Padrão de Respostas da API

As rotas novas respondem assim:

```json
// Sucesso (200/201): os dados direto, por exemplo
{ "ok": true }

// Erro (400, 401, 403, 404, 409, 429, 500)
{ "ok": false, "erro": "Frase simples para mostrar à pessoa.", "campo": "email" }
```

- `campo` (opcional) diz qual campo do formulário focar.
- Algumas respostas trazem `destino` (para onde mandar a pessoa, por exemplo `/cadastro/codigo`).
- As rotas antigas do primeiro back usam outro formato (`success` / `data` / `error`).

---

## 8. Roadmap e Progresso

- [x] Ambiente (Docker: PostgreSQL + PostGIS + Redis), Prisma, NextAuth
- [x] **Fase 1:** visual novo (cores, fonte, tema escuro, menu, acessibilidade básica)
- [x] **Fase 2:** contas (cadastro em passos, código no email, foto, esqueci a senha, perfil, troca de modo)
- [x] **Fase 3:** descoberta (busca por distância, anúncios, pedidos normal/urgente, endereço, "quero fazer bicos")
- [x] **Fase 4:** chat (tempo real, foto, proposta/contraproposta, visto, digitando, bloquear, denunciar)
- [x] **Fase 5:** pagamento simulado, código de conclusão, cancelamento, avaliações, Ganhos, avisos
- [x] **Fase 6:** PWA sem internet, push seguro, revisão de acessibilidade (axe), docs para o Leo
- [x] **Simplificação para testar (21/10/2026):** confirmação do email desligável (`CONFIRMAR_EMAIL`) e foto opcional

**Ainda falta** (detalhes em `docs/pendencias-para-o-amigo.md`):
- [ ] Mercado Pago de verdade
- [ ] Verificação do celular (SMS)
- [ ] Tela de administrador para denúncias
- [ ] Derrubar sessões antigas ao trocar a senha
- [ ] CSP com *nonce*
- [ ] Testes de ponta a ponta (Playwright, adiado)
- [ ] Religar `CONFIRMAR_EMAIL=sim` e configurar o SMTP antes de publicar
- [ ] Apagar as rotas antigas e `lib/socket.ts`

---

## 9. Segurança

- **Login e sessão:** senha com bcrypt; limite de tentativas de login; JWT do NextAuth; endereço de volta (`voltar`) só aceita páginas do próprio site (`caminhoSeguro`).
- **Dados:** toda entrada passa pelo zod; cada rota confere se a pessoa é dona do que está mexendo (conversa, contrato, pedido, anúncio).
- **Fotos:** só JPEG/PNG/WebP até 5 MB, convertidas para WebP sem metadados; as do chat são privadas.
- **Chat:** socket só com login e do mesmo site; a pessoa só recebe da própria sala.
- **Cabeçalhos** (`lib/seguranca.ts`): CSP (`connect-src 'self'`), sem iframe, etc. Ainda usa `'unsafe-inline'` nos scripts.
- **Rotas internas:** só com `x-chave-interna` = sha256(`"<uso>:" + NEXTAUTH_SECRET`). Sem a chave respondem 404.
- **Sair da conta:** limpa o socket, o push deste celular, as páginas guardadas e o `sessionStorage`.
- **Sem internet:** páginas privadas (conversas, contratos, perfil, avisos, entrar, cadastro) e fotos do chat **nunca** ficam guardadas.
- **Correções do primeiro back** já feitas: socket inseguro, push sem login, inscrição de push com `userId` de outra pessoa. As que ainda faltam estão em `docs/pendencias-para-o-amigo.md`.
