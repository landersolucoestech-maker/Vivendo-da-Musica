-- Student, community, opportunities and operational portal demo data.

insert into public.student_notifications (id,user_id,title,body,category,action_url,read_at,created_at,updated_at) values
('aa100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Nova aula liberada','A aula Automação e acabamento já está disponível no curso Mixagem Moderna.','course','/aluno/meus-cursos',null,now()-interval '3 hours',now()),
('aa100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Compra aprovada','Seu acesso ao Projeto FL Studio Drill Cinemático foi liberado.','order','/aluno/downloads',null,now()-interval '1 day',now()),
('aa100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Discussão em destaque','A comunidade está debatendo referências de mixagem para streaming.','community','/aluno/comunidade',null,now()-interval '2 days',now()),
('aa100000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Progresso atualizado','Você alcançou 55% da aula Público e jornada do fã.','course','/aluno/meus-cursos',now()-interval '1 day',now()-interval '4 days',now()),
('aa100000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','Bem-vindo ao Vivendo da Música','Explore seus cursos, conteúdos, downloads e oportunidades.','system','/aluno',now()-interval '20 days',now()-interval '45 days',now()),
('aa100000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','Material complementar','O modelo de split sheet foi adicionado à aula de coautoria.','course','/aluno/meus-cursos',null,now()-interval '6 days',now())
on conflict (id) do update set title=excluded.title,body=excluded.body,category=excluded.category,action_url=excluded.action_url,read_at=excluded.read_at,updated_at=now();

insert into public.student_preferences (user_id,course_updates,community_activity,marketing_emails,public_profile,show_progress,locale,theme,subscription_plan,updated_at) values
('11111111-1111-4111-8111-111111111111',true,true,false,true,true,'pt-BR','dark','premium',now())
on conflict (user_id) do update set course_updates=excluded.course_updates,community_activity=excluded.community_activity,marketing_emails=excluded.marketing_emails,public_profile=excluded.public_profile,show_progress=excluded.show_progress,locale=excluded.locale,theme=excluded.theme,subscription_plan=excluded.subscription_plan,updated_at=now();

insert into public.student_favorites (id,user_id,course_id,beat_id,content_id,created_at) values
('aa200000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','d2000000-0000-4000-8000-000000000004',null,null,now()-interval '10 days'),
('aa200000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',null,'be100000-0000-4000-8000-000000000006',null,now()-interval '7 days'),
('aa200000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111',null,null,'ac100000-0000-4000-8000-000000000001',now()-interval '4 days'),
('aa200000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111',null,'be100000-0000-4000-8000-000000000007',null,now()-interval '2 days')
on conflict (id) do nothing;

insert into public.support_tickets (id,ticket_code,user_id,subject,message,status,priority,created_at,updated_at) values
('aa300000-0000-4000-8000-000000000001','VDM-DEMO-001','11111111-1111-4111-8111-111111111111','Dúvida sobre download','Não encontrei o arquivo do template após a compra.','resolved','medium',now()-interval '18 days',now()-interval '17 days'),
('aa300000-0000-4000-8000-000000000002','VDM-DEMO-002','11111111-1111-4111-8111-111111111111','Certificado do curso','Gostaria de confirmar os requisitos para emissão do certificado.','in_progress','low',now()-interval '5 days',now()-interval '3 days'),
('aa300000-0000-4000-8000-000000000003','VDM-DEMO-003','11111111-1111-4111-8111-111111111111','Acesso a uma aula','A aula aparece no curso, mas o player não iniciou no primeiro acesso.','open','high',now()-interval '8 hours',now())
on conflict (id) do update set subject=excluded.subject,message=excluded.message,status=excluded.status,priority=excluded.priority,updated_at=excluded.updated_at;

insert into public.support_faq (id,question,answer,sort_order,active,created_at) values
('aa400000-0000-4000-8000-000000000001','Como acesso um curso comprado?','Após a confirmação do pagamento, o curso aparece em Meus cursos no Portal do Aluno.',1,true,now()),
('aa400000-0000-4000-8000-000000000002','Onde encontro os produtos digitais?','Os arquivos liberados ficam na área Downloads, vinculados ao pedido aprovado.',2,true,now()),
('aa400000-0000-4000-8000-000000000003','Como funciona o certificado?','Cursos elegíveis emitem certificado após o cumprimento dos critérios de conclusão definidos.',3,true,now()),
('aa400000-0000-4000-8000-000000000004','Posso alterar meus dados?','Nome, imagem e preferências podem ser atualizados na área Perfil e Configurações.',4,true,now()),
('aa400000-0000-4000-8000-000000000005','Como falar com o suporte?','Abra um chamado informando assunto, contexto e detalhes suficientes para análise.',5,true,now())
on conflict (id) do update set question=excluded.question,answer=excluded.answer,sort_order=excluded.sort_order,active=excluded.active;

