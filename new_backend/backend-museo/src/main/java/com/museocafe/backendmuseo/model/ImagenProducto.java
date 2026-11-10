package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "imagenes_producto")
@Data
@NoArgsConstructor
public class ImagenProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idImagen;

    private String rutaImagen;
    
    private Boolean esPrincipal = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto")
    @JsonIgnore // Evita bucles infinitos al enviar JSON
    private Producto producto;

    @JsonProperty("id_imagen")
    public Long getIdImagenSnake() {
        return idImagen;
    }

    @JsonProperty("ruta_imagen")
    public String getRutaImagenSnake() {
        return rutaImagen;
    }

    @JsonProperty("es_principal")
    public Boolean getEsPrincipalSnake() {
        return esPrincipal;
    }

    @JsonProperty("es_portada")
    public Boolean getEsPortada() {
        return esPrincipal;
    }
}
