# E2E do app (Expo Go + adb)

Roteiro gravado para testar o app sempre do mesmo jeito. A parte automática está em
`e2e/run.sh` (usa `e2e/ui.py` para ler a tela via `uiautomator` e tocar por texto).
A parte manual (fluxos longos com desenho) está descrita abaixo, com as coordenadas que funcionaram.

## Como rodar

```bash
adb devices                       # aparelho conectado (adb wifi ou USB)
curl -s localhost:8081/status     # Metro rodando (packager-status:running)
bash e2e/run.sh                   # roda tudo, na ordem abaixo
bash e2e/run.sh notes plan        # roda só algumas seções
```

- Capturas ficam em `e2e/out/` (ignorada pelo git). Falhas geram `fail-*.png`.
- O script começa recarregando o app (tecla R duas vezes). Depois de `npm install` o primeiro bundle demora vários minutos.
- Antes de rodar, ligue **Não perturbar**: banners de outros apps aparecem nas capturas e cobrem botões.
- Coordenadas em pixels reais do aparelho (1080x2340). Captura exibida a 923x2000 = multiplicar por 1,17.
- Nunca deslize a partir do topo da tela (y < 300): abre a central de notificações do aparelho.

## Telas e modais do app

| # | Tela / modal | Como chegar | Arquivo |
|---|---|---|---|
| 1 | Bíblia (leitura) | menu lateral > Bíblia (rota `/bible`) | `screens/BibleScreen.tsx` |
| 2 | Aparência (Aa) | ícone **T** no topo da leitura | `components/modals/ReaderSettingsModal.tsx` |
| 3 | Seletor versão, livro, capítulo, versículo | chips ESV / livro / capítulo | `components/modals/GlobalBibleModals.tsx` |
| 4 | Histórico, áudio, ações do versículo, nota, adicionar ao estudo | menu ⋮ da leitura, toque no versículo | `components/modals/*` |
| 5 | Modo desenho (barra de desenho) | versículo selecionado > ícone de caneta | `components/DrawingToolbar.tsx` |
| 6 | Pesquisar | menu lateral > Pesquisar (`/search`) | `screens/SearchScreen.tsx` |
| 7 | Estudos (lista) | menu lateral > Estudos (`/studies`) | `screens/StudiesScreen.tsx` |
| 8 | Editor de estudo | tocar em um estudo (`/studies/study/[id]`) | `screens/StudyEditorScreen.tsx` |
| 9 | Anotações: Texto / Cores / Desenhos | menu lateral > Anotações (`/notes`) | `screens/NotesScreen.tsx` |
| 10 | Plano de leitura (lista e detalhe) | menu lateral > Plano de Leitura (`/reading-plan`) | `screens/ReadingPlanScreen.tsx` |
| 11 | Configurações | menu lateral > Configurações (`/configuration`) | `screens/ConfigurationScreen.tsx` |
| 12 | Lixeira de estudos | Configurações > Gerenciar estudos excluídos | `screens/TrashScreen.tsx` |
| 13 | Downloads de áudio (e por versão) | Configurações > Downloads de Áudio | `screens/DownloadsScreen.tsx`, `DownloadsBooksScreen.tsx` |
| 14 | Novidades (changelog) | Configurações > versão do app | `components/modals/BibleChangelogModal.tsx` |

## Ordem do teste

Cada passo tem o resultado esperado. A coluna **Auto** indica o que `e2e/run.sh` já confere sozinho.

### 1. Bíblia (`section_bible`) — Auto
1. Menu lateral > Bíblia. Título "Bíblia Online", chips de versão/livro/capítulo, barra fina de progresso no topo ao rolar.
2. Rolar. O cabeçalho continua visível, aparece o botão quadrado de subir.

### 2. Aparência e modo sem distração (`section_appearance`) — Auto
1. Tocar em **T** (876, 187). Modal "Aparência (Aa)" com prévia ao vivo e as seções Texto, Cores, Exibição (**Modo sem distração**, **Desenhos**) e Tela (não "Rabiscos").
2. Ligar **Modo sem distração** (manual) e fechar. Os botões flutuantes de anterior e próximo só aparecem ao chegar ao fim do capítulo, e a barra de localização (versão, livro e capítulo) continua visível.
3. Voltar para **Normal**.

### 3. Seletor (`section_picker`) — Auto (captura)
1. Tocar no chip do livro. Lista de livros com a legenda "66 livros".
2. Escolher um livro, depois o capítulo: capítulos com anotação, marcação ou desenho têm um pontinho.

### 4. Pesquisar (`section_search`) — Auto
Título "Pesquisar", campo de busca e filtros.

### 5. Estudos (`section_studies`) — Auto (abrir) + Manual
Auto: lista "Estudos", abrir o estudo "Dd", editor com a barra de ferramentas.

Manual, bloco **mover**: nos blocos de versículo aparecem **↓ ↑ ×**. Tocar em **↓** do primeiro bloco: ele desce, o teclado **não** abre, e a ordem fica salva ao reabrir o estudo.

Manual, bloco **desenhar pelo estudo** (validado em 03/11):
1. No editor, tocar na caneta da barra (257, 346). Abre o seletor.
2. Livro **Jd** (538, 1648), capítulo 1 (170, 460), versículos 2 e 3 (468, 800 e 468, 1100), **Adicionar** (865, 2105).
3. A Bíblia abre em modo desenho com a barra nova. Riscar sobre o versículo 2 (117, 600 > 702, 606) e tocar em **Concluir** (915, 2122).
4. Aparece "Salvando desenho no estudo...", o app volta ao estudo e há um novo bloco "Jude 1:2-3 (ESV)" com a imagem (arquivo `study-images/*.jpg`) e o traço. Reabrir o estudo: a imagem continua lá.

