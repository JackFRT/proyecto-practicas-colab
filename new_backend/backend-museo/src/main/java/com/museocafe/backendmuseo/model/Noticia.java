package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "noticias")
@Data
public class Noticia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idNoticia;

    @Column(length = 150, nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "imagen_url")
    private String imagenUrl;

    @Column(name = "link_destino")
    private String linkDestino;

    private Boolean estado = true;

    @Column(name = "fecha_publicacion")
    private LocalDateTime fechaPublicacion = LocalDateTime.now();

    private Integer prioridad = 0;

    @JsonProperty("id_noticia")
    public Long getIdNoticiaSnake() {
        return idNoticia;
    }

    @JsonProperty("imagen_url")
    public String getImagenUrlSnake() {
        return imagenUrl;
    }

    @JsonProperty("link_destino")
    public String getLinkDestinoSnake() {
        return linkDestino;
    }

    @JsonProperty("fecha_publicacion")
    public LocalDateTime getFechaPublicacionSnake() {
        return fechaPublicacion;
    }
}
