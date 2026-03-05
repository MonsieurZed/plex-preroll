# Plex Preroll Manager

Web interface to dynamically manage Plex Media Server pre-rolls. Schedule seasonal videos, set per-video frequency weights, and automatically sync your Plex configuration.

![Preview](image.png)

![Docker Image](https://img.shields.io/docker/v/monsieurzed/plex-preroll?sort=semver&label=docker)
![Docker Pulls](https://img.shields.io/docker/pulls/monsieurzed/plex-preroll)

---

## Features
Here is the simplified list of core features in English:

### Video Management
Intuitive Organization: Enable or disable videos using drag & drop between columns.
Playback Weight: A weight badge (x1 to x10) sets the relative probability of a video appearing in the rotation.
Integrated Preview: Direct video player to check content (Auto-play or Pause on first frame modes).
"Skip" Slider: Define the probability of playing a pre-roll (e.g., a 20% chance to skip straight to the movie).

### Seasonal Scheduling
Smart Calendars: Create custom schedules (Christmas, Halloween, Summer) with specific start and end dates.
Priority Logic: If periods overlap, the system automatically selects the high-priority one (Green for active, Orange for lower priority).
Annual Grid: A 12-month view to see at a glance which schedule is active for every day of the year.

### Plex Synchronization
Sync Button: Instantly updates the Plex pre-roll string based on your changes.
Direct Control: View the current Plex configuration and trigger a folder rescan without restarting the server.

🖥️ UI & Status
Status Indicator: A colored dot shows if changes are saved, synced, or if an error occurred.
Bilingual Support: Quick toggle between French and English.
---

## Quick start

### Docker Compose

```yaml
services:
  plex-preroll:
    image: monsieurzed/plex-preroll:latest
    container_name: plex-preroll
    environment:
      - PLEX_URL=http://<PLEX_IP>:32400
      - PLEX_TOKEN=<YOUR_PLEX_TOKEN>
      - PLEX_PREROLL_PATH=/prerolls
    volumes:
      - ./data:/data
      - /path/to/your/prerolls:/prerolls:ro
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Access at `http://<HOST>:3000`

### Environment variables

| Variable            | Required | Description                                                                                                                           |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `PLEX_URL`          | ✅       | URL of your Plex server, e.g. `http://192.168.1.10:32400`                                                                             |
| `PLEX_TOKEN`        | ✅       | Plex authentication token ([how to get it](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)) |
| `PLEX_PREROLL_PATH` | ✅       | Path to the prerolls folder as Plex sees it on the host (left side of the volume mount)                                               |

### Volumes

| Volume                           | Description                                             |
| -------------------------------- | ------------------------------------------------------- |
| `./data:/data`                   | JSON config storage (schedules, weights, probabilities) |
| `/path/to/prerolls:/prerolls:ro` | Video files folder (read-only recommended)              |

---

## Architecture

Single Docker image (`python:3.12-slim`) combining:

- **nginx** — serves the static frontend on port 3000, reverse-proxies to the API
- **uvicorn + FastAPI** — REST API on port 8000 (internal)
- **supervisord** — manages both processes

---

## Local development

```bash
git clone https://github.com/MonsieurZed/plex-preroll.git
cd plex-preroll
docker compose up -d --build
```

---

## License

MIT
