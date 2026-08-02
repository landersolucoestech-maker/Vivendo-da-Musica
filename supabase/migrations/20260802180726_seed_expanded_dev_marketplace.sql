-- Marketplace, beat licensing, sales and producer finance demo data.

insert into public.seller_products (
  id,seller_id,title,slug,description,product_type,price_cents,currency,status,cover_url,is_demo,published_at,created_at,updated_at
) values
('db100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','Afrobeat Sample Pack','afrobeat-sample-pack','Pack demonstrativo com drums, percussões, loops melódicos e efeitos para produções afrobeat e afropop.','drum_kit',8900,'BRL','published','https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=85',true,now()-interval '55 days',now()-interval '60 days',now()),
('db100000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Template de Mixagem Profissional','template-mixagem-profissional','Template demonstrativo com buses, grupos, efeitos, referências e estrutura de ganho.','template',12900,'BRL','published','https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85',true,now()-interval '48 days',now()-interval '52 days',now()),
('db100000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','Guia de Produção Musical','guia-producao-musical','E-book demonstrativo com fluxo de produção, gravação, arranjo, mixagem, revisão e entrega.','ebook',5900,'BRL','published','https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85',true,now()-interval '42 days',now()-interval '46 days',now()),
('db100000-0000-4000-8000-000000000004','22222222-2222-4222-8222-222222222222','Drum Kit Favela 808','drum-kit-favela-808','Coleção demonstrativa de kicks, snares, claps, hats, percussões e 808 afinados.','drum_kit',9900,'BRL','published','https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=900&q=85',true,now()-interval '36 days',now()-interval '40 days',now()),
('db100000-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222','Presets Vocais Pop & Trap','presets-vocais-pop-trap','Presets demonstrativos para voz principal, backing, dobra, adlib e efeitos criativos.','preset',7900,'BRL','published','https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=900&q=85',true,now()-interval '30 days',now()-interval '34 days',now()),
('db100000-0000-4000-8000-000000000006','22222222-2222-4222-8222-222222222222','Template Ableton Funk 150 BPM','template-ableton-funk-150-bpm','Projeto demonstrativo organizado com drums, bass, efeitos, automações e estrutura de funk.','project',14900,'BRL','published','https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=85',true,now()-interval '24 days',now()-interval '28 days',now()),
('db100000-0000-4000-8000-000000000007','22222222-2222-4222-8222-222222222222','MIDI Chords Neo Soul','midi-chords-neo-soul','Biblioteca demonstrativa de progressões, voicings e variações MIDI.','midi',6900,'BRL','published','https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85',true,now()-interval '19 days',now()-interval '23 days',now()),
('db100000-0000-4000-8000-000000000008','22222222-2222-4222-8222-222222222222','E-book Lançamento Musical em 30 Dias','ebook-lancamento-musical-30-dias','Guia demonstrativo com calendário, checklist, conteúdo, pitching, distribuição e análise.','ebook',4900,'BRL','published','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=85',true,now()-interval '14 days',now()-interval '18 days',now()),
('db100000-0000-4000-8000-000000000009','22222222-2222-4222-8222-222222222222','Projeto FL Studio Drill Cinemático','projeto-fl-studio-drill-cinematico','Projeto demonstrativo com composição, drums, 808, texturas, automações, arranjo e pré-mix.','project',17900,'BRL','published','https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=900&q=85',true,now()-interval '8 days',now()-interval '12 days',now()),
('db100000-0000-4000-8000-000000000010','22222222-2222-4222-8222-222222222222','Pack de Transições e Efeitos','pack-transicoes-e-efeitos','Coleção demonstrativa de risers, impacts, sweeps, drops, reverse e texturas.','other',5900,'BRL','published','https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=900&q=85',true,now()-interval '3 days',now()-interval '6 days',now())
on conflict (slug) do update set
 title=excluded.title,description=excluded.description,product_type=excluded.product_type,
 price_cents=excluded.price_cents,status=excluded.status,cover_url=excluded.cover_url,
 is_demo=true,published_at=excluded.published_at,updated_at=now();

insert into public.seller_product_files (id,product_id,storage_path,file_name,mime_type,size_bytes,created_at)
select
  md5('vdm-demo-product-file-' || product.id::text)::uuid,
  product.id,
  'demo/products/' || product.slug || case when product.product_type='ebook' then '.pdf' else '.zip' end,
  product.title || case when product.product_type='ebook' then '.pdf' else '.zip' end,
  case when product.product_type='ebook' then 'application/pdf' else 'application/zip' end,
  case when product.product_type='ebook' then 12000000 else 96000000 end,
  now()
from public.seller_products product
where product.id::text like 'db100000-%'
on conflict (id) do update set storage_path=excluded.storage_path,file_name=excluded.file_name,mime_type=excluded.mime_type,size_bytes=excluded.size_bytes;

