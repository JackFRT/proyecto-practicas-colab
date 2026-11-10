package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
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

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

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

    @JsonProperty("id_usuario")
    public Long getIdUsuarioSnake() {
        return idUsuario;
    }

    @JsonProperty("visitas_presenciales")
    public Integer getVisitasPresencialesSnake() {
        return visitasPresenciales != null ? visitasPresenciales : 0;
    }

    @JsonProperty("fecha_ultima_visita")
    public LocalDate getFechaUltimaVisitaSnake() {
        return fechaUltimaVisita;
    }

    @JsonProperty("productos_comprados")
    public Integer getProductosCompradosSnake() {
        return productosComprados != null ? productosComprados : 0;
    }

    @JsonProperty("fecha_ultimo_giro")
    public LocalDateTime getFechaUltimoGiroSnake() {
        return fechaUltimoGiro;
    }

    @JsonProperty("giros_extra")
    public Integer getGirosExtraSnake() {
        return girosExtra != null ? girosExtra : 0;
    }

    @JsonProperty("fecha_registro")
    public LocalDateTime getFechaRegistroSnake() {
        return fechaRegistro;
    }

    @JsonProperty("bloqueado_hasta")
    public LocalDateTime getBloqueadoHastaSnake() {
        return bloqueadoHasta;
    }
}
