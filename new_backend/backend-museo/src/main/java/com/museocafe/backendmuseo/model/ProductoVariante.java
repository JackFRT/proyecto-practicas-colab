package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "producto_variantes")
@Data
@NoArgsConstructor
public class ProductoVariante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idVariante;

    @Column(name = "nombre_variante", nullable = false, length = 100)
    private String nombreVariante = "Estándar";

    @Column(nullable = false)
    private Integer stock = 0;

    @Column(name = "ruta_imagen")
    private String rutaImagen;

    @Column(name = "precio_adicional", precision = 10, scale = 2)
    private BigDecimal precioAdicional = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    @JsonIgnore
    private Producto producto;

    @JsonProperty("id_variante")
    public Long getIdVarianteSnake() {
        return idVariante;
    }

    @JsonProperty("nombre_variante")
    public String getNombreVarianteSnake() {
        return nombreVariante;
    }

    @JsonProperty("ruta_imagen")
    public String getRutaImagenSnake() {
        return rutaImagen;
    }

    @JsonProperty("precio_adicional")
    public BigDecimal getPrecioAdicionalSnake() {
        return precioAdicional;
    }
}
