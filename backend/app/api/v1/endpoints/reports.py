# app/api/v1/endpoints/reports.py
#
# Genera un reporte PDF profesional con los resultados del análisis de Gemini.

import io
import base64
from datetime import datetime
from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import KeepTogether

router = APIRouter()

# ── Paleta de colores TerraLogic ──────────────────────────────
GREEN_DARK   = colors.HexColor('#14532d')
GREEN_MID    = colors.HexColor('#166534')
GREEN_LIGHT  = colors.HexColor('#dcfce7')
GREEN_ACCENT = colors.HexColor('#22c55e')
ORANGE       = colors.HexColor('#ea580c')
ORANGE_LIGHT = colors.HexColor('#fff7ed')
RED          = colors.HexColor('#dc2626')
RED_LIGHT    = colors.HexColor('#fef2f2')
GRAY_DARK    = colors.HexColor('#1c1917')
GRAY_MID     = colors.HexColor('#78716c')
GRAY_LIGHT   = colors.HexColor('#f5f5f0')
WHITE        = colors.white
BORDER       = colors.HexColor('#e7e5e0')


# ── Schema del request ────────────────────────────────────────
class ReportRequest(BaseModel):
    field_name:        str
    resultado:         str
    ndvi:              float
    cobertura_vegetal: int
    enfermedades:      dict
    estres_hidrico:    dict
    plagas:            dict
    insight:           str
    confianza:         float
    image_base64:      Optional[str] = None
    image_mime:        Optional[str] = "image/jpeg"


# ── Helper: color según resultado ────────────────────────────
def result_color(resultado: str):
    if resultado == 'Saludable': return GREEN_MID,  GREEN_LIGHT
    if resultado == 'Alerta':    return ORANGE,      ORANGE_LIGHT
    return RED, RED_LIGHT


# ── Estilos ───────────────────────────────────────────────────
def make_styles():
    return {
        'title': ParagraphStyle('title',
            fontName='Helvetica-Bold', fontSize=22,
            textColor=GREEN_DARK, spaceAfter=2*mm, leading=26),
        'subtitle': ParagraphStyle('subtitle',
            fontName='Helvetica', fontSize=10,
            textColor=GRAY_MID, spaceAfter=4*mm),
        'section': ParagraphStyle('section',
            fontName='Helvetica-Bold', fontSize=11,
            textColor=GREEN_DARK, spaceBefore=4*mm, spaceAfter=2*mm),
        'label': ParagraphStyle('label',
            fontName='Helvetica-Bold', fontSize=8,
            textColor=GRAY_MID, spaceAfter=1*mm),
        'value': ParagraphStyle('value',
            fontName='Helvetica-Bold', fontSize=13,
            textColor=GRAY_DARK),
        'body': ParagraphStyle('body',
            fontName='Helvetica', fontSize=10,
            textColor=GRAY_DARK, leading=16),
        'insight': ParagraphStyle('insight',
            fontName='Helvetica-Oblique', fontSize=10,
            textColor=WHITE, leading=16),
        'footer': ParagraphStyle('footer',
            fontName='Helvetica', fontSize=8,
            textColor=GRAY_MID, alignment=TA_CENTER),
        'header_brand': ParagraphStyle('header_brand',
            fontName='Helvetica-Bold', fontSize=16,
            textColor=WHITE, leading=20),
        'header_sub': ParagraphStyle('header_sub',
            fontName='Helvetica', fontSize=9,
            textColor=colors.HexColor('#86efac')),
        'result_label': ParagraphStyle('result_label',
            fontName='Helvetica-Bold', fontSize=9,
            textColor=GRAY_MID),
        'result_value': ParagraphStyle('result_value',
            fontName='Helvetica-Bold', fontSize=15,
            textColor=GRAY_DARK),
        'badge': ParagraphStyle('badge',
            fontName='Helvetica-Bold', fontSize=11,
            textColor=WHITE, alignment=TA_CENTER),
    }


