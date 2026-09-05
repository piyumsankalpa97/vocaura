-- Create recordings bucket
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false);



-- Policy to allow authenticated users to insert files into their own folder
create policy "Users can insert their own recordings"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'recordings' 
    and auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy to allow authenticated users to select files from their own folder
create policy "Users can select their own recordings"
on storage.objects for select
to authenticated
using (
    bucket_id = 'recordings' 
    and auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy to allow authenticated users to delete files from their own folder
create policy "Users can delete their own recordings"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'recordings' 
    and auth.uid()::text = (string_to_array(name, '/'))[1]
);