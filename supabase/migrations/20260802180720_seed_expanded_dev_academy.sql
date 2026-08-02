-- Rich, idempotent demo catalog for the isolated development environment.

insert into public.courses (
  id,title,slug,short_description,description,thumbnail_url,category,
  original_price_cents,discount_cents,currency,status,visibility,instructor_id,
  published_at,is_demo,created_at,updated_at
) values
('d2000000-0000-4000-8000-000000000001','Mixagem Moderna para Streaming','mixagem-moderna-para-streaming','Construa mixes fortes, limpas e competitivas para as principais plataformas.','Treinamento prático de ganho, equilíbrio, equalização, compressão, efeitos, automação, referência e entrega final para streaming.','https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=85','Mixagem',49700,8000,'BRL','published','public','c3942032-967a-4cde-b00c-22446584e699',now()-interval '60 days',true,now()-interval '75 days',now()),
('d2000000-0000-4000-8000-000000000002','Composição e Songwriting','composicao-e-songwriting','Crie letras, melodias, refrões e estruturas que conectam com o público.','Método de composição voltado para artistas, compositores e produtores: conceito, narrativa, métrica, melodia, harmonia, estrutura e refinamento.','https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=85','Composição',39700,5000,'BRL','published','public','c3942032-967a-4cde-b00c-22446584e699',now()-interval '45 days',true,now()-interval '58 days',now()),
('d2000000-0000-4000-8000-000000000003','Marketing Musical e Lançamentos','marketing-musical-e-lancamentos','Planeje campanhas, conteúdo e distribuição para lançar músicas com estratégia.','Curso aplicado sobre posicionamento, público, calendário, conteúdo, pré-save, mídia, lançamento, análise de métricas e continuidade da campanha.','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=85','Marketing Musical',44700,5000,'BRL','published','public','c3942032-967a-4cde-b00c-22446584e699',now()-interval '35 days',true,now()-interval '48 days',now()),
('d2000000-0000-4000-8000-000000000004','Beatmaking: Trap, Funk e Drill','beatmaking-trap-funk-e-drill','Produza beats atuais com bateria, harmonia, baixo, textura e identidade.','Treinamento de beatmaking do esboço ao beat final, com técnicas para trap, funk e drill, criação de grooves, 808, samples e arranjos.','https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=1200&q=85','Beatmaking',54700,7000,'BRL','published','public','c3942032-967a-4cde-b00c-22446584e699',now()-interval '25 days',true,now()-interval '40 days',now()),
('d2000000-0000-4000-8000-000000000005','Direitos Autorais e Distribuição Digital','direitos-autorais-e-distribuicao-digital','Entenda obras, fonogramas, contratos, registros, splits, distribuição e royalties.','Curso para profissionais da música que precisam organizar direitos, cadastros, documentação, distribuição digital e prestação de contas.','https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85','Negócios da Música',34700,5000,'BRL','published','public','c3942032-967a-4cde-b00c-22446584e699',now()-interval '15 days',true,now()-interval '28 days',now())
on conflict (slug) do update set
  title=excluded.title,short_description=excluded.short_description,description=excluded.description,
  thumbnail_url=excluded.thumbnail_url,category=excluded.category,original_price_cents=excluded.original_price_cents,
  discount_cents=excluded.discount_cents,status=excluded.status,visibility=excluded.visibility,
  instructor_id=excluded.instructor_id,published_at=excluded.published_at,is_demo=true,updated_at=now();

