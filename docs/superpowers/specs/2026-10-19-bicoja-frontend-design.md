# BicoJá — Design do novo front end (e partes novas do back end)

Data: 2026-10-19 · Autores da decisão: Kazuo (produto/front) · Redigido com Claude

Base de código: `main` do GitHub `nxgleo/BicoJa` (commit `b1c5061`), trazida para a pasta local em 2026-10-19. O front antigo (mock + `localStorage`) será descartado; backup em `Downloads/BicoJa-backup-antes-do-github`.

Legenda: **[Kazuo]** = decidido por ele · **[Claude]** = decisão minha, que ele pode revisar.

---

## 1. Intenção e o porquê

O BicoJá liga quem precisa de um bico a quem faz bicos, em Belém para começar. O público dos **dois lados** tem baixa inclusão digital. O site precisa ser bonito e moderno, mas o critério que vence qualquer empate é: **uma pessoa pouco acostumada com internet consegue resolver sozinha, sem burocracia.** [Kazuo]

Cena-guia: alguém com a pia vazando, com pressa, abre o link no celular, escreve "minha pia tá vazando" e em poucos toques está conversando com um encanador perto, com nota e preço visíveis. Do outro lado, alguém que ouviu falar do BicoJá consegue se cadastrar como prestador guiado passo a passo, sentindo que seus dados estão seguros. [Kazuo]

Referência de sensação: Uber, iFood — fluxo curto, confiança por avaliações, código de conclusão, notificações. [Kazuo]

## 2. Objetivos

1. Refazer **todo** o front: visual novo, acessível, "smooth". [Kazuo]
2. Mercado de **dois lados independentes**: prestador anuncia serviço; cliente publica pedido (normal ou urgente). [Kazuo]
3. **Chat** em tempo real entre cliente e prestador, que continua aberto **depois** de fechar negócio e pagar (avisar horário, mudanças). [Kazuo]
4. **Avaliações** dos dois lados, liberadas só após conclusão. [Kazuo]
5. **Pagamento** pelo app (PIX ou cartão, valor retido e liberado na conclusão, estornado se cancelar) ou "paguei direto". Tudo simulado por enquanto. [Kazuo]
6. **Código de conclusão** estilo iFood. [Kazuo]
7. **PWA** instalável, celular primeiro, funcionando também no computador. [Kazuo]
8. Segurança no front e nas partes novas do back. [Kazuo]
9. No fim: explicação didática de cada parte do back end criada + lista de pendências do back para o amigo. [Kazuo]

## 3. Não-objetivos (por agora)

- Geolocalização refinada, Mercado Pago real, SMS — virão depois. [Kazuo] Mantemos o que já existe (Nominatim, pagamento simulado).
- App de loja (Android/iOS). [Kazuo, após recomendação]
- Busca com IA. [Kazuo]
- Áudio e vídeo no chat — virão depois. [Kazuo]
- Painel de administração/moderação. [Claude]
- Mexer nas rotas antigas do amigo além do estritamente necessário (ver §9).

## 4. Anti-objetivos (seria fracasso mesmo "funcionando")

- Formulário comprido ou jargão ("submeter", "requisição", "status") — o público desiste.
- Letra pequena, botão pequeno, ícone sem texto, contraste fraco.
- Telefone/email/endereço de alguém expostos antes de fechar negócio.
- Sessão guardada em `localStorage` ou qualquer "login de mentira".
- Animações que atrasam ou enjoam; nada pode depender de animação para ser entendido.

## 5. Visual

- **Estilo:** base da opção A (acolhedor: cantos arredondados, blocos laranja-claro) + limpeza da C, com o botão de urgência e "Disponíveis agora" da B. Mockup aprovado: `.superpowers/brainstorm/.../home-e-logo-v2.html`. [Kazuo]
- **Logo:** a original enviada pelo Kazuo (quadrado laranja, martelo cinza-azulado, "BicoJá"). [Kazuo] Arquivo vai para `public/` e gera os ícones do PWA.
- **Cores** (tiradas do logo): laranja `#E8770C` (marca, fundos, ícones), laranja escuro `#C25E05` / `#9A4A06` para texto e botões com texto (contraste AA), laranja-claro `#FFF4E8` (blocos), cinza-azulado `#5E7889`, grafite `#2B3640`/`#1F2937` (texto), vermelho `#DC2626` **só** para urgência e erros, verde `#16A34A` para "online"/sucesso. Fundo branco. [Kazuo: branco/laranja/cinza; tons exatos: Claude]
- **Fonte:** Nunito (arredondada, a da opção A). Base **17px**, títulos 22–26px, nada abaixo de 14px. [Kazuo: tamanho "adequado, nem pequeno nem imenso"; números: Claude]
- **"Preciso de ajuda agora":** vermelho, um pouco menor que no mockup v2. [Kazuo]
- **Categorias:** chips que arrastam para o lado. [Kazuo]
- **Ícones:** desenhados (biblioteca `lucide-react`), sempre acompanhados de texto. [Claude]
- **Sensação "smooth":** transições curtas (150–250ms) em toques, abrir/fechar painéis e troca de tela; esqueleto de carregamento em vez de tela branca; respeita "reduzir movimento" do sistema. [Claude]

