<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db.php';

$accion = $_POST['accion'] ?? null;
$data = $accion ? $_POST : (json_decode(file_get_contents("php://input"), true) ?? []);
$accion = $accion ?: ($data['accion'] ?? null);

function subirFoto($filePost, $prefijo, $carpeta = 'cactus') {
    if (isset($filePost) && $filePost['error'] == 0) {
        $nombre = $prefijo . "_" . time() . "_" . rand(100,999) . "." . pathinfo($filePost['name'], PATHINFO_EXTENSION);

        move_uploaded_file($filePost['tmp_name'], "images/$carpeta/" . $nombre);
        return $nombre;
    }
    return null;
}

if ($accion === 'guardar_cupon') {
    $pdo->prepare("INSERT INTO cupones (codigo, descuento_porcentaje, limite_usos, fecha_vencimiento) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))")
        ->execute([strtoupper(trim($data['codigo_cupon'])), intval($data['descuento']), intval($data['limite_usos']), intval($data['dias_validez'] ?? 30)]);
    echo json_encode(["success" => true, "mensaje" => "Cupón creado exitosamente."]);
} 
elseif ($accion === 'eliminar_cupon') {
    $pdo->prepare("DELETE FROM cupones WHERE codigo = ?")->execute([$data['codigo']]);
    echo json_encode(["success" => true, "mensaje" => "Cupón eliminado."]);
} 
elseif ($accion === 'guardar_noticia') {
    $id_noticia = !empty($data['id_noticia']) ? intval($data['id_noticia']) : null;
    $titulo = trim($data['titulo'] ?? '');
    $desc = trim($data['descripcion'] ?? '');
    $link = trim($data['link_destino'] ?? '');
    $img = subirFoto($_FILES['foto_noticia'] ?? null, "news", "news");
    
    if ($id_noticia) {
        $pdo->prepare("UPDATE noticias SET titulo=?, descripcion=?, link_destino=? WHERE id_noticia=?")->execute([$titulo, $desc, $link, $id_noticia]);
        if ($img) {
            $pdo->prepare("UPDATE noticias SET imagen_url=? WHERE id_noticia=?")->execute([$img, $id_noticia]);
        }
        echo json_encode(["success" => true, "mensaje" => "Noticia actualizada correctamente."]);
    } else {
        if($img) {
            $pdo->prepare("INSERT INTO noticias (titulo, descripcion, imagen_url, link_destino, estado) VALUES (?, ?, ?, ?, 1)")
                ->execute([$titulo, $desc, $img, $link]);
            echo json_encode(["success" => true, "mensaje" => "Noticia publicada en el boletín."]);
        } else {
            echo json_encode(["success" => false, "mensaje" => "La imagen del banner es obligatoria."]);
        }
    }
}
elseif ($accion === 'eliminar_noticia') {   
    $pdo->prepare("DELETE FROM noticias WHERE id_noticia = ?")->execute([$data['id_noticia']]);
    echo json_encode(["success" => true, "mensaje" => "Noticia eliminada."]);
} 
elseif ($accion === 'guardar_probabilidades_ruleta') {
    $stmt = $pdo->prepare("UPDATE premios_ruleta SET probabilidad = ? WHERE id_premio = ?");
    foreach ($data['probabilidades'] as $id => $prob) { 
        $stmt->execute([$prob, $id]); 
    }
    echo json_encode(["success" => true, "mensaje" => "Nuevos tamaños de la ruleta guardados."]);
} 
elseif ($accion === 'guardar_premio_ruleta') {
    $id_premio = !empty($data['id_premio']) ? intval($data['id_premio']) : null;
    $titulo = trim($data['titulo_premio']);
    $descuento = intval($data['descuento_premio']);
    $color = $data['color_premio'];
    
    if ($id_premio) {
        $pdo->prepare("UPDATE premios_ruleta SET titulo=?, descuento_porcentaje=?, color_seccion=? WHERE id_premio=?")
            ->execute([$titulo, $descuento, $color, $id_premio]);
        echo json_encode(["success" => true, "mensaje" => "Rebanada actualizada."]);
    } else {
        $pdo->prepare("INSERT INTO premios_ruleta (titulo, descuento_porcentaje, probabilidad, color_seccion) VALUES (?, ?, 0, ?)")
            ->execute([$titulo, $descuento, $color]);
        echo json_encode(["success" => true, "mensaje" => "Nuevo premio agregado. Ajusta su tamaño visualmente."]);
    }
}
elseif ($accion === 'toggle_noticia') {
    $id_noticia = intval($data['id_noticia'] ?? 0);
    $estado_actual = intval($data['estado_actual'] ?? 0);
    
    $nuevo_estado = $estado_actual === 1 ? 0 : 1;
    
    $pdo->prepare("UPDATE noticias SET estado = ? WHERE id_noticia = ?")->execute([$nuevo_estado, $id_noticia]);
    
    $mensaje = $nuevo_estado === 1 ? "Noticia ahora es pública." : "Noticia ocultada del catálogo.";
    echo json_encode(["success" => true, "mensaje" => $mensaje]);

}
elseif ($accion === 'eliminar_premio_ruleta') {
    $pdo->prepare("DELETE FROM premios_ruleta WHERE id_premio = ?")->execute([intval($data['id_premio'])]);
    echo json_encode(["success" => true, "mensaje" => "Rebanada eliminada. Recuerda guardar el Total al 100%."]);
}
elseif ($accion === 'reordenar_noticias') {
    $orden_ids = $data['orden'] ?? [];
    $stmt = $pdo->prepare("UPDATE noticias SET prioridad = ? WHERE id_noticia = ?");
    foreach ($orden_ids as $index => $id_noticia) {
        $stmt->execute([$index, $id_noticia]);
    }
    echo json_encode(["success" => true, "mensaje" => "Prioridad de noticias actualizada."]);
}
?>