FROM python:3.13-slim
RUN useradd -u 10001 -M pu && mkdir /dados && chown pu /dados
COPY ambiente/servidor.py /servidor.py
COPY app/public/ /site/
USER 10001:10001
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
CMD ["python", "/servidor.py"]
