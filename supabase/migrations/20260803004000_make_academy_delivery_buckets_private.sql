-- Course delivery assets must not be publicly addressable. The active lesson
-- flow already uses private lesson-specific buckets and signed access; keep the
-- legacy academy delivery buckets private as well.

update storage.buckets
set public = false
where id in ('academy-videos', 'academy-materials');