insert into public.course_modules (id,course_id,title,description,order_index,created_at,updated_at) values
('d2100000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','Fundamentos de uma mix profissional','Preparação, organização, ganho e visão crítica.',1,now(),now()),
('d2100000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001','Processamento e profundidade','Equalização, dinâmica, imagem estéreo e efeitos.',2,now(),now()),
('d2100000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000001','Finalização para streaming','Automação, referência, loudness e entrega.',3,now(),now()),
('d2100000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000002','Ideia, tema e narrativa','Da intenção artística ao conceito da música.',1,now(),now()),
('d2100000-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000002','Letra, melodia e harmonia','Ferramentas para versos, refrões e melodias memoráveis.',2,now(),now()),
('d2100000-0000-4000-8000-000000000006','d2000000-0000-4000-8000-000000000002','Revisão e versão final','Edição, teste, coautoria e documentação.',3,now(),now()),
('d2100000-0000-4000-8000-000000000007','d2000000-0000-4000-8000-000000000003','Posicionamento e planejamento','Objetivo, público, narrativa e cronograma.',1,now(),now()),
('d2100000-0000-4000-8000-000000000008','d2000000-0000-4000-8000-000000000003','Campanha de lançamento','Conteúdo, distribuição, mídia e conversão.',2,now(),now()),
('d2100000-0000-4000-8000-000000000009','d2000000-0000-4000-8000-000000000003','Métricas e continuidade','Leitura de dados e ciclo pós-lançamento.',3,now(),now()),
('d2100000-0000-4000-8000-000000000010','d2000000-0000-4000-8000-000000000004','Groove e seleção sonora','Bateria, timbres e identidade do beat.',1,now(),now()),
('d2100000-0000-4000-8000-000000000011','d2000000-0000-4000-8000-000000000004','Harmonia, sample e 808','Construção musical e peso de grave.',2,now(),now()),
('d2100000-0000-4000-8000-000000000012','d2000000-0000-4000-8000-000000000004','Arranjo e entrega comercial','Estrutura, variação, mix rápida e exportação.',3,now(),now()),
('d2100000-0000-4000-8000-000000000013','d2000000-0000-4000-8000-000000000005','Obra, fonograma e participantes','Papéis, titularidade e percentuais.',1,now(),now()),
('d2100000-0000-4000-8000-000000000014','d2000000-0000-4000-8000-000000000005','Contratos e documentação','Splits, licenças, cessões e comprovação.',2,now(),now()),
('d2100000-0000-4000-8000-000000000015','d2000000-0000-4000-8000-000000000005','Distribuição e royalties','Cadastros, metadados, relatórios e repasses.',3,now(),now())
on conflict (id) do update set title=excluded.title,description=excluded.description,order_index=excluded.order_index,updated_at=now();

with module_rows as (
  select id, course_id, title, order_index
  from public.course_modules
  where id::text like 'd2100000-%'
), lesson_seed as (
  select
    md5('vdm-demo-lesson-' || module.id::text || '-' || lesson_number::text)::uuid as id,
    module.id as module_id,
    case lesson_number
      when 1 then 'Fundamentos: ' || module.title
      when 2 then 'Aplicação prática: ' || module.title
      else 'Projeto guiado: ' || module.title
    end as title,
    'modulo-' || module.order_index || '-aula-' || lesson_number as slug,
    case lesson_number
      when 1 then 'Conceitos essenciais, preparação e critérios de decisão.'
      when 2 then 'Demonstração prática com exemplos aplicados ao mercado musical.'
      else 'Exercício completo para consolidar o módulo e produzir uma entrega.'
    end as description,
    16 + module.order_index * 3 + lesson_number * 2 as duration_minutes,
    lesson_number as order_index
  from module_rows module
  cross join generate_series(1,3) lesson_number
)
insert into public.lessons (
  id,module_id,title,slug,description,video_url,duration_minutes,order_index,status,created_at,updated_at
)
select id,module_id,title,slug,description,'https://player.vimeo.com/video/76979871',duration_minutes,order_index,'published',now(),now()
from lesson_seed
on conflict (id) do update set
  title=excluded.title,slug=excluded.slug,description=excluded.description,video_url=excluded.video_url,
  duration_minutes=excluded.duration_minutes,order_index=excluded.order_index,status=excluded.status,updated_at=now();

with first_lessons as (
  select distinct on (course.id)
    course.id as course_id,
    lesson.id as lesson_id,
    course.title
  from public.courses course
  join public.course_modules module on module.course_id=course.id
  join public.lessons lesson on lesson.module_id=module.id
  where course.id::text like 'd2000000-%'
  order by course.id,module.order_index,lesson.order_index
)
insert into public.lesson_materials (
  id,lesson_id,name,description,material_type,file_url,mime_type,size_bytes,order_index,created_at,updated_at
)
select
  md5('vdm-demo-material-' || course_id::text)::uuid,
  lesson_id,
  'Material complementar — ' || title,
  'Arquivo demonstrativo de apoio ao curso.',
  'pdf',
  'https://example.com/demo/material-' || course_id::text || '.pdf',
  'application/pdf',
  250000,
  1,
  now(),
  now()
from first_lessons
on conflict (id) do update set name=excluded.name,description=excluded.description,file_url=excluded.file_url,updated_at=now();

insert into public.enrollments (id,user_id,course_id,status,source,enrolled_at,created_at,updated_at)
select
  md5('vdm-demo-enrollment-' || course.id::text)::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  course.id,
  'active',
  'admin',
  now()-interval '20 days',
  now()-interval '20 days',
  now()
from public.courses course
where course.id::text like 'd2000000-%'
on conflict (user_id,course_id) do update set status='active',source='admin',updated_at=now();

