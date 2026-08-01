create unique index if not exists uq_course_orders_provider_reference on public.course_orders(provider,provider_reference) where provider_reference is not null;
create unique index if not exists uq_beat_orders_provider_reference on public.beat_orders(provider,provider_reference) where provider_reference is not null;
create unique index if not exists uq_digital_product_orders_provider_reference on public.digital_product_orders(provider,provider_reference) where provider_reference is not null;
