FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DADOS=/dados
WORKDIR /app
RUN groupadd -g 10001 enem && useradd -u 10001 -g enem -M enem && mkdir /dados && chown enem:enem /dados
COPY --chown=enem:enem app/ /app/
USER 10001:10001
EXPOSE 8000
CMD ["python", "servidor.py"]
