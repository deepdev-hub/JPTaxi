package com.jptaxi.application;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"supabase.storage.endpoint=https://project.storage.supabase.co/storage/v1/s3",
		"supabase.storage.region=ap-southeast-1",
		"supabase.storage.access-key=test-access-key",
		"supabase.storage.secret-key=test-secret-key",
		"supabase.storage.bucket=images",
		"supabase.storage.public-url=https://project.supabase.co/storage/v1/object/public/images"
})
class ApplicationTests {

	@Test
	void contextLoads() {
	}

}
