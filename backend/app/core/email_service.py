# app/core/email_service.py
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

GMAIL_USER     = os.getenv("GMAIL_USER", "")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD", "")

def send_otp_email(to_email: str, display_name: str, otp_code: str) -> bool:
    """Envía correo con código OTP de 6 dígitos."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f7f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:#1B5E20;padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;">TerraLogic AI</h1>
                <p style="margin:6px 0 0;color:#A5D6A7;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
                  IA Agrícola de Precisión
                </p>
              </td>
            </tr>

            <!-- Cuerpo -->
            <tr>
              <td style="padding:40px 40px 32px;">
                <h2 style="margin:0 0 12px;color:#1B5E20;font-size:22px;font-weight:900;">
                  ¡Bienvenido, {display_name}!
                </h2>
                <p style="margin:0 0 24px;color:#424242;font-size:14px;line-height:1.7;">
                  Gracias por registrarte en TerraLogic AI. Para activar tu cuenta,
                  ingresa el siguiente código de verificación en la aplicación:
                </p>

                <!-- Código OTP -->
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                  <tr>
                    <td style="background:#F1F8E9;border:2px dashed #2E7D32;border-radius:16px;
                               padding:20px 48px;text-align:center;">
                      <p style="margin:0 0 4px;color:#2E7D32;font-size:11px;font-weight:700;
                                 letter-spacing:2px;text-transform:uppercase;">Código de verificación</p>
                      <p style="margin:0;color:#1B5E20;font-size:42px;font-weight:900;
                                 letter-spacing:12px;font-family:monospace;">{otp_code}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;color:#757575;font-size:13px;text-align:center;">
                  Este código expira en <strong>15 minutos</strong>.
                </p>
                <p style="margin:0;color:#9E9E9E;font-size:12px;text-align:center;">
                  Si no creaste esta cuenta, ignora este correo.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#F1F8E9;padding:20px 40px;text-align:center;
                         border-top:1px solid #C8E6C9;">
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
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Tu código de verificación TerraLogic AI: {otp_code}"
        msg["From"]    = f"TerraLogic AI <{GMAIL_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False