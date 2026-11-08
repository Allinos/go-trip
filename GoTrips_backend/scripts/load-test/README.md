# Load test

Simulates N people using the apps at the same time. Each virtual user does an action every 5–15 s:
searching trips, browsing drivers and rentals, opening details, checking bookings and notifications, and occasionally booking.
About 10% are partners, who poll their dashboard and bookings and send live-location pings.
Half the users use Assamese.

**Never point this at production.** It creates bookings. Use a copy of the database.

```bash
# 1. API in cluster mode (one worker per core, like PM2) against a TEST database, with Redis
REDIS_URL=redis://localhost:6379 RATE_LIMIT_MULTIPLIER=1000 PORT=3300 NODE_ENV=production \
DATABASE_URL="postgresql://…/gotrip_load?connection_limit=20" node scripts/load-test/cluster.js

# 2. Generate load: <users> <seconds> <think-min-s> <think-max-s>
TARGET=http://127.0.0.1:3300 JWT_ACCESS_SECRET=<same as API> TRIP_BASE=<min trip id> \
node scripts/load-test/run.js 10000 120 5 15
```

`RATE_LIMIT_MULTIPLIER` is raised only because every virtual user comes from one IP. Real users come from many IPs, so keep the default in production.

To see which queries cost the most, enable `pg_stat_statements` and query it after a run.
