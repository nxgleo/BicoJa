# O back end do BicoJá, explicado do zero

Este documento explica, em linguagem simples, **tudo o que foi criado no back end** junto com o front novo (Fases 1 a 6). Leia na ordem: cada parte usa as anteriores.

---

## 0. Palavras que aparecem o tempo todo

| Palavra | O que é |
|---|---|
| **Front end** | O que a pessoa vê e toca: telas, botões, formulários (pastas `app/(…)` e `components/`). |
| **Back end** | O que roda no servidor, escondido: guarda dados, confere regras e segurança (pastas `app/api/` e `lib/`). |
| **Rota (API)** | Um "endereço" que o front chama para pedir ou mandar algo. Ex.: `POST /api/conversas` = "abre uma conversa". Cada rota é um arquivo `route.ts`. |
| **GET / POST / PATCH / DELETE** | O tipo do pedido: GET = ler, POST = criar/fazer, PATCH = mudar, DELETE = apagar. |
| **Banco de dados** | Onde tudo fica guardado (PostgreSQL, rodando no Docker). |
| **Prisma** | A ferramenta que conversa com o banco. O arquivo `Prisma/schema.prisma` descreve as "tabelas" (chamadas de *models*). |
| **Migração** | Um arquivo SQL em `Prisma/migrations/` que muda o banco (criar tabela, coluna…). Roda com `npx prisma migrate deploy`. |
| **Sessão** | O "crachá" de quem está logado. Fica num cookie que o NextAuth cria ao entrar. O servidor sempre descobre **quem é** pela sessão, nunca por um id mandado pelo navegador. |
| **zod (esquema)** | Regras do que pode chegar numa rota ("o valor é número de 1 a 100 000", "o texto tem até 2000 letras"). Tudo que chega é conferido antes de usar. |
| **Rate limit (limite)** | Quantas vezes alguém pode chamar uma rota num tempo (ex.: 40 mensagens por minuto). Usa o Redis. Evita abuso e robôs. |
| **Socket (Socket.IO)** | Uma conexão sempre aberta entre o celular e o servidor, para avisos **na hora** (mensagem nova, "digitando…"). |
| **Teste de integração** | Teste que usa um banco de verdade só para testes (`banco_servicos_teste`). Arquivos `*.int.test.ts`. Rodam com `npm run test:integracao`. |

### O caminho de um pedido, do toque ao banco

```
Pessoa toca "Enviar"  →  front chama POST /api/conversas/123/mensagens
                      →  a rota confere: está logado? os dados são válidos? passou do limite?
                      →  chama a função de regra em lib/ (ex.: enviarMensagem)
                      →  a função confere: a pessoa está nessa conversa? alguém bloqueou?
                      →  grava no banco (Prisma)
                      →  avisa o outro lado pelo socket e por push
                      →  responde para o front, que mostra a mensagem
```

**Regra de ouro usada em todo o projeto:** a rota (`app/api/…/route.ts`) só cuida de "porta de entrada" (login, validação, limite). **As regras de verdade ficam em `lib/`**, em funções que recebem o `prisma` — assim dá para testar com o banco de teste.

---

## 1. Contas (Fase 2) — `lib/contas/`

**O que faz:** cadastro, código por email, foto, entrar, esqueci a senha, perfil e "Quero fazer bicos".

- **Tabelas novas:** `CodigoVerificacao` (códigos de 6 números). O `User` ganhou `modoAtual` (CLIENTE/PRESTADOR).
- **`cadastro.ts`** — cria a conta. A senha é guardada com **bcrypt** (um "embaralhamento" que não dá para desfazer; nem nós sabemos a senha).
- **`codigos.ts`** — manda o código por email. No banco fica só o **hash** do código (outra forma de embaralhar), nunca o número. Cada código aceita poucas tentativas; a contagem é "atômica" (dois toques ao mesmo tempo não ganham tentativa extra).
- **`entrar.ts`** — confere email/celular + senha. Mesmo quando a conta não existe, ele faz a conta da senha (`HASH_FALSO`), para quem tenta adivinhar não perceber pelo tempo de resposta.
- **`etapa.ts`** — decide para onde mandar a pessoa (falta o código do email?). A foto é opcional. Com `CONFIRMAR_EMAIL=nao` no `.env` (o `lib/contas/config.ts` lê essa chave), o código é pulado e toda conta conta como confirmada, para testar sem email. Usado pelo `middleware.ts`, que roda antes de cada página. Também tem o `caminhoSeguro`, que impede o golpe de mandar a pessoa para um site falso depois de entrar.
- **`lib/imagens.ts`** — toda foto passa pelo **sharp**: é convertida para WebP, diminuída e perde os dados escondidos (como a localização GPS da foto). O nome do arquivo leva o id do dono, para ninguém usar ou apagar a foto de outra pessoa.
- **Rotas:** `app/api/contas/*` (cadastro, codigo, senha, foto, perfil, modo, prestador, endereco, email).

