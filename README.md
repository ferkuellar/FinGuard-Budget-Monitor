# 💰 FinGuard – Serverless Budget Monitor en AWS

FinGuard es una **aplicación serverless de monitoreo de gastos** diseñada como proyecto de portafolio para el examen **AWS Certified Solutions Architect – Professional**.

El objetivo del proyecto es demostrar:

- Diseño de una solución **alta disponibilidad y bajo acoplamiento** usando servicios administrados.
- Uso de **Infraestructura como Código** con AWS CloudFormation.
- Buenas prácticas de **seguridad, multi-tenant y optimización de costos**.

---

## 🧩 Caso de uso

Una pequeña empresa quiere subir periódicamente un archivo **CSV de gastos** (fecha, categoría, monto) y que el sistema:

1. Procese el archivo en el navegador.
2. Envíe los datos a una API segura.
3. Agregue montos por **mes + categoría**.
4. Persista los resultados en una base **serverless** (DynamoDB) para futuros dashboards o análisis.

Este proyecto implementa ese flujo end-to-end.

---

## 🏗 Arquitectura

**Diagrama lógico (alto nivel):**

```text
[Usuario] 
    │
    │ (HTTPS, navegador)
    ▼
[Amazon S3 Static Website Hosting]  (frontend: HTML + CSS + JS)
    │
    │ fetch POST /ingest (JSON)
    ▼
[Amazon API Gateway HTTP API]  (/ingest)
    │
    │ invocación Lambda (proxy)
    ▼
[AWS Lambda - FinGuardIngestFunction] (Python)
    │
    │ batch write
    ▼
[Amazon DynamoDB - Tabla FinGuardExpenses]
    PK: tenantId (String)
    SK: yearMonthCategor (String, ej. "2025-01#Marketing")
    Atributo: totalAmount (Number)
````

**Características clave:**

* **Frontend estático** en S3 (simplicidad + bajo costo).
* **API Gateway HTTP API** para exponer un endpoint `/ingest`.
* **Lambda en Python** que:

  * Recibe un JSON con todas las filas del CSV.
  * Calcula agregados por `YYYY-MM` + `category`.
  * Escribe los agregados en DynamoDB con `batch_writer`.
* **DynamoDB** en modo **On-Demand** (pago por request).

---

## 🧱 Stack tecnológico

* **AWS S3** – Static website hosting.
* **AWS API Gateway (HTTP API)** – Endpoint REST `/ingest`.
* **AWS Lambda (Python 3.x)** – Lógica de agregación.
* **AWS DynamoDB** – Persistencia de montos agregados.
* **AWS CloudFormation** – Plantilla `infra/fin-guard.yml`.
* **Frontend** – HTML + CSS + JavaScript puro (sin framework).
* **AWS CLI** – Despliegue desde consola.

---

## 📁 Estructura del repositorio

```text
FinGuard-Budget-Monitor/
├─ frontend/
│   ├─ index.html              # UI para cargar CSV y ver preview
│   ├─ styles.css              # Estilos (dark theme, AWS-like)
│   └─ app.js                  # Lógica de lectura CSV + llamada a API
├─ infra/
│   └─ fin-guard.yml           # CloudFormation (API, Lambda, DynamoDB, S3)
├─ sample-data/
│   └─ gastos-100-registros.csv# CSV de ejemplo con 100 filas
├─ .gitignore                  # Exclusión de .env, claves, etc.
└─ README.md
```

---

## 🚀 Despliegue con CloudFormation

> Requisitos:
>
> * AWS CLI configurado (`aws configure`)
> * Permisos para crear: S3, API Gateway, Lambda, DynamoDB, IAM roles

### 1. Crear el stack de infraestructura

Desde la raíz del proyecto:

```bash
aws cloudformation deploy \
  --template-file infra/fin-guard.yml \
  --stack-name fin-guard-demo \
  --capabilities CAPABILITY_IAM
```

Cuando termine, consulta los **outputs**:

```bash
aws cloudformation describe-stacks \
  --stack-name fin-guard-demo \
  --query "Stacks[0].Outputs" \
  --output table
