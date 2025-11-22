# Backend Dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app
VOLUME /app/media

# Install system dependencies (for psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-tha \
    libgl1 \
    libglib2.0-0 \
    libzbar0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port for Django
EXPOSE 8000

# Run server (use 0.0.0.0 so container listens to all)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