## 2. Descoberta (Fase 3) — pedidos, anúncios, endereço

- **Tabelas novas:** `EnderecoUsuario` (endereço salvo no perfil) e `Pedido` (o que o cliente precisa, normal ou urgente). O `Servico` (anúncio) ganhou `categoria`, `ativo` (pausar) e `fotos`. O `PerfilPrestador` ganhou `disponivelAte` ("Estou disponível agora" desliga sozinho em 8 h).
- **`lib/enderecos.ts`** — transforma o endereço em latitude/longitude (Nominatim, gratuito). Se não achar a rua, usa o bairro.
- **`lib/pedidos/pedidos.ts`** — criar, listar, cancelar pedidos e a lista "perto de mim" do prestador (usa **PostGIS**, uma extensão do banco que calcula distâncias).
  - **Privacidade:** o prestador **nunca** recebe rua, número nem a localização exata do cliente; a distância vai arredondada (de 0,5 em 0,5 km), para ninguém descobrir a casa da pessoa "triangulando".
  - Urgente fica urgente por 3 horas; depois vira pedido normal.
- **`lib/anuncios/`**, **`lib/prestadores.ts`**, **`lib/servicos.ts`** — anúncios do prestador, perfil público, "Disponíveis agora" e a busca que entende "pia vazando" → encanamento.

## 3. Chat (Fase 4) — `lib/chat/`

- **Tabelas novas:**
  - `Conversa` — **uma por dupla** (quem contrata × quem trabalha). Guarda de onde veio (anúncio/pedido) e até quando cada lado leu (para "não lidas" e "visto").
  - `Mensagem` — texto, 1 foto, **proposta** (valor + quando) ou aviso do sistema.
  - `Contrato` — nasce quando alguém aceita uma proposta ("Combinado ✔").
  - `Bloqueio` e `Denuncia`.
- **`conversas.ts`** — todas as regras: começar conversa, mandar mensagem, mandar proposta (uma nova troca a que estava esperando: é o "Negociar"), aceitar/recusar, marcar como lida, bloquear, denunciar.
  - Toda função confere **se a pessoa participa da conversa** e **se ninguém bloqueou ninguém**.
  - Aceitar usa uma **transação** (tudo acontece junto ou nada acontece) e só um aceite vence, mesmo com dois toques ao mesmo tempo. Se a proposta veio de um pedido, o pedido fecha e as outras conversas dele recebem "Esse pedido já foi fechado com outra pessoa".
  - Celular e endereço só aparecem **depois** do "Combinado"; o endereço só para o prestador.
- **Fotos do chat são particulares:** a rota `GET /api/arquivos/chat/…` só entrega para quem está na conversa.
- **Links no chat não viram clicáveis**, para ninguém cair em golpe.
- **`server.js` (o servidor)** — foi reescrito na parte do socket:
  - **Antes:** qualquer um podia entrar na "sala" de outra pessoa mandando o id dela e ler o chat.
  - **Agora:** o servidor descobre quem é **pelo cookie de login**, coloca cada pessoa só na própria sala (`user:<id>`) e recusa conexões de outros sites.
  - As mensagens são enviadas pela **API** (com validação e limite); o socket só **avisa** que chegou algo.
- **`tempo-real.ts`** — função `avisar()` que as rotas usam para mandar os avisos pelo socket.

## 4. Serviço combinado (Fase 5) — `lib/contratos/`

- **O `Contrato` ganhou:** forma de pagamento, status do pagamento (PENDENTE → RETIDO → LIBERADO, ou ESTORNADO, ou DIRETO), taxa da plataforma (0% por enquanto, em `esquemas.ts`), código de conclusão, cancelamento e prazos.
- **Tabelas novas:** `Avaliacao` (1 a 5 estrelas, uma por pessoa por serviço) e `Aviso` (o sininho).
- **`contratos.ts`:**
  - **Pagamento (simulado):** só o cliente escolhe. PIX/cartão passam pelo simulador do Leo (`lib/payments.ts`) e "guardam" o valor; "pagar direto" só anota. **Nenhum dado de cartão é pedido** — quando entrar o Mercado Pago de verdade, é ele que cuida disso.
  - **Código de conclusão (estilo iFood):** 4 números, gerado ao escolher o pagamento. Fica **cifrado** no banco (`codigo.ts`, AES-256-GCM): o cliente pode ver de novo, mas quem olhar o banco não lê. O prestador digita; 5 erros bloqueiam por 15 minutos, e no máximo 30 tentativas por dia.
  - **Cancelar:** qualquer um dos dois, antes do código. O valor guardado volta para o cliente e, se veio de um pedido, o pedido reabre. O motivo aparece no chat.
  - **Prazos** (`processarPrazos`): 3 dias depois da data → o cliente pode marcar "Não aconteceu"; 6 dias → aviso "amanhã libera"; 7 dias → conclui sozinho e libera o valor. O `server.js` chama `POST /api/interno/prazos` a cada 15 minutos, com uma **chave interna** que só o servidor conhece.
  - **Ganhos:** soma o que foi recebido, o que está guardado e o que foi pago direto.
