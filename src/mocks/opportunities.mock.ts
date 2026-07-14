
export const MOCK_OPPORTUNITIES = [
  { id: 'opp-1', title: 'Produtor freelancer — selo independente', company: 'Selo Nova Onda', location: 'Remoto', type: 'Freelance', status: 'aberta', postedAt: '15/05/2026', description: 'Selo independente busca produtor freelancer para mixagem e masterização de faixas.', applicantsCount: 24 },
  { id: 'opp-2', title: 'Editor de áudio para podcast musical', company: 'Estúdio Frequência', location: 'São Paulo, SP', type: 'Meio período', status: 'aberta', postedAt: '20/05/2026', description: 'Vaga para edição e mixagem de episódios semanais de podcast sobre música.', applicantsCount: 11 },
  { id: 'opp-3', title: 'Instrutor convidado — Workshop de Beatmaking', company: 'Vivendo da Música', location: 'Online', type: 'Pontual', status: 'encerrada', postedAt: '01/04/2026', description: 'Oportunidade pontual para ministrar workshop ao vivo na plataforma.', applicantsCount: 38 },
  { id: 'opp-4', title: 'Produção de trilha para curta-metragem', company: 'Filmes Aurora', location: 'Remoto', type: 'Projeto', status: 'aberta', postedAt: '02/06/2026', description: 'Projeto de trilha sonora original para curta-metragem independente.', applicantsCount: 7 },
  { id: 'opp-5', title: 'Mixagem para EP de artista emergente', company: 'Artista independente', location: 'Remoto', type: 'Freelance', status: 'aberta', postedAt: '10/06/2026', description: 'Mixagem de 5 faixas para EP de debut, orçamento definido.', applicantsCount: 16 },
];

export const getOpenOpportunities = () => MOCK_OPPORTUNITIES.filter((o) => o.status === 'aberta');
