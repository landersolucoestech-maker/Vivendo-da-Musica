drop trigger if exists set_product_reviews_updated_at on public.product_reviews;
create trigger set_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_product_questions_updated_at on public.product_questions;
create trigger set_product_questions_updated_at
before update on public.product_questions
for each row execute function public.set_updated_at();
