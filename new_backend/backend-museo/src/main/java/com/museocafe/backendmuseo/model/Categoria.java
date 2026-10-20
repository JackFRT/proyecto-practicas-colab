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

    private String nombre;

    @JsonProperty("tipo")
    private String tipo; // Debe llamarse así para que guarde 'cactus', 'cafe', o 'recuerdo'
}