```

Verás algo similar a:

* `ApiBaseUrl` → URL base del HTTP API (ej. `https://xxxx.execute-api.us-east-1.amazonaws.com`)
* `DynamoTableName` → Nombre de la tabla DynamoDB (ej. `fin-guard-FinGuardExpenses`)
* `WebsiteURL` → URL del sitio estático FinGuard en S3.

---

## 🌐 Publicar el frontend en S3

Desde la carpeta `frontend/`:

```bash
cd frontend

aws s3 sync . s3://151567229153-fin-guard-frontend \
  --delete
```

> Cambia el nombre del bucket si tu stack de CloudFormation creó uno diferente
> (el nombre aparece en el output `WebsiteURL`).

Luego abre en el navegador la `WebsiteURL` (ejemplo):

```text
http://151567229153-fin-guard-frontend.s3-website-us-east-1.amazonaws.com
```

---

## 🧪 Cómo probar la aplicación

### 1. CSV de ejemplo

Formato esperado:

```text
date,category,amount
2025-01-01,Marketing,1200
2025-01-05,Operación,800
2025-01-10,Infraestructura,350
...
```

Puedes usar el archivo incluido:

```text
sample-data/gastos-100-registros.csv
```

### 2. Flujo en el frontend

1. Abrir la URL del sitio FinGuard.
2. Seleccionar el archivo `gastos-100-registros.csv`.
3. Ver el **preview paginado** (10 filas por página).
4. Pulsar **“Enviar CSV a AWS”**.
5. Ver el mensaje: `Datos ingresados correctamente.`

### 3. Validar en DynamoDB

Ir a:

* **DynamoDB → Tables → [fin-guard-FinGuardExpenses] → Explore items**

Ejemplos de items:

```text
tenantId          = "empresa-demo"
yearMonthCategor  = "2025-01#Marketing"
totalAmount       = 1700

tenantId          = "empresa-demo"
yearMonthCategor  = "2025-01#Operación"
totalAmount       = 1600
```

---

## 🔐 Seguridad y buenas prácticas

* **IAM mínimo necesario**:
  La función Lambda usa un rol con permiso **solo** para:

  * Escribir en la tabla DynamoDB `fin-guard-FinGuardExpenses`.
  * Escribir logs en CloudWatch.

* **CORS controlado**:
  API Gateway expone `/ingest` con CORS habilitado únicamente para el origen del sitio S3 (ajustable).

* **Gestión de secretos**:

  * Las access keys NUNCA se almacenan en el repositorio.
  * `.env` y archivos de credenciales están listados en `.gitignore`.
  * Las pruebas se hacen usando **AWS CLI configurado localmente**.

* **Costos estimados** (modo demo):

  * DynamoDB On-Demand con pocas escrituras → costo muy bajo.
  * Lambda y API Gateway con tráfico moderado → dentro del free tier o unos centavos al mes.
  * S3 static hosting → centavos/mes por almacenamiento y transferencias.

---

## 📌 Notas para portafolio / entrevistas

Este proyecto demuestra que puedes:

* Diseñar una **arquitectura serverless** simple pero realista en AWS.
* Utilizar **CloudFormation** para desplegar API Gateway, Lambda, DynamoDB y S3 con un solo comando.
* Implementar un flujo end-to-end:

  * **Frontend estático** → **API REST** → **Función Lambda** → **Base NoSQL**.
* Aplicar conceptos de:

  * Multi-tenant (`tenantId` en la clave primaria).
  * Integración segura con IAM y CORS.
  * Optimización de costos con servicios administrados.

---

## ⚙️ Próximas mejoras posibles

Algunas extensiones naturales del proyecto:

* Añadir un **endpoint GET** para leer los agregados de DynamoDB y mostrarlos en el frontend.
* Agregar **gráficas de barras** (ingresos/gastos por mes/categoría) usando Chart.js.
* Integrar **CloudFront** delante del sitio S3 para mejor performance global.
* Añadir autenticación con **Amazon Cognito** para separar tenants reales.

---

## 📄 Licencia

Proyecto educativo y de portafolio personal.
Úsalo como referencia bajo tu propia responsabilidad.


