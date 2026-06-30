# Debug Session: `unreachable-warning` [OPEN]

## Problema
- Firefox sigue mostrando `Warning: unreachable code after return statement`.
- El warning aparece al navegar en la app, aunque el flujo funcional ya trabaja bien.

## Hipótesis Iniciales
- H1. Aun queda alguna importación estática de `jspdf`, `docx`, `xlsx` o `file-saver`.
- H2. El warning proviene del bundle generado por librerías de terceros y no de código propio.
- H3. Alguna ruta compartida sigue metiendo estas dependencias en el bundle inicial.
- H4. El warning es exclusivo de Firefox en modo desarrollo y no representa un error funcional.

## Estado
- Analizando imports y origen real del warning.
