package com.museocafe.backendmuseo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProducto;

    @Column(name = "nombre_comun", nullable = false, length = 100)
    private String nombreComun;

    @Column(name = "nombre_cientifico", length = 100)
    private String nombreCientifico;

    @Column(name = "precio_base", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioBase;

    @Column(length = 20)
    private String tipo; // 'cactus', 'recuerdo', 'ropa', 'cafe', 'otro'

    @Column(columnDefinition = "TEXT")
    private String cuidados;

    private Integer stock = 0;

    private Boolean activo = true;
}