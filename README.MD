# FinGuard Budget Monitor

FinGuard Budget Monitor es una aplicación serverless en AWS para que una pequeña empresa
suba sus gastos en un archivo CSV y visualice:

- Gasto total del periodo
- Gasto por categoría
- Alertas cuando una categoría excede cierto presupuesto

## Arquitectura (versión 1)

- **Frontend**: HTML + CSS + JavaScript estático en Amazon S3 distribuido con CloudFront.
- **Backend (API)**: Amazon API Gateway + AWS Lambda (Python).
- **Datos**: Amazon DynamoDB (agregados de gasto por mes y categoría).

El objetivo del proyecto es demostrar:

- Diseño escalable y sin servidores (serverless)
- Buenas prácticas básicas de seguridad (IAM, cifrado en reposo, HTTPS)
- Optimización de costos usando servicios administrados y pago por uso
