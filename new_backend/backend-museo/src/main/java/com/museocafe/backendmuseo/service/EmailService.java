package com.museocafe.backendmuseo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String remitente;

    public boolean enviarCodigoRecuperacion(String destinatario, String nombreUsuario, String codigo) {
        System.out.println("====================================================");
        System.out.println("📧 [RECUPERACIÓN DE CONTRASEÑA]");
        System.out.println("Destinatario: " + destinatario);
        System.out.println("Usuario: " + (nombreUsuario != null ? nombreUsuario : "Socio"));
        System.out.println("Código de 6 dígitos: " + codigo);
        System.out.println("====================================================");

        if (mailSender == null || remitente == null || remitente.trim().isEmpty()) {
            return false;
        }

        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(remitente);
            mensaje.setTo(destinatario);
            mensaje.setSubject("Código de Recuperación - Café Ayacuchano & Cactus Museum");
            mensaje.setText(
                    "Hola " + (nombreUsuario != null ? nombreUsuario : "") + ",\n\n"
                    + "Has solicitado restablecer tu contraseña en Café Ayacuchano & Cactus Museum.\n\n"
                    + "Tu código de verificación de 6 dígitos es:\n\n"
                    + "    " + codigo + "\n\n"
                    + "Este código expira en 15 minutos.\n"
                    + "Si no solicitaste este cambio, puedes ignorar este mensaje con tranquilidad.\n\n"
                    + "Atentamente,\n"
                    + "Equipo de Café Ayacuchano & Cactus Museum"
            );
            mailSender.send(mensaje);
            return true;
        } catch (Exception e) {
            System.out.println("Aviso SMTP (Modo Local): No se pudo enviar por servidor SMTP externo (" + e.getMessage() + "). Usa el código impreso arriba.");
            return false;
        }
    }
}
