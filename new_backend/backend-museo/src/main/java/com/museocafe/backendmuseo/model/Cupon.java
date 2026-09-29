package com.museocafe.backendmuseo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cupones")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCupon;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(name = "descuento_porcentaje", nullable = false)
    private Integer descuentoPorcentaje;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "limite_usos")
    private Integer limiteUsos = 1;

    @Column(name = "usos_actuales")
    private Integer usosActuales = 0;

    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;

    public int getUsosActuales() {
        
        throw new UnsupportedOperationException("Unimplemented method 'getUsosActuales'");
    }

    public void setUsosActuales(int i) {
        
        throw new UnsupportedOperationException("Unimplemented method 'setUsosActuales'");
    }
}