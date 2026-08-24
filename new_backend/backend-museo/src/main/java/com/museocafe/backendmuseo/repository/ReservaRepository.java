package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    List<Reserva> findByUsuarioIdUsuario(Long idUsuario);
}