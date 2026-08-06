-- Real profile photos are never exposed through public profile discovery.
-- The application gateway re-checks get_photo_reveal_status for every image
-- request. Keep the underlying bucket private as a defence in depth measure.

update storage.buckets
set public = false
where id = 'profile-photos';

-- Remove historical broad read policies if they were created before the
-- mutual-consent policy. The current policy delegates access to
-- can_view_profile_photo(), which requires two explicit active consents.
drop policy if exists "Authenticated users can view public profile photos"
on storage.objects;

create policy "Authenticated users can view mutually revealed profile photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.can_view_profile_photo((storage.foldername(name))[1])
);