insert into public.digital_product_orders (id,buyer_id,status,provider,provider_reference,amount_cents,currency,is_demo,paid_at,created_at,updated_at) values
('da100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','paid','stripe','demo_prod_001',9900,'BRL',true,now()-interval '32 days',now()-interval '32 days',now()),
('da100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','paid','stripe','demo_prod_002',7900,'BRL',true,now()-interval '26 days',now()-interval '26 days',now()),
('da100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','paid','pix','demo_prod_003',14900,'BRL',true,now()-interval '20 days',now()-interval '20 days',now()),
('da100000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','paid','stripe','demo_prod_004',4900,'BRL',true,now()-interval '12 days',now()-interval '12 days',now()),
('da100000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','paid','pix','demo_prod_005',17900,'BRL',true,now()-interval '6 days',now()-interval '6 days',now()),
('da100000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','pending','stripe','demo_prod_006',6900,'BRL',true,null,now()-interval '1 day',now())
on conflict (id) do update set status=excluded.status,amount_cents=excluded.amount_cents,paid_at=excluded.paid_at,updated_at=now();

insert into public.digital_product_order_items (id,order_id,product_id,seller_id,buyer_id,product_title_snapshot,amount_cents,currency,status,paid_at,created_at,updated_at) values
('da200000-0000-4000-8000-000000000001','da100000-0000-4000-8000-000000000001','db100000-0000-4000-8000-000000000004','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Drum Kit Favela 808',9900,'BRL','paid',now()-interval '32 days',now(),now()),
('da200000-0000-4000-8000-000000000002','da100000-0000-4000-8000-000000000002','db100000-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Presets Vocais Pop & Trap',7900,'BRL','paid',now()-interval '26 days',now(),now()),
('da200000-0000-4000-8000-000000000003','da100000-0000-4000-8000-000000000003','db100000-0000-4000-8000-000000000006','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Template Ableton Funk 150 BPM',14900,'BRL','paid',now()-interval '20 days',now(),now()),
('da200000-0000-4000-8000-000000000004','da100000-0000-4000-8000-000000000004','db100000-0000-4000-8000-000000000008','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','E-book Lançamento Musical em 30 Dias',4900,'BRL','paid',now()-interval '12 days',now(),now()),
('da200000-0000-4000-8000-000000000005','da100000-0000-4000-8000-000000000005','db100000-0000-4000-8000-000000000009','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Projeto FL Studio Drill Cinemático',17900,'BRL','paid',now()-interval '6 days',now(),now()),
('da200000-0000-4000-8000-000000000006','da100000-0000-4000-8000-000000000006','db100000-0000-4000-8000-000000000007','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','MIDI Chords Neo Soul',6900,'BRL','pending',null,now(),now())
on conflict (id) do update set status=excluded.status,paid_at=excluded.paid_at,updated_at=now();

insert into public.beats (
  id,producer_id,slug,title,description,genre,bpm,musical_key,mood,duration_seconds,
  cover_url,preview_file_path,copyright_status,copyright_evidence_id,status,exclusive_available,is_demo,published_at,created_at,updated_at
) values
('be100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','trap-soul-premium','Trap Soul Premium','Piano melancólico, bateria espaçada e 808 profundo.','Trap Soul',142,'F#m','Noturno',174,'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3','registered','DEV-BEAT-001','published',true,true,now()-interval '65 days',now()-interval '70 days',now()),
('be100000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','afro-love-vibes','Afro Love Vibes','Groove afrobeat, guitarras leves e atmosfera romântica.','Afrobeat',104,'C#m','Romântico',188,'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3','registered','DEV-BEAT-002','published',true,true,now()-interval '54 days',now()-interval '58 days',now()),
('be100000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','noite-roxa','Noite Roxa','Trap atmosférico com synths escuros, bells e 808 marcado.','Trap',148,'D#m','Sombrio',182,'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3','registered','DEV-BEAT-003','published',true,true,now()-interval '43 days',now()-interval '47 days',now()),
('be100000-0000-4000-8000-000000000004','22222222-2222-4222-8222-222222222222','favela-solar','Favela Solar','Funk dançante com percussão brasileira, bass pulsante e refrão aberto.','Funk',150,'Am','Ensolarado',166,'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3','registered','DEV-BEAT-004','published',true,true,now()-interval '32 days',now()-interval '36 days',now()),
('be100000-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222','skyline-drill','Skyline Drill','Drill cinematográfico com strings tensas, slides de 808 e bateria agressiva.','Drill',144,'Gm','Cinemático',176,'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3','registered','DEV-BEAT-005','published',true,true,now()-interval '21 days',now()-interval '25 days',now()),
('be100000-0000-4000-8000-000000000006','22222222-2222-4222-8222-222222222222','rnb-depois-das-duas','R&B Depois das Duas','R&B lento com Rhodes, textura vintage e bateria suave.','R&B',86,'Bbmaj7','Íntimo',204,'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3','registered','DEV-BEAT-006','published',true,true,now()-interval '11 days',now()-interval '15 days',now()),
('be100000-0000-4000-8000-000000000007','22222222-2222-4222-8222-222222222222','trap-atlantico','Trap Atlântico','Trap moderno com violão processado, textura oceânica e refrão aberto.','Trap',136,'Em','Inspirador',190,'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3','registered','DEV-BEAT-007','published',true,true,now()-interval '3 days',now()-interval '7 days',now())
on conflict (slug) do update set
 title=excluded.title,description=excluded.description,genre=excluded.genre,bpm=excluded.bpm,
 musical_key=excluded.musical_key,mood=excluded.mood,duration_seconds=excluded.duration_seconds,
 cover_url=excluded.cover_url,preview_file_path=excluded.preview_file_path,status=excluded.status,
 exclusive_available=true,is_demo=true,published_at=excluded.published_at,updated_at=now();

