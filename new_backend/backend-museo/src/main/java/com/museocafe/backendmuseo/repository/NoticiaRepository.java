package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Noticia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NoticiaRepository extends JpaRepository<Noticia, Long> {
    // Apaga el primer error del HomeController
    List<Noticia> findByEstado(Boolean estado);
}