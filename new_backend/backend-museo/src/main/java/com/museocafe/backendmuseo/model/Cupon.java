package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "cupones")
@Data
@NoArgsConstructor
public class Cupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCupon;

    @Column(nullable = false, length = 20)
    private String codigo;

    @Column(name = "descuento_porcentaje", nullable = false)
    private Integer descuentoPorcentaje;

    // Relación opcional: Si es null es un cupón público. Si tiene usuario, es personal de la ruleta o lealtad.
    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = true)
    private Usuario usuario;

    @Column(name = "limite_usos")
    private Integer limiteUsos = 1;

    @Column(name = "usos_actuales")
    private Integer usosActuales = 0;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;

    @JsonProperty("id_cupon")
    public Long getIdCuponSnake() {
        return idCupon;
    }

    @JsonProperty("descuento_porcentaje")
    public Integer getDescuentoPorcentajeSnake() {
        return descuentoPorcentaje;
    }

    @JsonProperty("limite_usos")
    public Integer getLimiteUsosSnake() {
        return limiteUsos;
    }

    @JsonProperty("usos_actuales")
    public Integer getUsosActualesSnake() {
        return usosActuales;
    }

    @JsonProperty("fecha_creacion")
    public LocalDateTime getFechaCreacionSnake() {
        return fechaCreacion;
    }

    @JsonProperty("fecha_vencimiento")
    public LocalDateTime getFechaVencimientoSnake() {
        return fechaVencimiento;
    }

    @JsonProperty("id_usuario")
    public Long getIdUsuario() {
        return usuario != null ? usuario.getIdUsuario() : null;
    }
}
