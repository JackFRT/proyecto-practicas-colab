package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idUsuario;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    // SEGURIDAD: Evita que la contraseña se serialice en las respuestas JSON hacia Angular
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(length = 20)
    private String rol;

    @Column(name = "visitas_presenciales")
    private Integer visitasPresenciales = 0;

    @Column(name = "fecha_ultima_visita")
    private LocalDate fechaUltimaVisita;

    @Column(name = "productos_comprados")
    private Integer productosComprados = 0;

    @Column(name = "fecha_ultimo_giro")
    private LocalDateTime fechaUltimoGiro;

    @Column(name = "giros_extra")
    private Integer girosExtra = 0;

    @Column(name = "fecha_registro", updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(length = 15)
    private String dni;

    @Column(length = 20)
    private String telefono;

    // LÓGICA DE RECUPERACIÓN (Lombok genera get/set automáticamente)
    @JsonIgnore // Tampoco queremos que el código viaje en consultas públicas
    @Column(name = "codigo_recuperacion", length = 6)
    private String codigoRecuperacion;

    @JsonIgnore
    @Column(name = "expiracion_codigo")
    private LocalDateTime expiracionCodigo;
}