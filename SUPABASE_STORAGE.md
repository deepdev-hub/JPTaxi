# Supabase Storage

The backend uploads restaurant, menu item, and review images through the
Supabase S3-compatible endpoint.

## Required environment variables

```text
SUPABASE_STORAGE_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_REGION=ap-southeast-1
SUPABASE_STORAGE_ACCESS_KEY=<s3-access-key>
SUPABASE_STORAGE_SECRET_KEY=<s3-secret-key>
SUPABASE_STORAGE_BUCKET=<public-bucket-name>
SUPABASE_STORAGE_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public/<public-bucket-name>
```

The bucket must be public and the S3 protocol must be enabled in Supabase.
Storage credentials belong only in the backend environment.

## One-time migration from `uploads`

Run the migration locally before deploying the version that removes the old
local image GET endpoints. The normal default is
`APP_STORAGE_MIGRATION_ENABLED=false`.

Set the database and Supabase environment variables, then run:

```powershell
$env:APP_STORAGE_MIGRATION_ENABLED="true"
$env:APP_STORAGE_MIGRATION_ROOT="uploads"
.\mvnw.cmd spring-boot:run
```

The runner:

- uploads files from `uploads/restaurants`, `uploads/menu_items`, and
  `uploads/reviews`;
- keeps the original filename so reruns overwrite the same object key;
- updates legacy local URLs in `restaurants.cover_image`,
  `restaurant_images.image_url`, `menu_items.image`, and
  `review_images.image_url`;
- logs uploaded file, updated row, and error counts;
- does not delete local files.

Stop the application after the migration summary is logged. Unset
`APP_STORAGE_MIGRATION_ENABLED`, verify the public Supabase URLs, and only then
remove the local `uploads` files in a separate change.
