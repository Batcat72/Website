FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    python3-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Increase pip timeout (critical for large packages like torch)
ENV PIP_DEFAULT_TIMEOUT=1000
ENV PIP_NO_CACHE_DIR=1

# Use stable PyPI
RUN pip config set global.index-url https://pypi.org/simple \
    && pip config set global.trusted-host pypi.org

# 🔥 Fix numpy FIRST (critical compatibility fix)
RUN pip install --no-cache-dir numpy==1.26.4

# 🔥 Install required missing dependencies (manual since --no-deps is used)
RUN pip install --no-cache-dir \
    click itsdangerous blinker h11 \
    joblib threadpoolctl imageio lazy_loader tifffile \
    python-dateutil pytz tzdata \
    attrs jax jaxlib sounddevice opencv-contrib-python \
    contourpy cycler fonttools kiwisolver pyparsing \
    exceptiongroup iniconfig pluggy \
    gdown fire gunicorn mtcnn tqdm dm-tree tomli importlib-resources

# 🔥 Now install your requirements safely
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt --no-deps
# Install dependencies (CPU optimized for torch)
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu torchvision==0.17.2+cpu torchaudio==2.2.2 \
    --index-url https://download.pytorch.org/whl/cpu

# 🔥 FIX: Force OpenCV install (ensures cv2 is available)
RUN pip install --no-cache-dir opencv-python-headless==4.9.0.80
RUN pip install tensorflow-cpu==2.16.1

# 🔥 FIX: Install remaining dependencies (this was missing before)
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt --no-deps
RUN pip install --no-cache-dir python-socketio==5.11.2 python-engineio==4.9.0

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser
ENV PATH="/home/appuser/.local/bin:$PATH"
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["python", "src/main.py"]