- **Modo escuro:** segue o tema do celular por padrão, com opção manual no Perfil; mesmas cores de marca, contraste AA nos dois temas. [Kazuo]

## 6. Acessibilidade (requisitos)

- Contraste WCAG AA em todo texto. Área de toque mínima 48×48px.
- Todo ícone tem texto; todo campo tem rótulo visível (não só placeholder).
- Linguagem simples, frases curtas, verbos de ação nos botões ("Conversar", "Enviar pedido").
- Erros dizem o que fazer ("Esse email já tem conta. Quer entrar?").
- Navegável por teclado e leitor de tela (HTML semântico, `aria-*`, foco visível).
- Campos com `inputmode`/`autocomplete` certos (teclado numérico em telefone e código).
- Máscara de telefone; aceitar com ou sem pontuação.
- Uma ação principal por tela.

## 7. Contas, cadastro e modos

- **Uma conta só, com troca de modo** (cliente ↔ prestador), cada modo com seu menu. Quem escolheu só um modo no cadastro pode ativar o outro **a qualquer momento**. [Kazuo]
- Primeira tela do cadastro: "O que você quer fazer? Contratar · Trabalhar · Os dois" — só define o modo inicial. [Kazuo, a partir de proposta]
- Passos: escolha (Contratar · Fazer bicos · Os dois) → dados (nome, email, celular, senha) → **código de 6 dígitos no email** → **foto do rosto** (obrigatória para **todos**) → pronto. Cada tela explica por que pedimos o dado. **Sem CPF por enquanto** (decidido em 2026-10-20). [Kazuo]
- **Continua de onde parou:** a conta é criada no passo "dados" e a pessoa já fica logada; se fechar o app, na próxima vez é levada ao passo que falta (código ou foto). [Kazuo]
- **Entrar** com "Email ou celular" + senha. **Senha:** mínimo 8 caracteres, bloqueia senhas óbvias e que contenham o nome/email, botão "Mostrar". **Esqueci minha senha:** código de 6 dígitos no email → senha nova. **Foto:** "Tirar foto agora" (câmera frontal) ou "Escolher da galeria", com prévia e dicas. [Kazuo]
- A foto do rosto **é a foto de perfil pública** (aparece no perfil, resultados e chat, para a pessoa saber quem vai chegar). Uma foto só. A tela diz isso claramente; não dizer que a foto é "protegida". [Kazuo]
- Usuários já existentes no banco (dados de teste): campos novos ficam opcionais no banco; quem entrar sem foto ou email verificado é levado a "Termine seu cadastro" antes de conversar, publicar ou contratar. A rota antiga `/api/register` não é apagada, só deixa de ser usada pelo front. [Claude]
- Virar prestador fica óbvio: cartão fixo no Início ("💰 Quer ganhar dinheiro fazendo bicos?" + botão **"Quero fazer bicos"**) e o mesmo botão "Quero fazer bicos" no Perfil, levando a 3 telas: o que você faz (categorias), região que atende, preço inicial. [Kazuo, a partir de proposta]
- **Navegar não exige login**; login aparece ao conversar, publicar ou contratar. [Kazuo]
- Envio de email: [Claude] `nodemailer` com SMTP configurável no `.env`; sem SMTP configurado (desenvolvimento), o código é impresso no terminal do servidor.
- Limites anti-spam: [Claude] 1 conta por email e 1 por telefone; rate limit no cadastro e no envio de código; código expira em 10 min, máx. 5 tentativas.

## 8. Telas e caminhos

Menu inferior — **modo cliente:** Início · Pedidos · Conversas · Perfil. **Modo prestador:** Início · Serviços · Conversas · Ganhos · Perfil. [Claude, mostrado no mapa sem objeção]

