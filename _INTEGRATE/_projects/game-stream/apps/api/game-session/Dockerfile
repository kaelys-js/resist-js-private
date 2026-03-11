FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  curl \
  xvfb \
  x11vnc \
  ffmpeg \
  pulseaudio \
  x11-xserver-utils \
  libpulse-dev \
  libx264-dev \
  libvpx-dev \
  libegl1 \
  libgl1-mesa-dri \
  libgl1-mesa-glx \
  libgles2 \
  libdrm2 \
  unzip \
  p7zip-full \
  software-properties-common \
  && apt-get update && apt-get install -y retroarch \
  && apt-get purge -y gamemode libgamemode* || true \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

RUN ARCH=$(dpkg --print-architecture) && \
  if [ "$ARCH" = "arm64" ]; then \
    ln -sf /lib/aarch64-linux-gnu/libEGL_mesa.so.0 /lib/aarch64-linux-gnu/libEGL.so; \
  elif [ "$ARCH" = "amd64" ]; then \
    ln -sf /usr/lib/x86_64-linux-gnu/libEGL.so.1 /usr/lib/x86_64-linux-gnu/libEGL.so; \
  fi

RUN ARCH=$(dpkg --print-architecture) && \
  if [ "$ARCH" = "arm64" ]; then \
    ln -sf /lib/aarch64-linux-gnu/libGLESv2.so.2 /lib/aarch64-linux-gnu/libGLESv2.so; \
  elif [ "$ARCH" = "amd64" ]; then \
    ln -sf /usr/lib/x86_64-linux-gnu/libGLESv2.so.2 /usr/lib/x86_64-linux-gnu/libGLESv2.so; \
  fi

# Install correct libretro cores by architecture
RUN set -eux; \
  ARCH="$(dpkg --print-architecture)"; \
  echo "📦 Detected architecture: $ARCH"; \
  mkdir -p /usr/lib/libretro; \
  if [ "$ARCH" = "arm64" ]; then \
    echo "📥 Downloading ARM64 cores..."; \
    curl -L -o /tmp/cores.zip https://github.com/christianhaitian/retroarch-cores/archive/refs/heads/master.zip; \
    unzip /tmp/cores.zip -d /tmp; \
    CORE_DIR="/tmp/retroarch-cores-master/aarch64"; \
    for zip in "$CORE_DIR"/*.zip; do unzip -o "$zip" -d "$CORE_DIR"; done; \
    cp -v "$CORE_DIR"/*.so /usr/lib/libretro/; \
  elif [ "$ARCH" = "amd64" ]; then \
    echo "📥 Downloading x86_64 cores..."; \
    CORE_DIR="https://buildbot.libretro.com/stable/"; \
    VERSION=$(curl -s "$CORE_DIR" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sort -V | tail -n 1); \
    CORE_URL="${CORE_DIR}${VERSION}/linux/x86_64/RetroArch_cores.7z"; \
    curl -L -o /tmp/cores.7z "$CORE_URL"; \
    7z x /tmp/cores.7z -o/tmp/libretro_cores; \
    cp -v /tmp/libretro_cores/*.so /usr/lib/libretro/; \
  else \
    echo "❌ Unsupported architecture: $ARCH"; \
    exit 1; \
  fi; \
  chmod -R 755 /usr/lib/libretro; \
  chmod +x /usr/lib/libretro; \
  rm -rf /tmp/cores* /tmp/retroarch-cores-master /tmp/libretro_cores

WORKDIR /app
COPY . .
# TODO: copy log.sh

RUN gcc -o /usr/local/bin/uinput-helper uinput-helper.c

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
