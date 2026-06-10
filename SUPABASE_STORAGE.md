# Supabase Storage

The backend uploads restaurant, menu item, and review images through the
Supabase S3-compatible endpoint.

## Required environment variables

```text
SUPABASE_STORAGE_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_REGION=<region-from-the-Supabase-S3-settings-page>
SUPABASE_STORAGE_ACCESS_KEY=<s3-access-key>
SUPABASE_STORAGE_SECRET_KEY=<s3-secret-key>
SUPABASE_STORAGE_BUCKET=<public-bucket-name>
SUPABASE_STORAGE_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public/<public-bucket-name>
```

The bucket must be public and the S3 protocol must be enabled in Supabase.
Storage credentials belong only in the backend environment.
Use the exact S3 region shown in the project settings; a database or application
region from another project will cause `SignatureDoesNotMatch`.

New restaurant, menu item, and review uploads are written directly to
Supabase Storage. The application does not use a local `uploads` directory.
