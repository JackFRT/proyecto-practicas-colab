package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "categorias")
@Data
public class Categoria {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("id_categoria")
    private Long idCategoria;

    @Column(nullable = false)
    @JsonProperty("nombre")
    private String nombre;

    @Column(nullable = false)
    @JsonProperty("tipo")
    private String tipo;
}