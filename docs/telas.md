# Telas do app

Todas as telas ficam em `src/screens/` e são ligadas às rotas por arquivos em `src/app/`. O menu lateral (`BibleDrawerMenu`) lista as principais, na ordem de `DRAWER_ITEMS` em `src/constants/routes.ts`.

| Tela | Rota | Arquivo |
|---|---|---|
| Bíblia | `/bible` | `BibleScreen.tsx` |
| Estudos | `/studies` | `StudiesScreen.tsx` |
| Editor de estudo | `/studies/study/[id]` | `StudyEditorScreen.tsx` |
| Pesquisar | `/search` | `SearchScreen.tsx` |
| Anotações | `/notes` | `NotesScreen.tsx` |
| Coleções | `/collections` | `CollectionsScreen.tsx` |
| Plano de Leitura | `/reading-plan` | `ReadingPlanScreen.tsx` |
| Estatísticas | `/stats` | `StatsScreen.tsx` |
| Configurações | `/configuration` | `ConfigurationScreen.tsx` |
| Lixeira de estudos | `/configuration/trash` | `TrashScreen.tsx` |
| Downloads de áudio | `/configuration/downloads` | `DownloadsScreen.tsx` |
| Downloads por versão | `/configuration/downloads/[version]` | `DownloadsBooksScreen.tsx` |

A rota `/` redireciona para `/bible`. A rota `/bible/:version/:book/:chapter?verse=N` é o deep link: normaliza acentos, grava a posição e redireciona para `/bible`.

## Bíblia

Tela principal de leitura.

- Barra de localização com chips de versão, livro e capítulo. Cada chip abre o seletor correspondente.
- Barra fina de progresso do capítulo no topo, cabeçalho fixo ao rolar e botão para voltar ao topo.
- Botões anterior e próximo capítulo.
- Toque em um versículo para selecioná-lo; a seleção abre a folha de ações (copiar, compartilhar, marcar com cor, nota, adicionar a estudo ou coleção, desenhar).
- Menu ⋮ com histórico, áudio, comparação de versões e aparência.
- Comparação em duas versões, na vertical ou horizontal, com rolagem sincronizada e opção de trocar as posições.
- Ao fim do capítulo aparece o card do plano de leitura, quando o capítulo faz parte do plano ativo.
- Ao rolar até o fim de um capítulo de plano ainda não lido, ele é marcado como lido, com a opção **Desfazer**.
- Títulos de seção aparecem nas versões que os têm (ARA, NAA, NVI, NVT).
- Modo desenho: barra com cores recentes, desfazer, refazer, limpar, espessura, caneta, marcador e borracha.

## Estudos

Lista de estudos com criação, abertura, exclusão (vai para a lixeira) e exportação.

## Editor de estudo

Editor de texto rico (WebView), com salvamento automático 1 segundo após a última edição.

- Inserção de versículos como blocos de citação, com os botões **↓ ↑ ×** para mover e remover.
- Inserção de versículo com desenho: abre a Bíblia em modo desenho e o resultado volta ao estudo como imagem.
- Exportação em PDF.

## Pesquisar

- Busca de texto em toda a Bíblia sem diferenciar acentos nem maiúsculas, com 350 ms de espera e no mínimo 2 caracteres.
- Filtros por versão, livro e capítulo.
- Resultados com o termo destacado.
- Atalho de referência: digitar "Jo 3:16", "Sl 23" ou "1 joao 1.5" mostra um card que abre a Bíblia no versículo.
- Histórico das últimas 20 buscas.

## Anotações

Três abas: **Comentários** (notas dos versículos), **Cores** (versículos marcados) e **Desenhos**.

- Campo "Buscar nas anotações", sem diferenciar acentos nem maiúsculas.
- Segurar um card ativa a seleção múltipla; **Adicionar ao estudo** cria um estudo novo (com título sugerido) ou adiciona a um existente, com o aviso **Ir para o estudo**.

## Coleções

Agrupa versículos por tema, como "Promessas" ou "Ansiedade".

- Criar, abrir e excluir coleções.
- Versículos entram pela leitura: selecionar e tocar no ícone de marcador.
- Tocar em um versículo da coleção abre a Bíblia nele.

## Plano de Leitura

- Lista dos planos e escolha de um modelo novo (clássico, cronológico, Novo Testamento, Antigo Testamento; 1, 3 e 6 meses ou 1 ano).
- Detalhe do plano: progresso, dias em atraso, previsão de conclusão e chips do dia.
- Segurar um chip abre **Ler agora** e **Marcar como lido / não lido**.
- Card para retomar a leitura de onde parou.

## Estatísticas

Números de leitura: dias de leitura, sequência atual, melhor sequência, planos ativos, versículos marcados, estudos, anotações e coleções.

## Configurações

- **Aparência:** Modo Escuro, Cor do Aplicativo (6 paletas), Vibração.
- **Bíblia:** Modo leitura sem distração.
- **Lembrete de leitura:** horário da notificação diária (precisa de build nativo).
- **Áudio:** Downloads de Áudio.
- **Estudos:** Gerenciar estudos excluídos.
- **Dados:** Exportar Backup, Backup Automático, Restaurar do Backup, Limpar Histórico, Limpar Plano de Leitura, Limpar Tudo.
- Versão do app abre as novidades (changelog).
- Apoie este projeto (doação).

## Lixeira de estudos

Estudos excluídos ficam 30 dias. É possível restaurar ou apagar definitivamente.

## Downloads de áudio

Lista as versões; cada versão lista os livros para baixar capítulos e ouvir sem internet.

## Modais globais

Renderizados uma única vez em `GlobalBibleModals`: seletor de versão, livro, capítulo e versículo; histórico; áudio; ações do versículo; nota; adicionar ao estudo; adicionar à coleção; aparência (`ReaderSettingsModal`); ajustes de áudio; confirmação; novidades; doação.

## Widgets (Android)

Três widgets na tela inicial, definidos em `src/widgets/CardWidget.tsx`: **Continuar leitura**, **Plano de leitura** e **Estatísticas**. Cada um mostra texto e abre o app no destino correspondente por deep link `holybible://`. Só funcionam em build nativo, não no Expo Go.
