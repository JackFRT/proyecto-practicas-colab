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

    @Column(name = "precio_base")
    private BigDecimal precio;

    private Integer stock = 0;

    private Boolean activo = true;

    @Column(name = "contiene_alcohol")
    @JsonProperty("contiene_alcohol")
    private Boolean contieneAlcohol = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria")
    private Categoria categoria;

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ImagenProducto> imagenes = new ArrayList<>();

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ProductoVariante> variantes = new ArrayList<>();
    
    public void addImagen(ImagenProducto imagen) {
        imagenes.add(imagen);
        imagen.setProducto(this);
    }

    public void addVariante(ProductoVariante variante) {
        variantes.add(variante);
        variante.setProducto(this);
    }

    @JsonProperty("id_cactus")
    public Long getIdCactus() {
        return idProducto;
    }

    @JsonProperty("idProducto")
    public Long getIdProductoCamel() {
        return idProducto;
    }

    @JsonProperty("nombre")
    public String getNombrePlain() {
        return nombre;
    }

    @JsonProperty("subtitulo")
    public String getSubtituloPlain() {
        return subtitulo;
    }

    @JsonProperty("tipo")
    public String getTipo() {
        return tipoProducto;
    }

    @JsonProperty("precio_base")
    public BigDecimal getPrecioBase() {
        return precio;
    }

    @JsonProperty("id_categoria")
    public Long getIdCategoria() {
        return categoria != null ? categoria.getIdCategoria() : null;
    }

    @JsonProperty("nombre_categoria")
    public String getNombreCategoria() {
        return categoria != null ? categoria.getNombre() : null;
    }

    @JsonProperty("contieneAlcohol")
    public Boolean getContieneAlcoholCamel() {
        return Boolean.TRUE.equals(contieneAlcohol);
    }

    @JsonProperty("imagen_url")
    public String getImagenUrl() {
        if (imagenes == null || imagenes.isEmpty()) {
            return "";
        }
        return imagenes.stream()
                .filter(img -> Boolean.TRUE.equals(img.getEsPrincipal()))
                .map(ImagenProducto::getRutaImagen)
                .findFirst()
                .orElse(imagenes.get(0).getRutaImagen());
    }
}
