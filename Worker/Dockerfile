FROM python:3.11-slim

WORKDIR /app

ENV PYTHONPATH=/app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Reports queue backlog + active/reserved task counts, not just "is the
# process alive" — see health_check.py.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python health_check.py || exit 1

CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info"]