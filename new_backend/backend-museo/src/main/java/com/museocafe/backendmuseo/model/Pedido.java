package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pedidos")
@Data
@NoArgsConstructor
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idPedido;

    @Column(name = "codigo_ticket", length = 20, unique = true)
    private String codigoTicket = "TKT-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = true)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "atendido_por")
    private Usuario empleadoAtencion;

    @Column(length = 50, nullable = false)
    private String estado = "pendiente";

    @Column(name = "tipo_consumo", length = 50)
    private String tipoConsumo = "para_llevar";

    @Column(name = "tipo_comprobante", length = 30)
    private String tipoComprobante = "boleta";

    @Column(name = "dni_opcional", length = 120)
    private String dniOpcional;

    @Column(name = "fecha_pedido", nullable = false)
    private LocalDateTime fechaPedido = LocalDateTime.now();

    @Column(name = "codigo_cupon", length = 20)
    private String codigoCupon;

    @Column(name = "total_pagado", precision = 10, scale = 2, nullable = false)
    private BigDecimal totalPagado = BigDecimal.ZERO;

    @Column(name = "notas_cliente", columnDefinition = "TEXT")
    private String notasCliente;

    @Column(name = "tiempo_llegada", length = 40)
    private String tiempoLlegada;

    @Column(name = "mensaje_cafeteria", length = 300)
    private String mensajeCafeteria;

    @Column(name = "comprobante_pago", length = 255)
    private String comprobantePago;

    @Column(name = "recompensa_procesada", nullable = false)
    private Boolean recompensaProcesada = false;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetallePedido> detalles = new ArrayList<>();

    @JsonProperty("id_reserva")
    public Long getIdReserva() {
        return idPedido;
    }

    @JsonProperty("fecha_reserva")
    public LocalDateTime getFechaReserva() {
        return fechaPedido;
    }

    @JsonProperty("total_pagado")
    public BigDecimal getTotalPagadoSnake() {
        return totalPagado;
    }

    @JsonProperty("comprobante_pago")
    public String getComprobantePagoSnake() {
        return comprobantePago;
    }

    @JsonProperty("tipo_comprobante")
    public String getTipoComprobanteSnake() {
        return tipoComprobante != null ? tipoComprobante : "boleta";
    }

    @JsonProperty("dni_opcional")
    public String getDniOpcionalSnake() {
        if (dniOpcional != null && !dniOpcional.trim().isEmpty() && !dniOpcional.toLowerCase().contains("cel/wsp")) {
            return dniOpcional.trim();
        }
        if (usuario != null && usuario.getDni() != null && !usuario.getDni().trim().isEmpty()) {
            return usuario.getDni().trim();
        }
        return "";
    }

    @JsonProperty("telefono_cliente")
    public String getTelefonoClienteSnake() {
        if (notasCliente != null && !notasCliente.trim().isEmpty() && !"Sin notas".equalsIgnoreCase(notasCliente.trim())) {
            String limpio = notasCliente.replace("Cel/Wsp:", "").replace("Cel/Wsp", "").trim();
            if (!limpio.isEmpty()) {
                return limpio;
            }
        }
        if (dniOpcional != null && dniOpcional.toLowerCase().contains("cel/wsp")) {
            String[] partes = dniOpcional.split("(?i)cel/wsp:?");
            if (partes.length > 1 && !partes[1].trim().isEmpty()) {
                return partes[1].trim();
            }
        }
        if (usuario != null && usuario.getTelefono() != null && !usuario.getTelefono().trim().isEmpty()) {
            return usuario.getTelefono().trim();
        }
        return "";
    }

    @JsonProperty("cliente")
    public String getNombreCliente() {
        return usuario != null ? usuario.getNombre() : "Cliente";
    }

    @JsonProperty("id_usuario")
    public Long getIdUsuarioCliente() {
        return usuario != null ? usuario.getIdUsuario() : null;
    }

    @JsonProperty("empleado_nombre")
    public String getNombreEmpleado() {
        return empleadoAtencion != null ? empleadoAtencion.getNombre() : "Sistema Web";
    }

    @JsonProperty("tipo_consumo")
    public String getTipoConsumoSnake() {
        return tipoConsumo != null ? tipoConsumo : "para_llevar";
    }

    @JsonProperty("tiempo_llegada")
    public String getTiempoLlegadaSnake() {
        return tiempoLlegada != null ? tiempoLlegada : "";
    }

    @JsonProperty("mensaje_cafeteria")
    public String getMensajeCafeteriaSnake() {
        return mensajeCafeteria != null ? mensajeCafeteria : "";
    }
}