- **`lib/avaliacoes.ts`** — nota média e últimas avaliações (aparecem no perfil e no chat).
- **`lib/avisos.ts`** — cria e lista os avisos do sininho.

## 5. Sem internet e notificações (Fase 6)

- **`public/sw.js` (service worker)** — um programinha que o navegador guarda e roda mesmo sem o site aberto.
  - **Sem internet:** guarda a tela "Sem internet", o visual do site, as fotos públicas e as últimas páginas abertas. **Não guarda** conversas, o serviço combinado (que tem o código), perfil, avisos nem nada da API.
  - Ao **sair da conta**, as páginas guardadas são apagadas e as notificações deste celular são desligadas.
  - **Push:** mostra a notificação no celular. Se a pessoa já está olhando aquela conversa, não mostra.
- **`lib/push.ts`** — manda o push (usa as chaves VAPID do `.env`). O texto **nunca leva o conteúdo da mensagem** (só "Maria mandou uma mensagem"), porque aparece na tela bloqueada. Celulares que desinstalaram são apagados da lista sozinhos.
- **Quando chega push:** mensagem, foto, proposta, aceite/recusa, pagamento, conclusão, cancelamento, prazos e **pedido urgente perto** (`lib/pedidos/avisar-urgente.ts` avisa os prestadores daquela categoria, com "Estou disponível" ligado, que atendem até aquela distância).
- **Rotas de notificação do seu amigo foram corrigidas:**
  - `POST /api/notificacoes/inscrever` agora usa a conta logada (antes aceitava qualquer userId).
  - `POST /api/notificacoes` virou interna (antes qualquer pessoa mandava push para qualquer um).

---

## 6. Segurança no front e no servidor (resumo)

- **Cabeçalhos de segurança** (`lib/seguranca.ts`): o site não pode ser aberto dentro de outro site (evita golpe de "clique escondido"), só carrega scripts e conexões do próprio BicoJá, e bloqueia o microfone.
- **Nada que vem do navegador é confiado:** quem é vem da sessão; os dados passam pelo zod; cada ação confere se a pessoa pode fazer aquilo com aquele item (ex.: só participantes leem a conversa, só o cliente paga, só o prestador digita o código).
- **Limites** em tudo que pode ser abusado (mensagens, propostas, códigos, denúncias, cadastro…).
- **Textos de usuário** são mostrados como texto puro (React), então ninguém consegue "injetar" código numa mensagem.

## 7. Como rodar e testar

```bash
docker compose up -d                        # banco e Redis
npx prisma migrate deploy --schema Prisma/schema.prisma
npx prisma generate --schema Prisma/schema.prisma   # pare o "npm run dev" antes (Windows)
npm run dev                                 # http://localhost:3000
npm test                                    # testes rápidos (telas e regras)
npm run test:integracao                     # testes com o banco de teste
node --env-file=.env scripts/dados-teste.mjs  # prestadores de exemplo (contas no topo do arquivo)
```

## 8. Mapa: onde está cada coisa

| Assunto | Regras (`lib/`) | Rotas (`app/api/`) | Telas |
|---|---|---|---|
| Contas | `contas/*` | `contas/*` | `app/(conta)/*`, `perfil` |
| Endereço | `enderecos.ts` | `contas/endereco` | `components/endereco` |
| Pedidos | `pedidos/*` | `pedidos`, `pedidos/[id]` | `app/(app)/pedidos/*` |
| Anúncios | `anuncios/*`, `servicos.ts` | `anuncios/*` | `prestador/anuncios/*`, `servicos/[id]` |
| Prestador | `prestadores.ts` | `prestador/disponivel` | `prestador`, `prestadores/[id]` |
| Chat | `chat/*` | `conversas/*` | `conversas/*`, `components/chat` |
| Serviço combinado | `contratos/*`, `avaliacoes.ts` | `contratos/[id]/*`, `interno/prazos` | `contratos/[id]`, `prestador/servicos`, `prestador/ganhos` |
| Avisos e push | `avisos.ts`, `push.ts` | `avisos/*`, `notificacoes/*` | `avisos`, sininho, `public/sw.js` |
| Fotos | `imagens.ts` | `arquivos/*` | `EnviarImagens`, `EnviarFoto` |
