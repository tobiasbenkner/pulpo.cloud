# Backups

Sichert alle Docker Volumes und `/srv` als tar.gz Archive, lädt sie auf MinIO hoch und bereinigt alte Backups nach konfigurierbarer Retention.

## Voraussetzungen

- [MinIO Client (mc)](https://min.io/docs/minio/linux/reference/minio-mc.html)

```bash
wget https://dl.min.io/aistor/mc/release/linux-amd64/mc
chmod +x mc
mv mc /usr/local/bin/
```

- Docker

## Konfiguration

`.env` anlegen (siehe `.env.example`):

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

MINIO_ENDPOINT=https://minio.example.com
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=backups
MINIO_RETENTION_DAYS=30
```

## Manuell ausführen

```bash
./run.sh
```

## Cronjob (als Root)

```bash
PATH=/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin
LD_LIBRARY_PATH=/usr/local/lib
0 3 * * * /srv/backups/run.sh >> /var/log/backup.log 2>&1
```
