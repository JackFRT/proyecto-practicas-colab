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
    private Integer descuentoPorcentaje = 0;

    @JsonProperty("color_seccion")
    @Column(name = "color_seccion")
    private String colorSeccion = "#A3B18A";

    private Double probabilidad = 0.0;

    @Column(name = "activo")
    private Boolean activo = true;

    @Transient
    @JsonProperty("es_nuevo")
    private Boolean esNuevo = false;

    @JsonProperty("idPremio")
    public Long getIdPremioCamel() {
        return idPremio;
    }
}