# ── Endpoint ──────────────────────────────────────────────────
@router.post("/generate")
def generate_report(data: ReportRequest):
    buffer = io.BytesIO()
    W, H   = A4
    margin = 18 * mm

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=10*mm,   bottomMargin=18*mm,
        title=f"Reporte TerraLogic — {data.field_name}",
        author="TerraLogic AI",
    )

    S     = make_styles()
    story = []
    cw    = W - 2 * margin

    # ── HEADER ───────────────────────────────────────────────
    now      = datetime.now().strftime("%d/%m/%Y %H:%M")
    res_fg, res_bg = result_color(data.resultado)

    header_data = [[
        Paragraph("TerraLogic AI", S['header_brand']),
        Paragraph(f"Reporte generado el {now}", S['header_sub']),
    ]]
    header_table = Table(header_data, colWidths=[cw * 0.6, cw * 0.4])
    header_table.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,-1), GREEN_DARK),
        ('ROUNDEDCORNERS', [8]),
        ('TOPPADDING',   (0,0), (-1,-1), 14),
        ('BOTTOMPADDING',(0,0), (-1,-1), 14),
        ('LEFTPADDING',  (0,0), (0,-1),  16),
        ('RIGHTPADDING', (-1,0),(-1,-1), 16),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN',        (1,0), (1,-1),  'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 5*mm))

    # ── CAMPO + RESULTADO ─────────────────────────────────────
    badge = Table([[Paragraph(data.resultado.upper(), S['badge'])]],
                  colWidths=[30*mm])
    badge.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,-1), res_fg),
        ('ROUNDEDCORNERS', [6]),
        ('TOPPADDING',   (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0), (-1,-1), 6),
    ]))

    meta_data = [[
        [Paragraph("Campo analizado", S['label']),
         Paragraph(data.field_name, S['title'])],
        badge,
    ]]
    meta_table = Table(meta_data, colWidths=[cw * 0.72, cw * 0.28])
    meta_table.setStyle(TableStyle([
        ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN',       (1,0), (1,-1),  'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING',(0,0), (-1,-1), 0),
    ]))
    story.append(meta_table)
    story.append(HRFlowable(width=cw, thickness=1, color=BORDER, spaceAfter=4*mm))

    # ── IMAGEN DEL CULTIVO ────────────────────────────────────
    if data.image_base64:
        try:
            # Limpiar prefijo data:image/...;base64, si existe
            img_b64 = data.image_base64
            if ',' in img_b64:
                img_b64 = img_b64.split(',')[1]
            img_bytes = base64.b64decode(img_b64)
            img_buf   = io.BytesIO(img_bytes)
            img       = RLImage(img_buf, width=cw, height=55*mm)
            img.hAlign = 'CENTER'

            img_table = Table([[img]], colWidths=[cw])
            img_table.setStyle(TableStyle([
                ('ROUNDEDCORNERS', [8]),
                ('TOPPADDING',    (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('LEFTPADDING',   (0,0), (-1,-1), 0),
                ('RIGHTPADDING',  (0,0), (-1,-1), 0),
            ]))
            story.append(img_table)
            story.append(Spacer(1, 5*mm))
        except Exception:
            pass

    # ── MÉTRICAS PRINCIPALES ──────────────────────────────────
    story.append(Paragraph("Metricas del analisis", S['section']))

    def metric_cell(label, value, unit="", bg=GRAY_LIGHT):
        inner = Table([
            [Paragraph(label, S['label'])],
            [Paragraph(f"{value}{unit}", S['result_value'])],
        ], colWidths=[(cw / 4) - 3*mm])
        inner.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,-1), bg),
            ('ROUNDEDCORNERS', [6]),
            ('TOPPADDING',   (0,0), (-1,-1), 8),
            ('BOTTOMPADDING',(0,0), (-1,-1), 8),
            ('LEFTPADDING',  (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        return inner

    stress    = data.estres_hidrico['porcentaje']
    stress_bg = RED_LIGHT if stress > 50 else ORANGE_LIGHT if stress > 25 else GREEN_LIGHT

    metrics = Table([[
        metric_cell("NDVI",           f"{data.ndvi:.2f}"),
        metric_cell("Cobertura",      data.cobertura_vegetal, "%"),
        metric_cell("Estres Hidrico", stress, "%", stress_bg),
        metric_cell("Confianza IA",   f"{int(data.confianza*100)}", "%"),
    ]], colWidths=[(cw/4) - 1*mm] * 4, hAlign='LEFT')
    metrics.setStyle(TableStyle([
        ('LEFTPADDING',  (0,0), (-1,-1), 1.5*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 1.5*mm),
        ('TOPPADDING',   (0,0), (-1,-1), 0),
        ('BOTTOMPADDING',(0,0), (-1,-1), 0),
    ]))
    story.append(metrics)
    story.append(Spacer(1, 5*mm))

    # ── DETALLE ───────────────────────────────────────────────
    story.append(Paragraph("Detalle de hallazgos", S['section']))

    def detail_row(label, count, detalle, alert=False):
        count_color = RED if alert and count > 0 else GREEN_MID
        row = Table([[
            Paragraph(label, S['body']),
            Paragraph(str(count), ParagraphStyle('cnt',
                fontName='Helvetica-Bold', fontSize=14,
                textColor=count_color, alignment=TA_CENTER)),
            Paragraph(detalle, S['body']),
        ]], colWidths=[40*mm, 20*mm, cw - 60*mm])
        row.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,-1), GRAY_LIGHT),
            ('ROUNDEDCORNERS', [6]),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',   (0,0), (-1,-1), 8),
            ('BOTTOMPADDING',(0,0), (-1,-1), 8),
            ('LEFTPADDING',  (0,0), (0,-1),  10),
            ('LEFTPADDING',  (1,0), (1,-1),  4),
            ('LINEAFTER',    (0,0), (1,-1),  0.5, BORDER),
        ]))
        return row

    story.append(detail_row("Enfermedades detectadas",
        data.enfermedades['count'], data.enfermedades['detalle'], alert=True))
    story.append(Spacer(1, 2*mm))

    story.append(detail_row("Plagas detectadas",
        data.plagas['count'], data.plagas['detalle'], alert=True))
    story.append(Spacer(1, 2*mm))

    story.append(detail_row("Nivel de estres hidrico",
        data.estres_hidrico['porcentaje'],
        f"Nivel: {data.estres_hidrico['nivel']}",
        alert=stress > 25))
    story.append(Spacer(1, 5*mm))

    # ── INSIGHT ───────────────────────────────────────────────
    story.append(Paragraph("Insight de Gemini AI", S['section']))

    insight_inner = Table([
        [Paragraph("RECOMENDACION DE IA", ParagraphStyle('il',
            fontName='Helvetica-Bold', fontSize=8,
            textColor=colors.HexColor('#86efac')))],
        [Paragraph(f'"{data.insight}"', S['insight'])],
    ], colWidths=[cw - 10*mm])
    insight_inner.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,-1), GREEN_DARK),
        ('ROUNDEDCORNERS', [10]),
        ('TOPPADDING',   (0,0), (-1,-1), 14),
        ('BOTTOMPADDING',(0,0), (-1,-1), 14),
        ('LEFTPADDING',  (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 16),
    ]))
    story.append(insight_inner)
    story.append(Spacer(1, 6*mm))

    # ── FOOTER ────────────────────────────────────────────────
    story.append(HRFlowable(width=cw, thickness=0.5, color=BORDER, spaceAfter=3*mm))
    story.append(Paragraph(
        f"Generado por TerraLogic AI · {now} · Plataforma de Precision Agricola",
        S['footer']
    ))

    doc.build(story)
    buffer.seek(0)
    pdf_bytes = buffer.read()

    filename = f"reporte-terralogic-{data.field_name.replace(' ', '-').lower()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Length": str(len(pdf_bytes)),
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )