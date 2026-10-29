# The «Excel yüklə» button's server side (scripts/import_service.py), on the QRLog VPS beside the site's nginx.
FROM python:3.12-slim
RUN pip install --no-cache-dir openpyxl==3.1.5 defusedxml==0.7.1
WORKDIR /app
COPY import_workbook.py import_service.py catalog_edit.py ./
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8080
CMD ["python", "import_service.py"]
