# Informe de Pruebas Unitarias - EmpleoUni

**Fecha:** 10/06/2026  
**Responsables:** Jan Carlos Guevara, Andrea Jaramillo

## Resumen de cobertura por microservicio

| Microservicio | Statements | Branch | Functions | Lines | Tests pasados |
|---------------|------------|--------|-----------|-------|----------------|
| ms-auth       | 80.2%      | 77.5%  | 53.8%     | 82.6% | 9/9            |
| ms-perfiles   | 87.3%      | 77.5%  | 76.5%     | 94.2% | 10/10          |
| ms-vacantes   | 90.8%      | 81.6%  | 85.7%     | 97.0% | 15/15          |

## Evidencia de cobertura

### ms-auth
![Cobertura ms-auth](![img_2.png](img_2.png))

### ms-perfiles
![Cobertura ms-perfiles](![img_1.png](img_1.png))

### ms-vacantes
![Cobertura ms-vacantes](![img.png](img.png))

## Mejoras implementadas en este corte

1. **ms-auth** – Se agregaron pruebas unitarias para los middlewares `verifyToken` y `requireEmpresa`, aumentando su cobertura del 27% al 100%.
2. **ms-perfiles** – Se cubrieron las ramas `id === "me"` y casos borde (404, actualización con `me`).
3. **ms-vacantes** – Se añadieron pruebas para GET/:id, PUT/:id, validaciones extra, y pruebas directas del modelo.

## Hallazgos y acciones futuras

- **Pendiente:** Mejorar cobertura de funciones en ms-auth (53.8%) para el tercer corte.
- **Pendiente:** Aumentar branch coverage en `perfil.model.js` (63.6%) y `vacante.model.js` (61.1%) en el siguiente sprint.
