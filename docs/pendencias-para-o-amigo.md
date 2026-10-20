# Pendências do back end — para o Leo (nxgleo)

Lista do que encontramos no back end durante o front novo. Está dividida em: **o que ainda precisa ser feito**, **o que eu (Claude, com o Kazuo) mudei nos seus arquivos** e **o que foi criado de novo**. A explicação completa das partes novas está em `docs/explicacao-do-back-end.md`.

## A. Precisa ser feito (por ordem de importância)

1. **`GET /api/propostas` é público e mostra email e telefone dos prestadores.** Qualquer pessoa lista as propostas e pega o contato de todo mundo. Sugestão: exigir login e tirar `email`/`telefone` do `select` (o front novo não usa essa rota — a proposta agora vive no chat).
2. **`POST /api/pagamentos/simular` não confere quem está logado nem se a proposta é da pessoa.** Qualquer um "paga" a proposta de outro. O front novo usa `POST /api/contratos/:id/pagamento`; dá para apagar a rota antiga junto com `lib/payments.ts`.
3. **`POST /api/register` não valida nada** (formato do email, força da senha) e **aceita `role` vindo do corpo**. O front novo usa `POST /api/contas/cadastro` (com validação). Sugestão: apagar `/api/register` ou fazer ele usar `lib/contas/cadastro.ts`.
4. **`x-forwarded-for` é lido direto** em `pagamentos/simular`, `propostas`, `servicos` (e no limite de login em `lib/auth.ts`, `lib/contas/requisicao.ts`). Só é confiável atrás de um proxy que sobrescreve esse cabeçalho (Vercel, Nginx…). Fora disso, alguém troca o IP e escapa do limite. Decidir quando escolher onde hospedar.
5. **Sessões antigas continuam valendo depois de trocar a senha** (JWT do NextAuth não tem "derrubar todas"). Sugestão: guardar uma `versaoSessao` no `User` e conferir no callback `jwt`.
6. **Celular não é verificado** (só o email tem código). Hoje alguém pode cadastrar o celular de outra pessoa e "ocupar" o número. Precisa de SMS (pago) — decidir com o Kazuo.
7. **Denúncias não têm tela de revisão.** Ficam na tabela `Denuncia` com `revisada = false`. Precisa de uma área de administrador.
8. **Pagamento ainda é simulado.** Quando ligar o Mercado Pago: o PIX/cartão real entra em `escolherPagamento` (`lib/contratos/contratos.ts`), o estorno em `cancelarContrato` e a liberação em `concluirComCodigo`/`processarPrazos`. A taxa da plataforma está em `TAXA_PLATAFORMA_PERCENTUAL` (hoje 0).
9. **CSP com `'unsafe-inline'` nos scripts** (`lib/seguranca.ts`). Melhor trocar por *nonce* quando o site estiver estável (exige ajustar o `middleware.ts`).
10. **`npm audit` avisa sobre o `postcss`** (dependência do Next). Atualizar o Next quando sair a correção.
11. **Código morto:** `lib/socket.ts` (tem o `join-room` inseguro antigo e ninguém usa) — pode apagar. O modelo `Proposta` e as rotas `propostas/*` não são mais usados pelo front.
12. **`.env`**: o `.env.example` agora lista tudo que é preciso (`DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, chaves VAPID e SMTP). Em produção, o `NEXTAUTH_SECRET` precisa ser longo e secreto: ele também protege o código de conclusão e as rotas internas.
13. **Depois de `npm install`, rodar `npx prisma generate --schema Prisma/schema.prisma` à mão** (o npm novo não roda o postinstall do Prisma). No Windows, pare o `npm run dev` antes (senão dá EPERM).

## B. O que mudamos nos seus arquivos

| Arquivo | O que mudou | Por quê |
|---|---|---|
| `app/api/auth/[...nextauth]/route.ts` + 4 rotas | `authOptions` foi para `lib/auth.ts` | O Next 15 não aceita exportar outra coisa do arquivo de rota |
| `lib/auth.ts` | Login por email **ou** celular, limite de tentativas, sessão com `emailVerificado`, `temFoto`, `modoAtual`, `role` | Cadastro em etapas e troca de modo |
| `Prisma/schema.prisma` + migrações | Modelos novos (lista na parte C) e correção de `onDelete` antigo em `Servico`/`Proposta` | O banco estava diferente das migrações |
| `lib/maps.ts` | `geocodeEndereco` tem tempo limite de 8 s e confere `response.ok` | Sem isso, o cadastro de endereço podia travar |
| `server.js` | Socket com login pelo cookie, salas `user:<id>`, conferência de origem, "digitando…" seguro e chamada dos prazos a cada 15 min | Antes qualquer um entrava na sala de outra pessoa e lia o chat |
| `app/providers.tsx` | Tirado o `SocketProvider` antigo | Abria uma segunda conexão com o `join-room` inseguro; o chat novo tem a sua em `components/chat/ProvedorChat.tsx` |
| `app/api/notificacoes/inscrever/route.ts` | Usa a conta logada, valida a inscrição, ganhou `DELETE` | Antes dava para inscrever o celular de outra pessoa |
| `app/api/notificacoes/route.ts` | Virou rota interna (chave `x-chave-interna`) | Antes qualquer um mandava push para qualquer usuário |
| `public/sw.js` | Funcionamento sem internet + push mais seguro | PWA |
| `components/notificacoes/BotaoNotificacoes.tsx` | Não manda mais `userId`; ganhou "Desligar" | Acompanha a correção da rota |

## C. O que foi criado de novo

- **Tabelas:** `CodigoVerificacao`, `EnderecoUsuario`, `Pedido`, `Conversa`, `Mensagem`, `Contrato`, `Bloqueio`, `Denuncia`, `Avaliacao`, `Aviso` (+ campos novos em `User`, `Servico`, `PerfilPrestador`).
- **Rotas:** `contas/*`, `arquivos/*`, `pedidos/*`, `anuncios/*`, `prestador/disponivel`, `conversas/*`, `contratos/*`, `avisos/*`, `interno/prazos`.
- **Testes:** `npm test` (177) e `npm run test:integracao` (85, banco `banco_servicos_teste` do `.env.test`).

**Importante sobre o GitHub:** a conta do Kazuo (`kazu0pureza777`) ainda não tem permissão para enviar para `nxgleo/BicoJa`. Adicione ele como colaborador (Settings → Collaborators) para ele mandar todo esse trabalho.
