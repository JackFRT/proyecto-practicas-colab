package com.museocafe.backendmuseo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pedidos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idPedido;

    @Column(name = "codigo_ticket", length = 20, unique = true)
    private String codigoTicket = "TKT-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "atendido_por")
    private Usuario empleadoAtencion;

    @Column(length = 50, nullable = false)
    private String estado = "pendiente";

    @Column(name = "tipo_consumo", length = 50)
    private String tipoConsumo;

    @Column(name = "fecha_pedido", nullable = false)
    private LocalDateTime fechaPedido = LocalDateTime.now();

    @Column(name = "codigo_cupon", length = 20)
    private String codigoCupon;

    @Column(name = "total_pagado", precision = 10, scale = 2, nullable = false)
    private BigDecimal totalPagado = BigDecimal.ZERO;

    @Column(name = "notas_cliente", columnDefinition = "TEXT")
    private String notasCliente;

    @Column(name = "comprobante_pago", length = 255)
    private String comprobantePago;

    @Column(name = "recompensa_procesada", nullable = false)
    private Boolean recompensaProcesada = false;
}