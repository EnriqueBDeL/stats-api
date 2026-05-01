# 📊 GitHub Stats API
![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-yellow)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

Generador de estadísticas dinámicas en **SVG** para cualquier README.md de tu perfil de GitHub.

Este proyecto permite mostrar en cualquier README:

- ⭐ Estrellas totales
- 📦 Número de repositorios
- 🚀 Commits del año
- 📊 Lenguajes más utilizados (con barra proporcional)

Desplegado y optimizado para **Vercel**, aprovechando su red de alto rendimiento para servir las imágenes en tiempo real a través de la API GraphQL de GitHub.

---

## 🚀 Ejemplo modo default

```md
![GitHub Stats](https://stats-api-bice.vercel.app/api?username=TU_NOMBRE)
````
![GitHub Stats](https://stats-api-bice.vercel.app/api?username=EnriqueBDeL)

## ✉️ Ejemplo modo card

```md
![GitHub Languages Card](https://stats-api-bice.vercel.app/api?username=TU_NOMBRE&style=card)
````

![GitHub Stats](https://stats-api-bice.vercel.app/api?username=EnriqueBDeL&style=card)

## ⚡ Ejemplo modo hybrid

```md
![GitHub Languages Card](https://stats-api-bice.vercel.app/api?username=TU_NOMBRE&style=hybrid)
````

![GitHub Stats](https://stats-api-bice.vercel.app/api?username=EnriqueBDeL&style=hybrid)



## 🛠️ Modo Nerfeo

Con el parámetro ``&nerf=`` puedes aplicar una penalización al tamaño de los lenguajes que especifiques, indicando el porcentaje que quieres restarles. El formato es Lenguaje:Porcentaje separados por comas.

```md
![GitHub Stats](https://stats-api-bice.vercel.app/api?username=TU_NOMBRE&style=hybrid&nerf=HTML:90,CSS:70)
````

---

## 🤖 Créditos y Desarrollo AI
Este proyecto ha sido creado con la ayuda de:
- Gemini 3
- ChatGPT