**Público / cliente**
1. **Início** — saudação (sem bairro no topo [Kazuo]); "O que você precisa resolver hoje?" + busca; 🚨 "Preciso de ajuda agora"; categorias arrastáveis; "Disponíveis agora"; "Não achou? Publique seu pedido"; cartão "Quer ganhar dinheiro fazendo bicos?".
2. **Busca/Resultados** — texto livre vira categoria por **dicionário de palavras** (tolera erro e falta de acento). [Kazuo] Resultados: anúncios e prestadores perto, ordenados por distância e nota.
3. **Perfil do prestador** — foto, nota, avaliações, serviços/anúncios, preço inicial, bairro; botão "Conversar".
4. **Pedido urgente** — tela curta: categoria, descrição, foto opcional, enviar. Prestadores próximos são avisados e respondem no chat. [Kazuo]
5. **Publicar pedido** (normal) — descrição, foto, endereço, e **quando**: data e horário fixos, **ou** uma janela flexível (de tal dia até tal dia, de tal hora até tal hora), **ou** "qualquer dia". [Kazuo]
6. **Meus pedidos** — pedidos publicados e serviços combinados/em andamento/concluídos.
7. **Conversas** e **Chat** (ver §10).
8. **Pagamento**, **Código de conclusão**, **Avaliação** (ver §11).
9. **Perfil** — dados, foto, trocar de modo, **tema claro/escuro**, sair, "Quero fazer bicos".
10. **Entrar** e **Cadastro** (wizard da §7).

**Prestador**
1. **Início do prestador** — pedidos perto de mim em **duas abas separadas: "Urgentes" e "Pedidos"** (urgentes não ficam sempre na frente dos normais; aba Urgentes mostra contador). [Kazuo] Interruptor "Estou disponível agora". [Claude]
2. **Meus anúncios** — criar, editar, pausar (usa as rotas `/api/servicos` existentes).
3. **Serviços** — combinados, em andamento, concluídos; digitar código de conclusão.
4. **Ganhos** — valores retidos e liberados.
5. **Perfil público** — como o cliente vê, com avaliações.

## 9. Partes novas do back end

Kazuo decidiu que eu (Claude) crio essas partes agora. [Kazuo] Modelo de dados — formatos são minha proposta [Claude]:

- **User** (+ campos): `telefone` único, `modoAtual`; a foto usa o campo `image` que já existe.
- **PerfilPrestador**: `userId`, `bio`, `categorias[]`, `bairro`, `latitude/longitude`, `raioKm`, `precoBase`, `disponivel` (bool), `ultimoSinal`.
- **CodigoVerificacao**: `userId`, `codigoHash`, `expiraEm`, `tentativas`.
- **Pedido** (feito pelo cliente): `clienteId`, `titulo`, `descricao`, `categoria`, `urgente`, `fotoUrl?`, `bairro`, `lat/lng`, `dataInicio`, `dataFim`, `horaInicio`, `horaFim`, `flexivel` (qualquer dia), `status` (ABERTO/FECHADO/CANCELADO).
- **Servico** (+ campo): `categoria`, `ativo`.
- **Conversa**: dois participantes, origem opcional (`servicoId` ou `pedidoId`).
- **Mensagem**: `conversaId`, `autorId`, `tipo` (TEXTO/PROPOSTA/SISTEMA), `texto`, `fotoUrl?`, `valor?`, `dataCombinada?`, `propostaAnteriorId?` (contraproposta), `statusProposta?`, `lidaEm?`.
- **Contrato** (o "serviço fechado"): cliente, prestador, valor, data, origem, conversa; `status` (COMBINADO/CONCLUIDO/CANCELADO); `metodoPagamento` (PIX/CARTAO/DIRETO); `statusPagamento` (PENDENTE/RETIDO/LIBERADO/ESTORNADO/DIRETO); `taxaPlataforma` (% e valor, 0 por enquanto); `codigoConclusaoHash`.
- **Avaliacao**: `contratoId`, `autorId`, `avaliadoId`, `nota` 1–5, `comentario`; uma por pessoa por contrato.
- **Categorias**: lista fixa no código (Consertos, Elétrica, Encanamento, Pintura, Montagem, Limpeza, Mudança, Jardim, Outros) + dicionário de palavras. [Claude]

