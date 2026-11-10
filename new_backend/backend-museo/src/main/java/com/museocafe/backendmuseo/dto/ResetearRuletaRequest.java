package com.museocafe.backendmuseo.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class ResetearRuletaRequest {
    @JsonAlias({"id_usuario_objetivo", "idUsuarioObjetivo"})
    private Long idUsuarioObjetivo;

    @JsonAlias({"id_admin", "idAdmin"})
    private Long idAdmin;

    @JsonAlias({"admin_password", "adminPassword", "password"})
    private String adminPassword;
}
