-- Legacy policies allowed every authenticated user to mutate every object in
-- the public lesson-projects and lesson-samples buckets. Owner-scoped policies
-- already exist, so remove only the broad overlapping write policies.

drop policy if exists "Authenticated users can upload lesson projects"
on storage.objects;

drop policy if exists "Authenticated users can update lesson projects"
on storage.objects;

drop policy if exists "Authenticated users can delete lesson projects"
on storage.objects;

drop policy if exists "Authenticated users can upload lesson samples"
on storage.objects;

drop policy if exists "Authenticated users can update lesson samples"
on storage.objects;

drop policy if exists "Authenticated users can delete lesson samples"
on storage.objects;