Rotas novas (todas com sessão, validação com `zod` e rate limit): cadastro em etapas + verificação de email, upload de foto, perfil prestador, pedidos (CRUD + "perto de mim" por raio usando PostGIS como em `/api/servicos`), conversas/mensagens, proposta no chat (aceitar/recusar → cria Contrato), pagamento simulado (reter/liberar/estornar), conclusão por código, avaliações, perfil público com média de notas.

**Sobre o modelo `Proposta` antigo:** a proposta passa a viver dentro do chat (`Mensagem` tipo PROPOSTA → `Contrato`). O modelo e as rotas antigas de `Proposta` e `pagamentos/simular` **não são apagados**, só deixam de ser usados pelo front. [Claude] — o amigo decide depois se remove.

**Socket.IO:** hoje qualquer pessoa pode entrar na "sala" de outro usuário mandando o id dele (`join-room`), o que vazaria o chat. Vou fazer o socket identificar o usuário pelo cookie de sessão do NextAuth e só deixá-lo entrar na própria sala e nas conversas de que participa. [Claude — necessário para o chat ser seguro]

## 10. Chat

- Começa quando um dos dois toca "Conversar" no perfil/anúncio/pedido do outro. [Kazuo]
- Tempo real via Socket.IO; mensagens também salvas no banco; indicador de não lidas.
- **Proposta** é um cartão dentro do chat (valor + dia/janela) com três botões: **"Aceitar"**, **"Negociar"** (abre o mesmo cartão para editar valor/data e mandar uma contraproposta) e **"Recusar"** (recusa só aquela proposta; a conversa continua aberta). Aceitar cria o Contrato e mostra "Combinado ✔". [Kazuo; textos: Claude]
- **Bolha de conversa flutuante:** enquanto a pessoa tem uma conversa ativa e sai da tela do chat, aparece um ícone redondo de chat no canto inferior direito (acima do menu), com contador de não lidas; tocar volta para aquela conversa. Pode ser dispensado. [Kazuo; posição exata: Claude]
- Telefone e endereço só aparecem depois de "Combinado". [Claude]
- O chat **continua aberto depois** de combinar e pagar. [Kazuo]
- **Os dois lados** podem enviar proposta. Uma conversa pode gerar mais de um contrato com o tempo (serviço repetido). Ao aceitar uma proposta ligada a um pedido, o pedido vira FECHADO e as outras conversas daquele pedido recebem a mensagem de sistema "Esse pedido já foi fechado". [Claude]
- **Pedido urgente** avisa prestadores da categoria com "Estou disponível" ligado, dentro do raio de atendimento de cada um. [Claude]
- Notificação (push + no app) para mensagem nova, proposta, pedido urgente perto, pagamento e conclusão.
- Texto e **foto** agora (reaproveita o upload seguro); **áudio e vídeo depois**. [Kazuo: áudio/foto/vídeo se der; recorte: Claude]

## 11. Pagamento, conclusão e avaliação

- Após "Combinado", o cliente escolhe: **PIX** ou **cartão** pelo app (simulado; valor fica RETIDO) ou **"Vou pagar direto"** (dinheiro/PIX pessoal; o app só registra). [Kazuo]
- No dia, o cliente vê um **código de 4 dígitos** no app; o prestador digita no app dele → Contrato CONCLUIDO → pagamento LIBERADO. [Kazuo]
- Se cancelar antes da conclusão, o valor retido vai para ESTORNADO. [Kazuo]
- **Regras de cancelamento estilo iFood** [Kazuo]:
  - Qualquer um dos dois pode cancelar antes do código ser digitado → valor retido volta ao cliente. Em "pago direto", cancelar só encerra o contrato.
  - Passados **3 dias da data combinada** sem código, o cliente ganha o botão "Não aconteceu" → cancelado + estorno.
  - Se ninguém agir em **7 dias** após a data combinada, o valor é liberado ao prestador automaticamente.
  - Prazos são verificados por uma tarefa a cada hora no `server.js` e também ao abrir o contrato. [Claude]
  - **Avisos de prazo** (push + no app) [Kazuo]: ao chegar nos 3 dias, avisa o cliente que ele já pode marcar "Não aconteceu"; 1 dia antes dos 7 dias, avisa os dois que o valor será liberado amanhã.
- **Ganhar dinheiro:** grátis agora. O sistema já guarda uma **taxa da plataforma** sobre pagamentos feitos pelo app, configurável e **em 0%** até decidirem ligar. Pagamento pelo app é destacado como "Pagamento protegido" (garantia de devolução). [Kazuo]
- Após conclusão, **os dois** são convidados a avaliar (estrelas + comentário). Avaliação só é possível em contrato concluído, uma por pessoa. [Kazuo]
- Tela de cartão: simulada, **não** guarda número de cartão em lugar nenhum. [Claude]

