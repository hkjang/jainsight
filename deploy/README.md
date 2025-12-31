# Offline Deployment Guide

## 1. Build Images (On Online Machine)

Run the build script from the project root:

### Windows

```powershell
.\deploy\build_offline_windows.ps1
```

### Linux

```bash
chmod +x deploy/build_offline_linux.sh
./deploy/build_offline_linux.sh
```

This will create `jainsight-api.tar` and `jainsight-web.tar` in the `deploy` folder.

## 2. Transfer Files

Copy the entire `deploy` folder to the target offline machine.

## 3. Load Images (On Offline Machine)

Open PowerShell in the `deploy` folder on the target machine and run:

### Windows

```powershell
.\load_offline.ps1
```

### Linux

```bash
chmod +x load_offline_linux.sh
./load_offline_linux.sh
```

## 4. specific

Run the application:

```powershell
docker-compose -f docker-compose.offline.yml up -d
```

## Access

- Web Interface: http://localhost:4200
- API: http://localhost:3000

## Notes

- Ensure Docker and Docker Compose are installed on the target machine.
- If you need to change the API URL for the Web app (e.g., if accessing from another machine), update `API_URL` in `docker-compose.offline.yml` before running `up`.
