package com.museocafe.backendmuseo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idReserva;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_reserva", nullable = false)
    private LocalDateTime fechaReserva;

    @Column(length = 30)
    private String estado = "pendiente"; // 'pendiente', 'esperando_recojo', 'recogido', 'cancelado'

    @Column(name = "tipo_reserva", length = 20)
    private String tipoReserva = "MESA"; // 'MESA' o 'SOUVENIR'

    @Column(name = "beneficio_elegido", length = 50)
    private String beneficioElegido; // 'TOUR_MUSEO', 'DESCUENTO_BEBIDA', 'NINGUNO'

    @Column(name = "total_pagado", precision = 10, scale = 2)
    private BigDecimal totalPagado = BigDecimal.ZERO;

    @Column(name = "codigo_cupon", length = 20)
    private String codigoCupon;
}