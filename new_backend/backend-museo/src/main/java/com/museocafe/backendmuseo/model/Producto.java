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

    // AQUI ESTÁ LA MAGIA: Le decimos que en PostgreSQL se llama nombre_comun
    @Column(name = "nombre_comun")
    @JsonProperty("nombre_comun")
    private String nombre; 

    @Column(name = "nombre_cientifico")
    @JsonProperty("nombre_cientifico")
    private String subtitulo; 

    @Column(name = "tipo_producto")
    @JsonProperty("tipo_producto")
    private String tipoProducto; 

    @Column(columnDefinition = "TEXT")
    private String cuidados; // Usamos el nombre original de la BD (en vez de 'descripcion')

    @Column(columnDefinition = "TEXT", name = "detalles_tecnicos")
    @JsonProperty("detalles_tecnicos")
    private String detallesTecnicos; 

    @Column(name = "precio_base") // Asegúrate de que coincida con tu BD (a veces es 'precio' o 'precio_base')
    private BigDecimal precio;

    private Integer stock;

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