export type ChangelogItem = {
  version: string;
  highlights: string[];
};

export const CHANGELOG_DATA: ChangelogItem[] = [
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
