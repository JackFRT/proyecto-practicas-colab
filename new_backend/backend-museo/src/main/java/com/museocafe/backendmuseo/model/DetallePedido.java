package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "detalle_pedidos")
@Data
@NoArgsConstructor
public class DetallePedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDetalle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido", nullable = false)
    @JsonIgnore
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "estilo_seleccionado", length = 100)
    private String estiloSeleccionado = "Estándar";

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", precision = 10, scale = 2, nullable = false)
    private BigDecimal precioUnitario;

    @JsonProperty("id_detalle")
    public Long getIdDetalleSnake() {
        return idDetalle;
    }

    @JsonProperty("id_cactus")
    public Long getIdCactus() {
        return producto != null ? producto.getIdProducto() : null;
    }

    @JsonProperty("id_producto")
    public Long getIdProducto() {
        return producto != null ? producto.getIdProducto() : null;
    }

    @JsonProperty("nombre_comun")
    public String getNombreComun() {
        return producto != null ? producto.getNombre() : "Producto";
    }

    @JsonProperty("tipo_producto")
    public String getTipoProducto() {
        return producto != null ? producto.getTipoProducto() : "cactus";
    }

    @JsonProperty("imagen_url")
    public String getImagenUrl() {
        return producto != null ? producto.getImagenUrl() : "";
    }

    @JsonProperty("estilo_seleccionado")
    public String getEstiloSeleccionadoSnake() {
        return estiloSeleccionado;
    }

    @JsonProperty("precio_unitario")
    public BigDecimal getPrecioUnitarioSnake() {
        return precioUnitario;
    }
}
