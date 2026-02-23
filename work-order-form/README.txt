Imágenes para Work Order Form (TAG TYPE y STIFFENER TYPE)
=========================================================

En esta carpeta están los archivos usados en el modal "New Specification":

TAG (selección única):
  - tag-type-1.svg / .png
  - tag-type-2.svg / .png
  - tag-type-3.svg / .png

STIFFENER (selección múltiple):
  - stiffener-type-1.svg / .png
  - stiffener-type-2.svg / .png
  - stiffener-type-3.svg / .png

Por defecto se usan los .svg placeholder. Para usar tus propias imágenes:

1. Guarda tus 6 imágenes aquí con exactamente estos nombres:
   tag-type-1.png, tag-type-2.png, tag-type-3.png
   stiffener-type-1.png, stiffener-type-2.png, stiffener-type-3.png

2. En dashboard/src/components/WorkOrderPlanner/workOrderFormOptions.ts
   cambia la extensión de .svg a .png en cada imageSrc (o deja .svg si usas SVG).
