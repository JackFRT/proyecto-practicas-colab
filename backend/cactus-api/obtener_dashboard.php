<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$id_empleado = $data['id_empleado'] ?? 0;

try {
    $stmt_res = $pdo->query("SELECT r.*, u.nombre as cliente FROM reservas r JOIN usuarios u ON r.id_usuario = u.id_usuario WHERE r.estado IN ('pendiente', 'esperando_recojo') ORDER BY r.fecha_reserva ASC");
    $reservas = $stmt_res->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($reservas as &$res) {
        $stmt_det = $pdo->prepare("SELECT rd.cantidad, rd.precio_unitario, rd.estilo_seleccionado, p.nombre_comun FROM reserva_detalles rd JOIN productos p ON rd.id_cactus = p.id_producto WHERE rd.id_reserva = ?");
        $stmt_det->execute([$res['id_reserva']]);
        $res['detalles'] = $stmt_det->fetchAll(PDO::FETCH_ASSOC);
    }

    $stats = $pdo->prepare("SELECT COUNT(*) as total_atendidas FROM reservas WHERE atendido_por = ? AND estado = 'recogido'");
    $stats->execute([$id_empleado]);
    $stmt_historial = $pdo->prepare("SELECT * FROM reservas WHERE atendido_por = ? AND estado = 'recogido' ORDER BY fecha_reserva DESC");
    $stmt_historial->execute([$id_empleado]);

    $stmt_inv = $pdo->query("SELECT p.*, c.nombre as nombre_categoria FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria ORDER BY p.id_producto DESC");
    $inventario_crudo = $stmt_inv->fetchAll(PDO::FETCH_ASSOC);
    
    $inventario = [];
    foreach ($inventario_crudo as $p) {
        $id = $p['id_producto'];
        
        $stmt_var = $pdo->prepare("SELECT * FROM producto_variantes WHERE id_producto = ?");
        $stmt_var->execute([$id]);
        $p['variantes'] = $stmt_var->fetchAll(PDO::FETCH_ASSOC);

        $stmt_img = $pdo->prepare("SELECT * FROM producto_imagenes WHERE id_producto = ? ORDER BY es_portada DESC");
        $stmt_img->execute([$id]);
        $p['imagenes'] = $stmt_img->fetchAll(PDO::FETCH_ASSOC);

        $p['id_cactus'] = $id;
        $p['precio'] = $p['precio_base'];
        $p['stock'] = count($p['variantes']) > 0 ? array_sum(array_column($p['variantes'], 'stock')) : 0;
        $p['imagen_url'] = count($p['imagenes']) > 0 ? $p['imagenes'][0]['ruta_imagen'] : 'placeholder.png';
        
        $p['nombre_estilo1'] = isset($p['variantes'][0]) ? $p['variantes'][0]['nombre_variante'] : '';
        $p['stock_estilo1'] = isset($p['variantes'][0]) ? $p['variantes'][0]['stock'] : 0;

        $inventario[] = $p;
    }

    echo json_encode([
        "success" => true,
        "datos" => [
            "reservas" => $reservas,
            "inventario" => $inventario,
            "categorias" => $pdo->query("SELECT * FROM categorias ORDER BY nombre ASC")->fetchAll(PDO::FETCH_ASSOC),
            "cupones" => $pdo->query("SELECT * FROM cupones WHERE id_usuario IS NULL ORDER BY fecha_creacion DESC")->fetchAll(PDO::FETCH_ASSOC),
            "noticias" => $pdo->query("SELECT * FROM noticias ORDER BY prioridad ASC, fecha_publicacion DESC")->fetchAll(PDO::FETCH_ASSOC),
            "ruleta" => $pdo->query("SELECT * FROM premios_ruleta ORDER BY id_premio ASC")->fetchAll(PDO::FETCH_ASSOC),
            "stats" => $stats->fetch(PDO::FETCH_ASSOC),
            "historial_atendidas" => $stmt_historial->fetchAll(PDO::FETCH_ASSOC)
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "mensaje" => "Error DB: " . $e->getMessage()]);
}
?>