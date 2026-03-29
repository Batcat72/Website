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

# 🔥 Now install your requirements safely
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

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