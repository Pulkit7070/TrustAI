FROM python:3.10-slim

WORKDIR /app

# Install CPU-only PyTorch first (smaller image)
RUN pip install --no-cache-dir torch==2.4.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir fastapi==0.115.0 uvicorn[standard]==0.30.0 numpy==1.26.4 pydantic==2.9.0

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
