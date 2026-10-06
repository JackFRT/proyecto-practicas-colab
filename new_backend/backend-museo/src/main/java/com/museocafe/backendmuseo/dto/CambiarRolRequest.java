package com.museocafe.backendmuseo.dto;

import lombok.Data;

@Data
public class CambiarRolRequest {
    private Long idUsuarioObjetivo;
    private String nuevoRol;
}