with selected_lessons as (
  select lesson.id, row_number() over(order by course.created_at,module.order_index,lesson.order_index) sequence
  from public.lessons lesson
  join public.course_modules module on module.id=lesson.module_id
  join public.courses course on course.id=module.course_id
  where course.id::text like 'd2000000-%'
  order by course.created_at,module.order_index,lesson.order_index
  limit 8
)
insert into public.lesson_progress (
  id,user_id,lesson_id,completed,progress_percentage,watched_seconds,last_viewed_at,created_at,updated_at
)
select
  md5('vdm-demo-progress-' || id::text)::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  id,
  sequence <= 3,
  case when sequence <= 3 then 100 else 20 + sequence * 6 end,
  case when sequence <= 3 then 1200 else 240 + sequence * 45 end,
  now()-(sequence || ' hours')::interval,
  now()-interval '18 days',
  now()-(sequence || ' hours')::interval
from selected_lessons
on conflict (id) do update set completed=excluded.completed,progress_percentage=excluded.progress_percentage,watched_seconds=excluded.watched_seconds,last_viewed_at=excluded.last_viewed_at,updated_at=excluded.updated_at;

insert into public.academy_contents (
  id,title,slug,subtitle,description,body,category,tags,thumbnail_url,banner_url,video_url,status,created_at,updated_at,published_at
) values
('ac100000-0000-4000-8000-000000000001','Checklist completo para lançar um single','checklist-completo-para-lancar-um-single','Organize cada etapa sem perder prazos ou informações importantes.','Um roteiro prático do fechamento da música até o pós-lançamento.','Um lançamento consistente começa antes da data de estreia. Defina objetivo, público, narrativa e orçamento. Finalize áudio, capa, créditos, splits e metadados. Entregue o fonograma à distribuidora com antecedência, prepare o pitching editorial e produza conteúdo em formatos variados.','Lançamentos',array['lançamento','planejamento','distribuição','marketing'],'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '40 days',now(),now()-interval '40 days'),
('ac100000-0000-4000-8000-000000000002','Guia de mastering para streaming','guia-de-mastering-para-streaming','Loudness, true peak, dinâmica e entrega final.','Entenda os principais cuidados para preparar masters competitivos sem destruir a dinâmica.','Masterização para streaming não significa perseguir apenas volume. Trabalhe com uma mix equilibrada, preserve transientes e monitore true peak. Compare referências no mesmo nível percebido e confira diferentes sistemas.','Produção Musical',array['mastering','streaming','loudness','mixagem'],'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=85','https://player.vimeo.com/video/76979871','published',now()-interval '34 days',now(),now()-interval '34 days'),
('ac100000-0000-4000-8000-000000000003','Como registrar e documentar uma composição','como-registrar-e-documentar-uma-composicao','Organize autoria, percentuais, versões e evidências.','Boas práticas para reduzir conflitos e preparar corretamente o cadastro de uma obra.','Antes do lançamento, identifique todos os autores e confirme os percentuais por escrito. Guarde demos, arquivos de sessão, letras, mensagens e versões datadas. Preencha um split sheet e mantenha os comprovantes reunidos.','Direitos Autorais',array['composição','registro','split','direitos autorais'],'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '29 days',now(),now()-interval '29 days'),
('ac100000-0000-4000-8000-000000000004','Contrato de beat: pontos essenciais','contrato-de-beat-pontos-essenciais','O que conferir em licenças básicas, premium e exclusivas.','Resumo educacional dos principais elementos de um licenciamento de beat.','Um contrato de beat deve identificar partes, beat, licença, preço, prazo, território e formas de uso. Defina limites de cópias, streams, monetização, shows, videoclipes, sincronização e arquivos entregues.','Negócios da Música',array['beats','contratos','licenciamento'],'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '24 days',now(),now()-interval '24 days'),
('ac100000-0000-4000-8000-000000000005','Plano de conteúdo para artista independente','plano-de-conteudo-para-artista-independente','Um sistema simples para produzir conteúdo com consistência.','Estruture pilares, formatos e uma rotina editorial alinhada ao posicionamento artístico.','Escolha de três a cinco pilares: música, processo, história, personalidade e comunidade. Para cada pilar, crie formatos recorrentes e acompanhe retenção e compartilhamentos.','Marketing Musical',array['conteúdo','artista','redes sociais'],'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '20 days',now(),now()-interval '20 days'),
('ac100000-0000-4000-8000-000000000006','Como calcular cachê e custos de um show','como-calcular-cache-e-custos-de-um-show','Monte propostas sustentáveis e evite prejuízos.','Estrutura de custos para apresentações, equipe, transporte, impostos e margem.','Separe custos fixos e variáveis. Inclua equipe, transporte, hospedagem, alimentação, locação, ensaios, taxas, tributos, contingência e margem de lucro.','Gestão Financeira',array['cachê','shows','custos'],'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '17 days',now(),now()-interval '17 days'),
('ac100000-0000-4000-8000-000000000007','Metadados musicais sem erros','metadados-musicais-sem-erros','Créditos, códigos e informações que acompanham o lançamento.','Um guia para revisar os dados antes de enviar uma música à distribuição.','Confirme título, versão, artistas, compositores, produtores, editora, selo, ano, idioma, ISRC, UPC e classificação explícita. Padronize nomes em todos os cadastros.','Distribuição Digital',array['metadados','ISRC','UPC'],'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '13 days',now(),now()-interval '13 days'),
('ac100000-0000-4000-8000-000000000008','Como organizar um catálogo de beats','como-organizar-um-catalogo-de-beats','Padrão de arquivos, licenças, preços e apresentação.','Estruture seu catálogo para vender com mais clareza e operar sem confusão.','Use um padrão para nome, BPM, tonalidade, gênero, clima e versão. Armazene preview, master e stems separadamente e mantenha controle de exclusividades.','Beatmaking',array['beats','catálogo','licenças'],'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '10 days',now(),now()-interval '10 days'),
('ac100000-0000-4000-8000-000000000009','Guia rápido de pitching editorial','guia-rapido-de-pitching-editorial','Apresente a música com contexto, clareza e antecedência.','Estrutura para escrever um pitch objetivo para plataformas e curadores.','Explique quem é o artista, a história da faixa, gênero, referências, instrumentos, colaboradores, território e plano de divulgação. Priorize fatos específicos.','Marketing Musical',array['pitching','playlists','streaming'],'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=85',null,'published',now()-interval '7 days',now(),now()-interval '7 days'),
('ac100000-0000-4000-8000-000000000010','Fluxo de trabalho para produzir mais músicas','fluxo-de-trabalho-para-produzir-mais-musicas','Reduza decisões repetitivas e termine projetos com consistência.','Organização de templates, etapas, prazos e revisões para produtores e artistas.','Crie templates por tipo de projeto. Divida o processo em composição, produção, gravação, edição, mix, revisão e entrega. Defina critérios de conclusão e limite de revisões.','Produtividade',array['workflow','produção musical','organização'],'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85','https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=85','https://player.vimeo.com/video/76979871','published',now()-interval '3 days',now(),now()-interval '3 days')
on conflict (slug) do update set
 title=excluded.title,subtitle=excluded.subtitle,description=excluded.description,body=excluded.body,
 category=excluded.category,tags=excluded.tags,thumbnail_url=excluded.thumbnail_url,banner_url=excluded.banner_url,
 video_url=excluded.video_url,status=excluded.status,updated_at=now(),published_at=excluded.published_at;

insert into public.course_orders (id,user_id,status,provider,provider_reference,amount_cents,currency,is_demo,paid_at,created_at,updated_at) values
('ca100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','paid','stripe','demo_course_001',41700,'BRL',true,now()-interval '40 days',now()-interval '40 days',now()),
('ca100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','paid','pix','demo_course_002',34700,'BRL',true,now()-interval '28 days',now()-interval '28 days',now()),
('ca100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','paid','stripe','demo_course_003',39700,'BRL',true,now()-interval '18 days',now()-interval '18 days',now()),
('ca100000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','paid','pix','demo_course_004',47700,'BRL',true,now()-interval '8 days',now()-interval '8 days',now()),
('ca100000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','pending','stripe','demo_course_005',29700,'BRL',true,null,now()-interval '1 day',now())
on conflict (id) do update set status=excluded.status,amount_cents=excluded.amount_cents,paid_at=excluded.paid_at,updated_at=now();

insert into public.course_order_items (id,order_id,course_id,course_title_snapshot,amount_cents,currency,created_at) values
('ca200000-0000-4000-8000-000000000001','ca100000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','Mixagem Moderna para Streaming',41700,'BRL',now()),
('ca200000-0000-4000-8000-000000000002','ca100000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','Composição e Songwriting',34700,'BRL',now()),
('ca200000-0000-4000-8000-000000000003','ca100000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000003','Marketing Musical e Lançamentos',39700,'BRL',now()),
('ca200000-0000-4000-8000-000000000004','ca100000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000004','Beatmaking: Trap, Funk e Drill',47700,'BRL',now()),
('ca200000-0000-4000-8000-000000000005','ca100000-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000005','Direitos Autorais e Distribuição Digital',29700,'BRL',now())
on conflict (id) do update set amount_cents=excluded.amount_cents,course_title_snapshot=excluded.course_title_snapshot;
