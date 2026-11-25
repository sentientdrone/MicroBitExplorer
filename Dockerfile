# micro:bit Explorer: the web app plus its tiny Python server (standard library only).
# The micro:bit itself is reached by the browser on the host (Web Serial / WebUSB),
# so the container needs no USB devices. It only needs the host's USB-drive mounts
# for "Flash via USB drive" (see compose.yaml).
FROM python:3.13-alpine

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MICROBIT_HOST=0.0.0.0 \
    MICROBIT_PORT=8321 \
    MICROBIT_NO_BROWSER=1 \
    MICROBIT_MEDIA_ROOTS=/media:/run/media:/mnt \
    MICROBIT_DATA=/data

WORKDIR /app
COPY server.py classroom.py ./
COPY static ./static

# Class Explorer data (shared builds, kid accounts). Owned by UID 1000 so a
# fresh named volume mounted here starts out writable.
RUN mkdir /data && chown 1000:1000 /data
VOLUME /data

# Run as an ordinary user (compose overrides this with your own UID so the
# MICROBIT drive, which belongs to you, is writable).
USER 1000:1000
EXPOSE 8321

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8321/api/drive', timeout=2)"

CMD ["python", "server.py"]