## 12. Segurança

- Sessão só pelo NextAuth (cookie httpOnly, JWT); `NEXTAUTH_SECRET` obrigatório no `.env`. Nada de dados de sessão em `localStorage`.
- `middleware.ts` protege páginas que exigem login e redireciona com volta para onde a pessoa estava.
- Toda rota nova confere sessão **e** dono do recurso no servidor; o front nunca manda "quem eu sou" como fonte de verdade.
- Validação com `zod` no front (mensagens amigáveis) e no back (a que vale).
- Upload: só JPG/PNG/WEBP, até 5 MB, conferindo o conteúdo real do arquivo; a imagem é regravada com `sharp`, o que **remove dados de GPS da foto**; salva fora de `public/`, servida por rota.
- Cabeçalhos de segurança (CSP, `X-Frame-Options`, `Referrer-Policy`, etc.) em `next.config`.
- React escapa texto por padrão; proibido `dangerouslySetInnerHTML` com conteúdo de usuário.
- Socket autenticado (§9). Rate limit (Redis existente) em cadastro, código, mensagens, pedidos e uploads.

## 13. PWA

- `manifest` com nome, cores e ícones gerados do logo; instalável.
- Service worker: mantém o push existente (`public/sw.js`) e acrescenta cache das telas e arquivos estáticos e uma página "Você está sem internet" amigável. [Claude: escrito à mão em vez de Workbox, para ficar mais simples de entender]
- Convite discreto "Adicionar à tela inicial" depois do primeiro uso bem-sucedido.

## 14. Localização (versão simples)

- **Por enquanto, endereço digitado à mão** (rua, número, complemento, bairro, cidade), geocodificado pelo Nominatim; GPS do navegador fica para depois. [Kazuo, 2026-10-20]
- O cliente salva **"Meu endereço" no perfil** (ou no primeiro pedido); ele preenche os pedidos e calcula as distâncias. Visitante sem conta vê os prestadores da cidade sem distância. [Kazuo]
- Prestadores só veem **bairro e distância** de um pedido; rua e número só depois de combinar. [Kazuo]
- **"Estou disponível agora"**: o prestador liga no Início dele; **desliga sozinho em 8 horas** (a tela mostra o horário). "Disponíveis agora" = ligado e dentro do prazo, perto do cliente. [Kazuo]
- **Pedido urgente** fica na aba "Urgentes" por **3 horas**; depois passa para a aba normal (o aviso ao cliente chega junto com as notificações, Fase 5). [Kazuo]
- **Fotos:** pedido até 3 fotos do problema; anúncio até 5 fotos de trabalhos feitos; mesma proteção da foto de perfil (tira EXIF/GPS). [Kazuo]

## 15. Restrições

- Next.js 15 (App Router) + servidor customizado `server.js` (Socket.IO), Tailwind v4, Prisma + PostgreSQL/PostGIS, Redis, NextAuth v4 — tudo já existente.
- Atualizar React 18 → 19 (o App Router do Next 15 é feito para React 19; NextAuth v4 é compatível). Precisa de `npm install` de qualquer forma, porque a pasta `node_modules` atual é da versão antiga. [Claude]
- Hospedagem: por enquanto um único servidor Node rodando `server.js` (como já está). Uploads em disco local. Se um dia for para servidor "serverless" ou vários servidores, será preciso armazenamento de arquivos externo e adaptador Redis no Socket.IO. [Claude]
- Dependências novas previstas [Claude]: `lucide-react`, `zod`, `nodemailer`, `sharp`, `motion` (animações). Nenhuma paga.
- Kazuo está aprendendo: código legível, comentários curtos em português onde ajudarem, nomes em português como o resto do projeto.
- Mudanças de banco via `prisma migrate` (nova migration), sem apagar dados/modelos existentes.

## 16. Deixado para quem for construir

Organização de pastas/componentes, nomes exatos de rotas, textos finais dos botões (seguindo §6), detalhes de animação, estados vazios e de erro, ordem de implementação.

## 17. Lembretes para o fim

- Explicar ao Kazuo, de forma didática, cada parte do back end criada.
- Entregar lista de pendências do back para o amigo (rotas antigas sem autenticação em notificações/pagamentos, `GET /api/propostas` público expondo contato, `.env` incompleto, etc.).
