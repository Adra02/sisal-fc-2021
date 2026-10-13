-- Private JPEG bucket. Browser never contacts this bucket directly.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sisal-images','sisal-images',false,315000,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=315000,allowed_mime_types=array['image/jpeg'];
-- No anon/authenticated policy is needed. Only server service_role accesses files.
