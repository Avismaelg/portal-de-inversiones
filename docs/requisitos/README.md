# Requisitos — SRS y Plan Maestro

Coloca aquí los dos documentos fuente exigidos por el Prompt Maestro:

```
docs/requisitos/
├── AviTech_Investment_Intelligence_SRS_IEEE830.docx
└── AviTech_Investment_Intelligence_Plan_Maestro.docx
```

## Reglas

- Estos archivos son **fuente de verdad** para requisitos y planificación.
- Son de **solo lectura** para las ventanas de Claude. Nadie los modifica.
- Si falta uno, las ventanas deben registrar el bloqueo en `docs/sprint-0/BLOQUEOS.md` y marcar los vacíos con `[PENDIENTE SRS]`.
- Prohibido inventar, resumir de memoria o asumir su contenido.

## Si están en otro formato

- `.pdf` → sirve, pero renómbralo igual y avísalo.
- `.doc` antiguo → conviértelo a `.docx`.
- Si solo tienes el texto, guárdalo como `.md` con el mismo nombre base.

## Cómo leerlos (entorno actual)

`pandoc` no está instalado. Opciones:

```powershell
pip install python-docx
python -c "import docx; d=docx.Document('docs/requisitos/ARCHIVO.docx'); print('\n'.join(p.text for p in d.paragraphs))"
```

O abrirlos en Word y exportarlos a PDF/Markdown.
