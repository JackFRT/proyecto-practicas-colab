package com.museocafe.backendmuseo.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class CambiarRolRequest {
    @JsonAlias({"id_usuario_objetivo", "idUsuarioObjetivo"})
    private Long idUsuarioObjetivo;

    @JsonAlias({"nuevo_rol", "nuevoRol"})
    private String nuevoRol;

    @JsonAlias({"id_admin", "idAdmin"})
    private Long idAdmin;

    @JsonAlias({"admin_password", "adminPassword", "password"})
    private String adminPassword;
}
