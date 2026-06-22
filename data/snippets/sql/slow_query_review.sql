-- Review top slow queries in MySQL 8 by digest.
SELECT
    digest_text,
    schema_name,
    count_star,
    avg_timer_wait / 1000000000000 AS avg_seconds,
    max_timer_wait / 1000000000000 AS max_seconds,
    sum_rows_examined,
    sum_rows_sent
FROM performance_schema.events_statements_summary_by_digest
WHERE last_seen >= NOW() - INTERVAL 1 DAY
ORDER BY avg_timer_wait DESC
LIMIT 20;
