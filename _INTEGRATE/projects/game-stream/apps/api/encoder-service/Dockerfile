# Use the official minimal Debian base image (bookworm-slim variant)
FROM debian:bookworm-slim

# Disable interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# --- Install essential runtime dependencies ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    alsa-utils \              # ALSA command-line utilities (e.g., to manage audio devices)
    bash \                    # Default Unix shell
    ca-certificates \         # Certificates for verifying SSL connections (HTTPS)
    ffmpeg \                  # Multimedia framework for audio/video encoding and streaming
    inetutils-ping \          # 'ping' command for network troubleshooting
    iproute2 \                # Network configuration utilities (e.g., ip command)
    libasound2 \              # ALSA shared library (required for audio)
    libx11-dev \              # X11 core protocol headers (needed for GUI-related dev work)
    libxext-dev \             # X11 extension headers (used by many X-based apps)
    pulseaudio \              # PulseAudio sound server (user-based audio management)
    pulseaudio-utils \        # CLI utilities for interacting with PulseAudio
    sudo \                    # Allows running commands as another user (e.g., root)
    x11-utils \               # Set of utilities to query X11 display information
    x11-xserver-utils \       # Tools like `xrandr`, `xset` for managing X server behavior
    x11vnc \                  # VNC server for X display (for remote GUI access)
    xauth \                   # X11 authorization utility (handles X sessions securely)
  && rm -rf /var/lib/apt/lists/*  # Clean up package list to reduce image size

# --- Create a non-root user (recommended for audio and GUI sessions) ---
RUN useradd -ms /bin/bash streamer   # Create user 'streamer' with a home directory and Bash shell

# --- Set the working directory to the new user's home ---
WORKDIR /home/streamer

# --- Copy application and log scripts to container ---
COPY entrypoint.sh log.sh /home/streamer/
# TODO: copy log.sh

# --- Set execute permissions and correct ownership for scripts ---
RUN chmod +x /home/streamer/entrypoint.sh /home/streamer/log.sh \
  && chown streamer:streamer /home/streamer/entrypoint.sh \
  && chown streamer:streamer /home/streamer/log.sh \
  && mv /home/streamer/log.sh /usr/local/bin/

# --- Switch to the non-root user for runtime ---
USER streamer

# --- Define the default command to run when the container starts ---
ENTRYPOINT ["./entrypoint.sh"]