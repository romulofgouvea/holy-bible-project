export type ChangelogItem = {
  version: string;
  highlights: string[];
};

export const CHANGELOG_DATA: ChangelogItem[] = [
  {
    version: "1.5.0",
    highlights: [
      "Plano de leitura integrado à leitura: ao abrir um capítulo do plano, o fim da página mostra um card com o progresso, o dia, os capítulos e o botão para concluir e seguir para a próxima leitura não lida, com opção de desfazer",
      "O capítulo do plano é marcado como lido quando você chega ao fim e fica ali por alguns segundos, e a leitura retoma exatamente do versículo em que você parou",
      "No plano: capítulos coloridos em cada dia (lido e atrasado), toque longo no capítulo para ler ou marcar, aviso de dias seguidos, botão quadrado para voltar ao topo e marcação de vários dias anteriores de uma vez",
      "Novo cartão Continuar na Bíblia, barra de progresso do capítulo no topo da leitura e pontinho nos capítulos que têm anotação, marcação ou desenho",
      "Lembrete do plano mais inteligente: não avisa se o dia já foi concluído, sugere o seu horário de leitura mais comum e agenda os próximos 60 dias",
      "Desenho muito melhor: traço livre por vários versículos, borracha que apaga o traço inteiro, refazer, cores recentes, deslizador vertical de espessura, marcador que fica atrás do texto, linha reta ao segurar o dedo e rolagem com dois dedos",
      "Barra de desenho recolhível, sem espaço sobrando embaixo, e a opção Rabiscos da aparência agora se chama Desenhos",
      "Deslizadores de cor e espessura do pincel mais fluidos, sem atraso, e o valor escolhido agora é salvo mesmo ao tirar o dedo para o lado",
      "Anotações: nova aba Desenhos, busca por livro, texto ou versículo e seleção de várias anotações para enviar ao estudo de uma vez",
      "Envie anotações de texto, cores e desenhos para um estudo, com título sugerido automaticamente e aviso com o atalho Ir para o estudo, que já rola até o conteúdo adicionado",
      "Estudos: novo botão de caneta no editor, que abre a Bíblia para desenhar e insere o resultado no estudo como imagem, com o texto e o desenho",
      "Estudos: reordene os blocos de versículos e desenhos com as setas, e as imagens agora ficam guardadas em arquivos, entram no PDF e no backup",
      "Mais segurança nos estudos: editar ou adicionar conteúdo por telas diferentes não apaga mais o que foi feito, e o app avisa quando faltar espaço",
      "Novo modo de leitura sem distração, disponível na Aparência e nas Configurações, que esconde a barra de localização e os botões flutuantes",
      "Ajustes gerais de estabilidade e desempenho",
    ],
  },
  {
    version: "1.4.8",
    highlights: [
      "Atualização para o Expo SDK 58",
      "Correção no áudio: o Narrador 1 agora vem selecionado automaticamente, e o play funciona sem precisar escolher o narrador manualmente",
      "Barra de áudio com mais espaço entre o ícone de configurações e a barra de progresso, e ícone de configurações com a cor de destaque",
      "Barra de versão, livro e capítulo um pouco maior, com botões maiores, sem mudar de tamanho quando o ícone de áudio aparece",
      "Ajustes gerais de estabilidade e desempenho",
    ],
  },
  {
    version: "1.4.7",
    highlights: [
      "Novo modo de desenho: rabisque, circule e risque sobre os versículos selecionados, com paleta de cores, seletor de cor contínuo, desfazer e limpar apenas os versículos escolhidos",
      "Os desenhos ficam salvos por versão, livro, capítulo e versículo",
      "Nova opção para ativar ou desativar o corretor ortográfico no editor de estudos",
      "Mais segurança no editor de estudos, na exportação e na reprodução de áudio",
      "Ajustes gerais de estabilidade e desempenho",
    ],
  },
  {
    version: "1.4.6",
    highlights: [
      "Nova opção para exibir ou ocultar os números dos versículos, para uma leitura em texto corrido",
      "Títulos de seção dentro do texto agora acompanham o tamanho da fonte e usam a cor de destaque",
      "Remoção do menu de clique direito na versão para Windows",
      "Versão Portable para Windows disponível nos downloads",
      "Na pesquisa, o filtro aplicado agora é clicável e abre os filtros de busca, sem o contador de resultados",
      'Tela de Configurações reorganizada: nova seção de Configurações Gerais, "Gerenciar estudos excluídos" nas configurações da Bíblia e Zona de Perigo para as opções de limpeza',
      "Versão exibida no fim da tela de Configurações agora acompanha a versão do app",
      "Nova barra na leitura com botões separados de versão, livro e capítulo, e atalhos de pesquisa, aparência e áudio no topo",
      "Ao tocar em um cartão de anotação ou marcação, você vai direto para o versículo na Bíblia, com ícones de editar e excluir no próprio cartão",
      "O botão voltar do Android agora retorna ao livro e versículo em que você estava antes de trocar de posição",
      "Na comparação de versões, o ícone que alterna entre lado a lado e empilhado agora mostra o layout de destino",
      "Ajustes gerais de estabilidade e desempenho",
    ],
  },
  {
    version: "1.4.5",
    highlights: [
      "Correção na reprodução em áudio dos capítulos, que não tocavam em alguns dispositivos",
      "Ajustes gerais de estabilidade e desempenho",
    ],
  },
  {
    version: "1.4.4",
    highlights: [
      "Versão para computador disponível para Windows, macOS e Linux",
      "Correção na exportação de estudos em PDF na versão para computador",
      "Ajustes gerais de estabilidade e desempenho",
    ],
  },
  {
    version: "1.4.2",
    highlights: [
      "Nova aba de marcações por cor na tela de Anotações, com filtro por cor",
      "Pesquisa passa a diferenciar acentos quando você os digita",
      "Correção na troca de versão ao inserir versículos em um estudo",
      "Ajustes visuais nos menus de ações e nos cartões de anotações",
    ],
  },
  {
    version: "1.4.1",
    highlights: [
      "Reprodução em áudio dos capítulos, com seleção de voz",
      "Nova tela de configuração de vozes para narração",
      "Gerenciamento de downloads para leitura offline por versão e livro",
      "Nova versão em inglês disponível: English Standard Version (ESV)",
      "Organização das versões bíblicas por idioma",
    ],
  },
  {
    version: "1.4.0",
    highlights: [
      "Lembretes diários para o plano de leitura, com horário configurável",
      "Pausar e retomar planos de leitura sem perder o progresso",
      "Sequência de dias seguidos de leitura (streak) no plano ativo",
      "Indicadores visuais de status do plano: atrasado, adiantado, pausado ou concluído",
      "Atalho para ir direto à leitura do dia no plano ativo",
      "Melhoria na acessibilidade da comparação de versões bíblicas em tela dividida",
      "Novo recurso de anotações vinculadas a versículos",
      "Melhoria na configuração do leitor permitindo mostrar ou não o título dos capítulos",
      "Melhoria na transição de versículos",
      "Melhorias nas pesquisas",
    ],
  },
  {
    version: "1.3.0",
    highlights: [
      "Planos de leitura com acompanhamento de progresso",
      "Títulos de seções e capítulos bíblicos integrados",
      "Busca textual completa e histórico de navegação",
    ],
  },
  {
    version: "1.2.0",
    highlights: [
      "Seleção múltipla de versículos e menu de ações",
      "Melhorias na marcação colorida de versículos (destaques)",
      "Melhorias no histórico de pesquisas e navegação",
      "Melhorias no feedback tátil",
    ],
  },
  {
    version: "1.1.0",
    highlights: [
      "Busca na Bíblia com destaque de termos",
      "Seleção ágil de livros e capítulos",
      "Configurações de tamanho de fonte e modo escuro",
    ],
  },
  {
    version: "1.0.0",
    highlights: [
      "Lançamento inicial da Bíblia Sagrada",
      "Leitura offline com múltiplas versões",
      "Interface responsiva e navegação intuitiva",
      "Estudos bíblicos com editor de texto formatado",
      "Exportação de estudos em PDF e backup manual",
      "Lixeira de estudos e gerenciamento de armazenamento",
      "Backup automático, restauração e exportação",
      "Compartilhamento e cópia rápida de textos",
    ],
  },
];
