# Funcionalidades

## Leitura
- 5 versões: ACF, ARA, NAA, NVI, NVT (`src/data/bible-version/`; KJA e KJF existem como arquivo mas não aparecem para o usuário).
- Temas do leitor: claro, sépia e escuro. Tamanho de fonte, alinhamento do texto e fonte (Poppins, monoespaçada, Lora).
- Modo sem distração: esconde os botões flutuantes e mantém a barra de localização.
- Comparação de duas versões com rolagem sincronizada; a versão comparada fica salva.
- Títulos de seção (`src/data/bible-titles/`) nas versões ARA, NAA, NVI e NVT.
- Histórico de leitura recente e retomada da última posição.
- Links diretos para versículos (`/bible/:version/:book/:chapter?verse=N`).

## Marcação e anotações
- Destaque de versículos em 7 cores.
- Nota por versículo.
- Desenho sobre o versículo (caneta, marcador atrás do texto, borracha, espessura e cor; segurar o dedo parado no fim do traço cria linha reta; dois dedos rolam a página).
- Tela Anotações reúne notas, cores e desenhos, com busca.
- Coleções temáticas de versículos.

## Estudos
- Editor de texto rico salvo em HTML, com salvamento automático.
- Versículos inseridos como blocos que podem ser movidos e removidos.
- Desenho feito na Bíblia pode virar imagem dentro do estudo.
- Exportação em PDF e JSON.
- Lixeira com 30 dias de recuperação.

## Planos de leitura
- 10 modelos em `src/data/bible-plan/`: clássico, cronológico, Novo Testamento e Antigo Testamento, em 1, 3 e 6 meses ou 1 ano.
- Marcar capítulo como lido à mão ou automaticamente ao chegar no fim da página.
- Progresso, dias em atraso, previsão de conclusão e sequência de dias.
- Lembrete diário por notificação.

## Busca
- Texto livre em toda a Bíblia, sem diferenciar acentos nem maiúsculas.
- Filtro por versão, livro e capítulo.
- Atalho por referência ("Jo 3:16").
- Histórico das últimas 20 buscas.

## Áudio
- Reprodução por capítulo, com vozes por versão e livro (`src/data/bible-voice/`).
- Download de capítulos para ouvir sem internet.
- Ajustes de áudio em modal próprio.

## Estatísticas
- Dias de leitura, sequência atual, melhor sequência, planos ativos, versículos marcados, estudos, anotações e coleções (`src/utils/readingStats.ts`).

## Dados e backup
- Tudo fica no aparelho (AsyncStorage), sem servidor.
- Exportar e restaurar backup completo (estudos, histórico, notas, desenhos, configurações) e restaurar arquivo antigo só de estudos.
- Backup automático na pasta escolhida.
- Ao restaurar, todos os providers recarregam o estado (`BACKUP_RESTORED_EVENT`).
- Limpar histórico, planos ou tudo.

## Personalização
- Modo escuro e 6 paletas de cor.
- Feedback tátil ligável.
- Novidades da versão (changelog) ao atualizar o app.

## Widgets Android
- Continuar leitura, Plano de leitura e Estatísticas (`src/widgets/`, dados em `src/utils/widgetData.ts`).

## Desktop (Tauri)
- `desktop/` empacota o app web como programa de Windows e Linux.
- `npm run desktop:portable` gera o executável sem instalador em `local-builds/outputs/`.
- `npm run desktop:build` gera o instalador; `npm run desktop:dev` abre em modo desenvolvimento.
