# calendar.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from app.core.security import decode_token

load_dotenv()

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

GMAIL_USER     = os.getenv("GMAIL_USER", "")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD", "")


class ScheduleRequest(BaseModel):
    field_name:  str
    date:        str        # formato: YYYY-MM-DD
    time:        str        # formato: HH:MM
    notes:       Optional[str] = ""
    user_email:  str
    user_name:   str


def build_ics(field_name: str, date: str, time: str, notes: str, user_name: str, user_email: str) -> str:
    """Genera el contenido del archivo .ics para Google Calendar."""
    dt_start = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    dt_end   = dt_start + timedelta(hours=1)
    uid      = str(uuid.uuid4())
    now      = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    fmt = "%Y%m%dT%H%M%S"
    description = f"Análisis de cultivo programado para el campo {field_name} en TerraLogic AI."
    if notes:
        description += f" Notas: {notes}"

    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TerraLogic AI//ES
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{now}
DTSTART:{dt_start.strftime(fmt)}
DTEND:{dt_end.strftime(fmt)}
SUMMARY:📊 Análisis de cultivo — {field_name}
DESCRIPTION:{description}
ORGANIZER;CN=TerraLogic AI:MAILTO:{GMAIL_USER}
ATTENDEE;CN={user_name};RSVP=TRUE:MAILTO:{user_email}
LOCATION:Campo {field_name}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Recordatorio: Análisis de {field_name} en 30 minutos
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:EMAIL
DESCRIPTION:Recordatorio de análisis de cultivo en 1 hora
END:VALARM
END:VEVENT
END:VCALENDAR"""

    return ics


def send_calendar_email(to_email: str, user_name: str, field_name: str,
                         date: str, time: str, notes: str) -> bool:
    """Envía el correo de confirmación con el archivo .ics adjunto."""
    try:
        # Formato legible de fecha
        dt       = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
        date_str = dt.strftime("%A %d de %B, %Y").capitalize()
        time_str = dt.strftime("%I:%M %p")

        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f4f7f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0"
                style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <tr>
                  <td style="background:#1B5E20;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;">TerraLogic AI</h1>
                    <p style="margin:6px 0 0;color:#A5D6A7;font-size:11px;letter-spacing:2px;text-transform:uppercase;">
                      Recordatorio de Análisis Programado
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 8px;color:#1B5E20;font-size:20px;font-weight:900;">
                      ¡Análisis programado, {user_name}!
                    </h2>
                    <p style="margin:0 0 24px;color:#424242;font-size:14px;line-height:1.7;">
                      Se ha registrado un recordatorio de análisis para tu cultivo. 
                      Agrega el evento a tu calendario con el archivo adjunto.
                    </p>

                    <!-- Detalles del evento -->
                    <table cellpadding="0" cellspacing="0" width="100%"
                      style="background:#F1F8E9;border-radius:12px;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding:6px 0;border-bottom:1px solid #C8E6C9;">
                                <span style="color:#2E7D32;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Campo</span><br>
                                <span style="color:#212121;font-size:15px;font-weight:900;">{field_name}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-bottom:1px solid #C8E6C9;">
                                <span style="color:#2E7D32;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Fecha</span><br>
                                <span style="color:#212121;font-size:15px;font-weight:900;">{date_str}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-bottom:1px solid #C8E6C9;">
                                <span style="color:#2E7D32;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Hora</span><br>
                                <span style="color:#212121;font-size:15px;font-weight:900;">{time_str}</span>
                              </td>
                            </tr>
                            {"<tr><td style='padding:6px 0;'><span style='color:#2E7D32;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;'>Notas</span><br><span style='color:#424242;font-size:14px;'>" + notes + "</span></td></tr>" if notes else ""}
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px;color:#424242;font-size:14px;">
                      <strong>📎 Archivo adjunto:</strong> Abre el archivo <code>analisis-{field_name.replace(' ','-').lower()}.ics</code>
                      para agregar este evento directamente a Google Calendar, Outlook o Apple Calendar.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#F1F8E9;padding:20px 40px;text-align:center;border-top:1px solid #C8E6C9;">
                    <p style="margin:0;color:#9E9E9E;font-size:11px;">
                      © 2026 TerraLogic AI &nbsp;|&nbsp; IA Agrícola de Precisión
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """

        msg            = MIMEMultipart("mixed")
        msg["Subject"] = f"📊 Recordatorio: Análisis de {field_name} — {date_str}"
        msg["From"]    = f"TerraLogic AI <{GMAIL_USER}>"
        msg["To"]      = to_email

        msg.attach(MIMEText(html, "html", "utf-8"))

        # Adjuntar el archivo .ics
        ics_content = build_ics(field_name, date, time, notes, user_name, to_email)

        ics_part = MIMEBase("text", "calendar", method="REQUEST", charset="UTF-8")
        ics_part.set_payload(ics_content.encode("utf-8"))
        encoders.encode_base64(ics_part)
        ics_part.add_header("Content-Disposition", "attachment",
                            filename=f"analisis-{field_name.replace(' ','-').lower()}.ics")
        msg.attach(ics_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[CALENDAR EMAIL ERROR] {e}")
        return False


@router.post("/schedule")
async def schedule_analysis(
    payload:     ScheduleRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    """Programa un análisis, envía correo con .ics adjunto."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token requerido.")

    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Token inválido.")

    # Validar fecha
    try:
        dt = datetime.strptime(f"{payload.date} {payload.time}", "%Y-%m-%d %H:%M")
        if dt < datetime.now():
            raise HTTPException(status_code=400, detail="La fecha debe ser futura.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha u hora inválido.")

    # Sanitizar
    field_name = payload.field_name.strip()[:200]
    notes      = (payload.notes or "").strip()[:500]

    # Enviar correo con .ics
    sent = send_calendar_email(
        to_email=payload.user_email,
        user_name=payload.user_name,
        field_name=field_name,
        date=payload.date,
        time=payload.time,
        notes=notes,
    )

    if not sent:
        raise HTTPException(status_code=500, detail="No se pudo enviar el correo. Verifica la configuración de Gmail.")

    return {
        "message": f"Recordatorio programado para {field_name} el {payload.date} a las {payload.time}.",
        "email_sent": True,
        "field_name": field_name,
        "date": payload.date,
        "time": payload.time,
    }