insert into public.course_certificates (id,user_id,course_id,certificate_code,student_name_snapshot,course_title_snapshot,issued_at,revoked_at,is_demo,created_at) values
('aa500000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','d22c835b-cbfd-4c2a-9b1c-32a2df1c0800','VDM-2026-PM-001','Aluno de Desenvolvimento','Produção Musical do Zero ao Profissional',now()-interval '35 days',null,true,now()),
('aa500000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','d2000000-0000-4000-8000-000000000002','VDM-2026-CS-002','Aluno de Desenvolvimento','Composição e Songwriting',now()-interval '12 days',null,true,now())
on conflict (id) do update set certificate_code=excluded.certificate_code,student_name_snapshot=excluded.student_name_snapshot,course_title_snapshot=excluded.course_title_snapshot,issued_at=excluded.issued_at,revoked_at=excluded.revoked_at,is_demo=true;

insert into public.community_groups (id,owner_id,slug,name,description,visibility,status,member_count,is_demo,created_at,updated_at) values
('cc100000-0000-4000-8000-000000000001','c3942032-967a-4cde-b00c-22446584e699','producao-e-mixagem','Produção & Mixagem','Troca de técnicas, referências, feedbacks e fluxos de trabalho.','public','active',286,true,now()-interval '120 days',now()),
('cc100000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','carreira-e-marketing','Carreira & Marketing','Estratégias de lançamento, conteúdo, posicionamento, shows e público.','public','active',194,true,now()-interval '95 days',now()),
('cc100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','compositores','Compositores','Espaço para letras, melodias, coautoria, repertório e documentação de obras.','public','active',137,true,now()-interval '72 days',now())
on conflict (id) do update set name=excluded.name,description=excluded.description,member_count=excluded.member_count,status=excluded.status,updated_at=now();

insert into public.community_group_members (group_id,user_id,member_role,joined_at) values
('cc100000-0000-4000-8000-000000000001','c3942032-967a-4cde-b00c-22446584e699','owner',now()),
('cc100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','member',now()),
('cc100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','moderator',now()),
('cc100000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','owner',now()),
('cc100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','member',now()),
('cc100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','owner',now()),
('cc100000-0000-4000-8000-000000000003','c3942032-967a-4cde-b00c-22446584e699','moderator',now())
on conflict (group_id,user_id) do update set member_role=excluded.member_role,joined_at=excluded.joined_at;

insert into public.community_posts (id,group_id,author_id,author_name_snapshot,author_role_snapshot,content,status,like_count,is_demo,created_at,updated_at) values
('cc300000-0000-4000-8000-000000000001','cc100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','Produtor de Desenvolvimento','producer','Testei três cadeias de vocal e a versão mais simples traduziu melhor no celular. #mixagem #vocais','published',38,true,now()-interval '2 hours',now()),
('cc300000-0000-4000-8000-000000000002','cc100000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','Afiliado de Desenvolvimento','affiliate','Qual formato de conteúdo trouxe mais visitas para o último lançamento? #marketingmusical #conteudo','published',24,true,now()-interval '7 hours',now()),
('cc300000-0000-4000-8000-000000000003','cc100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Aluno de Desenvolvimento','student','Estou revisando uma letra e percebi que o refrão explica demais. #songwriting #composicao','published',19,true,now()-interval '1 day',now()),
('cc300000-0000-4000-8000-000000000004','cc100000-0000-4000-8000-000000000001','c3942032-967a-4cde-b00c-22446584e699','DJ Stay — Instrutor de Desenvolvimento','instructor','Desafio da semana: façam uma mix estática usando apenas volume e panorama. #producao #mixagem','published',61,true,now()-interval '2 days',now()),
('cc300000-0000-4000-8000-000000000005','cc100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Aluno de Desenvolvimento','student','Montei meu calendário de 30 dias e ficou mais fácil enxergar o que gravar. #lancamento #planejamento','published',31,true,now()-interval '4 days',now()),
('cc300000-0000-4000-8000-000000000006','cc100000-0000-4000-8000-000000000003','c3942032-967a-4cde-b00c-22446584e699','DJ Stay — Instrutor de Desenvolvimento','instructor','Documentem os percentuais antes de enviar a música para distribuição. #direitosautorais #split','published',47,true,now()-interval '6 days',now())
on conflict (id) do update set content=excluded.content,like_count=excluded.like_count,status=excluded.status,updated_at=now();

insert into public.community_comments (id,post_id,author_id,author_name_snapshot,content,status,is_demo,created_at,updated_at) values
('cc400000-0000-4000-8000-000000000001','cc300000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Aluno de Desenvolvimento','Quando corrigi a gravação e o ganho, precisei de muito menos processamento.','published',true,now(),now()),
('cc400000-0000-4000-8000-000000000002','cc300000-0000-4000-8000-000000000002','c3942032-967a-4cde-b00c-22446584e699','DJ Stay — Instrutor de Desenvolvimento','Bastidor funciona bem porque aproxima o público do processo.','published',true,now(),now()),
('cc400000-0000-4000-8000-000000000003','cc300000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','Produtor de Desenvolvimento','Um refrão forte costuma ter uma ideia clara e espaço para repetição.','published',true,now(),now()),
('cc400000-0000-4000-8000-000000000004','cc300000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Aluno de Desenvolvimento','Fiz o exercício e encontrei vários conflitos antes de equalizar.','published',true,now(),now()),
('cc400000-0000-4000-8000-000000000005','cc300000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','Aluno de Desenvolvimento','O modelo de split sheet deixou essa parte bem mais objetiva.','published',true,now(),now())
on conflict (id) do update set content=excluded.content,status=excluded.status,updated_at=now();

insert into public.opportunities (id,kind,title,organization_name,location,engagement_type,status,description,application_count,published_at,is_demo,created_at,updated_at) values
('ee100000-0000-4000-8000-000000000001','vaga','Produtor Musical Júnior','Estúdio Aurora','São Paulo, SP','Presencial','open','Apoio em sessões, edição, organização de projetos e pré-mix.',34,now()-interval '2 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000002','freela','Mixagem de EP com 5 faixas','Selo Horizonte','Remoto','Freelance','open','Projeto de mixagem para EP de trap melódico com duas rodadas de revisão.',19,now()-interval '4 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000003','colaboracao','Compositor para sessões de pop urbano','Casa Norte Music','Rio de Janeiro, RJ','Projeto','open','Busca por compositor com experiência em refrões, melodias e coautoria.',27,now()-interval '6 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000004','edital','Seleção de artistas independentes 2026','Festival Nova Frequência','Brasil','Edital','open','Seleção de artistas para apresentações, mentoria e produção audiovisual.',112,now()-interval '8 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000005','vaga','Social Media Musical','Agência Pulso','Remoto','Contrato','open','Planejamento de conteúdo, calendário editorial e análise de métricas.',46,now()-interval '10 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000006','freela','Beatmaker para single de funk','Artista Independente','Belo Horizonte, MG','Freelance','open','Criação de beat original, produção vocal e entrega de stems.',23,now()-interval '12 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000007','vaga','Assistente de Direitos Autorais','Editora Som & Obra','São Paulo, SP','Híbrido','open','Apoio em cadastros de obras, conferência de splits e documentação.',18,now()-interval '14 days',true,now(),now()),
('ee100000-0000-4000-8000-000000000008','colaboracao','Vocalista para projeto R&B','Produtor Independente','Remoto','Projeto','closed','Colaboração para composição, gravação e lançamento de duas faixas.',31,now()-interval '20 days',true,now(),now())
on conflict (id) do update set title=excluded.title,organization_name=excluded.organization_name,location=excluded.location,engagement_type=excluded.engagement_type,status=excluded.status,description=excluded.description,application_count=excluded.application_count,published_at=excluded.published_at,updated_at=now();

insert into public.opportunity_favorites (opportunity_id,user_id,created_at) values
('ee100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',now()),
('ee100000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111',now()),
('ee100000-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111',now())
on conflict (opportunity_id,user_id) do nothing;

insert into public.opportunity_applications (id,opportunity_id,applicant_id,cover_letter,portfolio_url,status,created_at,updated_at) values
('ee200000-0000-4000-8000-000000000001','ee100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Tenho experiência prática com organização de sessão, edição e mixagem de produções urbanas.','https://example.com/portfolio-demo','reviewing',now()-interval '2 days',now()),
('ee200000-0000-4000-8000-000000000002','ee100000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Meu projeto autoral está em fase de lançamento e acredito que a mentoria pode acelerar o desenvolvimento.','https://example.com/artista-demo','submitted',now()-interval '4 days',now())
on conflict (id) do update set cover_letter=excluded.cover_letter,portfolio_url=excluded.portfolio_url,status=excluded.status,updated_at=now();
