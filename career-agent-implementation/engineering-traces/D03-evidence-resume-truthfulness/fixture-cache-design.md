# Cache Design

The service uses Redis cache-aside. Writes commit to MySQL first and then delete the cache key. Failed invalidations are retried from an outbox. No benchmark result is recorded here.
