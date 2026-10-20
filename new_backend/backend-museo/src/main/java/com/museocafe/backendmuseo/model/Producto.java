package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("id_producto")
    private Long idProducto;

    // Quitamos el nullable = false temporalmente para evitar el error SQL
    private String nombre; 

    private String subtitulo; 

    @JsonProperty("tipo_producto")
    private String tipoProducto; 

    @Column(columnDefinition = "TEXT")
    private String descripcion; 

    @Column(columnDefinition = "TEXT")
    @JsonProperty("detalles_tecnicos")
    private String detallesTecnicos; 

    // Quitamos el nullable = false
    private BigDecimal precio;

    private Integer stock;

    // ¡AQUÍ ESTÁ LA SOLUCIÓN AL CRASHEO PRINCIPAL!
    private Boolean activo = true;

    @ManyToOne
    @JoinColumn(name = "id_categoria")
    private Categoria categoria;

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImagenProducto> imagenes = new ArrayList<>();
    
    public void addImagen(ImagenProducto imagen) {
        imagenes.add(imagen);
        imagen.setProducto(this);
    }
}