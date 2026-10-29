package com.museocafe.backendmuseo.model;

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

    // Relación opcional: Si es null es un cupón público. Si tiene usuario, es personal de la ruleta.
    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = true)
    private Usuario usuario;

    @Column(name = "limite_usos")
    private Integer limiteUsos = 1;

    @Column(name = "usos_actuales")
    private Integer usosActuales = 0;

    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;
}