### 6. Anotações (`section_notes`) — Auto
1. Abas **Texto**, **Cores**, **Desenhos** e o campo "Buscar nas anotações".
2. Busca sem acento e sem diferenciar maiúsculas (ex.: `JUMENTO` acha "jumento").
3. Segurar um card (538, 880): barra "1 selecionada" + **Adicionar ao estudo**.
4. **Adicionar ao estudo** > **Criar Novo Estudo**: título já sugerido (ex.: "Êxodo 23:5"). Cancelar para não criar estudo de teste.
5. Escolher um estudo existente: aviso "Adicionado ao estudo" com o botão **Ir para o estudo**, que abre o estudo e rola até o conteúdo novo.

### 7. Plano de leitura (`section_plan`) — Auto + Manual
Auto: lista "Plano de Leitura", abrir o plano, ver "PROGRESSO DE LEITURA" e os chips do dia.

Manual:
1. Segurar um chip (176, 1576 por 900 ms): menu lateral com **Ler agora** e **Marcar como lido/não lido**.
2. **Ler agora**: abre o capítulo na leitura; no fim da página, card do plano com progresso, "Mês · Dia N", chips e **Continuar para…**.
3. Num capítulo não lido: rolar até o fim (6 deslizes de baixo para cima) e esperar 7 s. Aparece "Capítulo marcado como lido" com **Desfazer** (dura 4 s; toque rápido).

### 8. Configurações (`section_config`) — Auto
Título "Configurações", "Lembrete de leitura", e na seção da Bíblia o item **Modo leitura sem distração** com o interruptor. (Sugestão de horário do lembrete e agendamento exigem build nativo, não o Expo Go.)

### 9. Desenho na Bíblia (`section_draw`) — Auto (captura)
1. Segurar um versículo (538, 1500), tocar na caneta (629, 1980). A barra tem: cores recentes; uma linha com desfazer, refazer e limpar (some ao recolher); e a **linha de baixo**: recolher, cor, espessura, divisória `|`, caneta, marcador (gota) e borracha, e à direita o botão **✓ Concluir** (ícone, `accessibilityLabel` "Concluir"). O recolher é sempre o primeiro da esquerda (102, 2122), aberta ou recolhida, e a linha de baixo continua completa recolhida. Sem espaço em branco embaixo.
2. Tocar no botão de espessura (366, 2122; coordenada a reconferir após a reorganização): barra **vertical** acima do botão, igual à das cores; arrastar para cima engrossa o pincel (o círculo de exemplo cresce). Ao soltar o dedo a barra some, igual à das cores.
3. Marcador (gota) fica atrás do texto. Segurar o dedo parado 0,45 s no fim do traço o transforma em linha reta. Dois dedos rolam a página sem desenhar. Borracha apaga o traço inteiro ao encostar.

## Problemas conhecidos do ambiente
- `Haptic.selectionAsync is not available on android`: o Expo Go deste aparelho não tem háptico. As chamadas já engolem o erro; se aparecer o LogBox vermelho, toque em **Dismiss**.
- Jest: `useDrawings.test.tsx` e `BibleText.test.tsx` não rodam (`react-native/react-private-interface` não resolve no preset). Não é erro do app.
- O botão do aviso "Ir para o estudo" / "Desfazer" some em 4 s; em teste por adb, toque logo após a captura.

## Último resultado

Ver o fim deste arquivo, seção **Registro**, atualizada a cada execução.

## Registro

### 03/11/2026 — execução manual no aparelho (Expo Go, ESV/ACF)

| Seção | Resultado |
|---|---|
| 1 Bíblia | ok: barra de progresso no topo, botões quadrados, card final do plano |
| 2 Aparência | modal reescrito; modo sem distração mantém a barra de localização e esconde só os botões flutuantes (verificar manualmente) |
| 3 Seletor | ok: pontinho nos capítulos com desenho/anotação (Judas 1) |
| 5 Estudos | ok: ↓ ↑ × nos blocos, mover salva e persiste ao reabrir; desenhar pelo estudo (versículos 1 e 4, traço no 2) insere o bloco 1-4; imagem em arquivo continua ao reabrir |
| 6 Anotações | ok: busca (`JUMENTO`), seleção múltipla ("1 selecionada"), título sugerido "Êxodo 23:5", aviso "Ir para o estudo" rolando até o conteúdo |
| 7 Plano | ok: menu do chip, card final, marcação automática com "Capítulo marcado como lido" |
| 9 Desenho | ok: barra com cores recentes, espessura, marcador atrás do texto |
| 4 Pesquisar, 8 Configurações, 12-14 | não executadas nesta rodada |

### 03/11/2026 — `bash e2e/run.sh` (automático)

Não concluída: o `adb` perdeu a conexão com o aparelho no meio da execução ("device offline"), então os resultados dessa rodada foram descartados.
O roteiro agora aborta com `exit 2` e a mensagem "Aparelho adb desconectado" se isso acontecer.
Próxima execução: reconectar o aparelho, ligar Não perturbar e rodar `bash e2e/run.sh`.