with license_rows as (
  select beat.id beat_id, license_type,
    case license_type when 'basic' then 'Licença Básica' when 'premium' then 'Licença Premium' else 'Licença Exclusiva' end name,
    case license_type when 'basic' then 9900 when 'premium' then 19900 else 149900 end price_cents,
    case license_type when 'exclusive' then true else false end is_exclusive
  from public.beats beat
  cross join (values ('basic'),('premium'),('exclusive')) licenses(license_type)
  where beat.id::text like 'be100000-%'
)
insert into public.beat_licenses (
 id,beat_id,license_type,name,price_cents,currency,deliverables,usage_rights,max_copies,is_exclusive,available,created_at,updated_at
)
select
 md5('vdm-demo-license-' || beat_id::text || '-' || license_type)::uuid,
 beat_id,license_type,name,price_cents,'BRL',
 case when is_exclusive then '["MP3","WAV","Stems"]'::jsonb else '["MP3","WAV"]'::jsonb end,
 case when is_exclusive then '["Uso comercial exclusivo","Streams ilimitados"]'::jsonb else '["Uso comercial","Monetização","Videoclipes"]'::jsonb end,
 case when is_exclusive then null else 100000 end,
 is_exclusive,true,now(),now()
from license_rows
on conflict (id) do update set name=excluded.name,price_cents=excluded.price_cents,deliverables=excluded.deliverables,usage_rights=excluded.usage_rights,is_exclusive=excluded.is_exclusive,available=true,updated_at=now();

insert into public.beat_events (id,beat_id,event_type,user_id,created_at)
select
 md5('vdm-demo-event-' || beat.id::text || '-' || event_type || '-' || event_number)::uuid,
 beat.id,event_type,null,now()-(event_number || ' hours')::interval
from public.beats beat
cross join lateral (
 select 'view'::text event_type, generate_series(1,60) event_number
 union all select 'play', generate_series(1,30)
 union all select 'add_to_cart', generate_series(1,6)
) events
where beat.id::text like 'be100000-%'
on conflict (id) do nothing;

insert into public.beat_orders (id,buyer_id,status,provider,provider_reference,amount_cents,currency,is_demo,paid_at,created_at,updated_at) values
('ba100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','paid','stripe','demo_beat_001',19900,'BRL',true,now()-interval '28 days',now(),now()),
('ba100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','paid','pix','demo_beat_002',19900,'BRL',true,now()-interval '18 days',now(),now()),
('ba100000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','paid','stripe','demo_beat_003',19900,'BRL',true,now()-interval '9 days',now(),now()),
('ba100000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','paid','pix','demo_beat_004',19900,'BRL',true,now()-interval '2 days',now(),now())
on conflict (id) do update set status=excluded.status,amount_cents=excluded.amount_cents,paid_at=excluded.paid_at,updated_at=now();

insert into public.producer_financial_accounts (id,producer_id,currency,current_balance_cents,eligible_balance_cents,next_eligibility_at,created_at,updated_at) values
('bf100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','BRL',116500,82500,now()+interval '5 days',now()-interval '80 days',now())
on conflict (producer_id) do update set current_balance_cents=excluded.current_balance_cents,eligible_balance_cents=excluded.eligible_balance_cents,next_eligibility_at=excluded.next_eligibility_at,updated_at=now();

insert into public.producer_payout_methods (id,producer_id,method_type,display_label,is_default,verified,created_at) values
('bf200000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','pix','PIX •••• 7788',true,true,now()-interval '75 days')
on conflict (id) do update set display_label=excluded.display_label,is_default=true,verified=true;

insert into public.producer_payout_requests (id,producer_id,payout_method_id,amount_cents,currency,status,requested_at,processed_at) values
('bf300000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','bf200000-0000-4000-8000-000000000001',50000,'BRL','paid',now()-interval '22 days',now()-interval '19 days'),
('bf300000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','bf200000-0000-4000-8000-000000000001',60000,'BRL','processing',now()-interval '1 day',null)
on conflict (id) do update set amount_cents=excluded.amount_cents,status=excluded.status,processed_at=excluded.processed_at;
