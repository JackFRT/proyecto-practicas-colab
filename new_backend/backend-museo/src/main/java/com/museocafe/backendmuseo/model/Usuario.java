package com.museocafe.backendmuseo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idUsuario;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(length = 20)
    private String rol;

    @Column(name = "visitas_presenciales")
    private Integer visitasPresenciales = 0;

    @Column(name = "fecha_ultima_visita")
    private LocalDate fechaUltimaVisita;

    @Column(name = "productos_comprados")
    private Integer productosComprados = 0;

    @Column(name = "fecha_ultimo_giro")
    private LocalDateTime fechaUltimoGiro;

    @Column(name = "giros_extra")
    private Integer girosExtra = 0;

    @Column(name = "fecha_registro", updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(length = 15)
    private String dni;

    @Column(length = 20)
    private String telefono;
}