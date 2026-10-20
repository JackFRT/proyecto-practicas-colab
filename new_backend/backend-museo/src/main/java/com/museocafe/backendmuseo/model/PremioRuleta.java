package com.museocafe.backendmuseo.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "premios_ruleta")
@Data
@NoArgsConstructor
public class PremioRuleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty("id_premio")
    private Long idPremio;

    private String titulo;

    @JsonProperty("descuento_porcentaje")
    @Column(name = "descuento_porcentaje")
    private Integer descuentoPorcentaje;

    @JsonProperty("color_seccion")
    @Column(name = "color_seccion")
    private String colorSeccion;

    private Double probabilidad = 0.0;

    @JsonProperty("es_nuevo")
    @Column(name = "es_nuevo")
    private Boolean esNuevo = false;
}