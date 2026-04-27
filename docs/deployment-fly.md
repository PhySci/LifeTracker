# Fly.io Deployment

This guide deploys LifeTracker as one Fly app:

- nginx serves the built React/Vite frontend;
- nginx proxies `/api/*` to FastAPI on `127.0.0.1:8000`;
- SQLite is stored on a persistent Fly Volume mounted at `/data`;
- the first public URL can be the default `https://<app>.fly.dev`.

## Files

- `Dockerfile.fly`: production image for Fly.io.
- `fly/nginx.conf`: static frontend and `/api` reverse proxy.
- `fly/start.sh`: starts FastAPI and nginx.
- `fly.toml`: Fly app configuration.

## First Deploy

Install and log in to Fly:

```shell
fly auth login
```

Choose a unique app name and update `app` in `fly.toml`. If needed, also change
`primary_region` to the closest Fly region.

Create the Fly app without deploying:

```shell
fly apps create <app-name>
```

Create the SQLite volume in the same region as `primary_region`:

```shell
fly volumes create lifetracker_data --size 1 --region ams
```

Set production secrets:

```shell
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"
fly secrets set DATABASE_URL="sqlite:////data/lifetracker.db"
```

Deploy:

```shell
fly deploy
```

Open the app:

```shell
fly open
```

## Smoke Test

After deployment:

1. Register or log in.
2. Create a category and activity.
3. Log an event.
4. Check that the heatmap updates.
5. Restart the machine and confirm the data is still present:

```shell
fly machine list
fly machine restart <machine-id>
```

## Updating

```shell
fly deploy
fly logs
```

## Registration Lockdown

For a personal deployment, create your user first, then optionally disable new
registrations:

```shell
fly secrets set ALLOW_REGISTRATION=false
```

The public `/users` endpoints are disabled automatically when
`ENVIRONMENT=production`, unless `ALLOW_PUBLIC_USER_ENDPOINTS=true` is set.

## Backups

Fly Volumes have snapshots. For an extra SQLite copy inside the volume, run:

```shell
fly ssh console -C "python - <<'PY'
from pathlib import Path
import shutil
from datetime import datetime

source = Path('/data/lifetracker.db')
target = Path('/data') / f'lifetracker-{datetime.utcnow():%Y%m%d%H%M%S}.db'
shutil.copy2(source, target)
print(target)
PY"
```

To restore, stop the app, copy the selected database file back to
`/data/lifetracker.db`, and deploy or restart the machine.

## Custom Domain

The Fly-provided `*.fly.dev` domain is enough for the first deploy. Later, add a
custom domain:

```shell
fly certs add example.com
fly certs show example.com
```

Then create the DNS records shown by Fly at your domain registrar.
