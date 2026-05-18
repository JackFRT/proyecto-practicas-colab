<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

if (file_exists('config/db.php')) { require_once 'config/db.php'; } 
else { require_once 'db.php'; }

$inputJSON = file_get_contents('php://input');
$inputData = json_decode($inputJSON, true);
if (is_array($inputData)) { $_POST = array_merge($_POST, $inputData); }

$accion = $_POST['accion'] ?? '';
$id_usuario = intval($_POST['id_usuario'] ?? 0);

if (!$id_usuario) { echo json_encode(["success" => false, "mensaje" => "ID no proporcionado."]); exit(); }

if ($accion === 'cargar_perfil') {
    $stmt = $pdo->prepare("SELECT id_usuario, nombre, email, dni, telefono, visitas_presenciales, rol FROM usuarios WHERE id_usuario = ?");
    $stmt->execute([$id_usuario]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    $visitas = intval($usuario['visitas_presenciales']);
    $nivel = ["nivel" => 0, "next" => 3, "texto" => "Nivel 1", "progreso" => ($visitas / 3) * 100, "beneficios" => "Visita la cafetería para empezar a subir de nivel y desbloquear descuentos permanentes."];
    
    if ($visitas >= 51) { $nivel = ["nivel" => 5, "next" => "MAX", "texto" => "Nivel Máximo", "progreso" => 100, "beneficios" => "¡Eres una leyenda! 15% de descuento permanente. Al acumular 4 compras puedes elegir premios premium."]; } 
    elseif ($visitas >= 31) { $nivel = ["nivel" => 4, "next" => 51, "texto" => "Nivel 5", "progreso" => (($visitas - 31) / 20) * 100, "beneficios" => "¡Socio Experto! 10% de descuento permanente."]; } 
    elseif ($visitas >= 16) { $nivel = ["nivel" => 3, "next" => 31, "texto" => "Nivel 4", "progreso" => (($visitas - 16) / 15) * 100, "beneficios" => "¡Socio Frecuente! 7% de descuento permanente."]; } 
    elseif ($visitas >= 8) { $nivel = ["nivel" => 2, "next" => 16, "texto" => "Nivel 3", "progreso" => (($visitas - 8) / 8) * 100, "beneficios" => "¡Socio Aficionado! Al acumular 4 compras elige entre: Cupón, Libro PDF o Llavero."]; } 
    elseif ($visitas >= 3) { $nivel = ["nivel" => 1, "next" => 8, "texto" => "Nivel 2", "progreso" => (($visitas - 3) / 5) * 100, "beneficios" => "¡Socio Oficial! Acumula 4 compras para un cupón del 25%."]; }

    $usuario['datos_nivel'] = $nivel;

    $stmt_progreso = $pdo->prepare("SELECT SUM(cantidad) as total FROM reserva_detalles rd JOIN reservas r ON rd.id_reserva = r.id_reserva WHERE r.id_usuario = ? AND r.recompensa_procesada = 0 AND r.estado != 'cancelado'");
    $stmt_progreso->execute([$id_usuario]);
    $plantas = $stmt_progreso->fetchColumn() ?: 0;
    $usuario['plantas_acumuladas'] = $plantas;
    $usuario['progreso_plantas'] = min(100, ($plantas / 4) * 100);

    $stmt_reservas = $pdo->prepare("SELECT * FROM reservas WHERE id_usuario = ? ORDER BY fecha_reserva DESC");
    $stmt_reservas->execute([$id_usuario]);
    $historial = $stmt_reservas->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($historial as &$reserva) {
        $stmt_det = $pdo->prepare("
            SELECT rd.*, p.nombre_comun, 
                   (SELECT ruta_imagen FROM producto_imagenes pi WHERE pi.id_producto = p.id_producto ORDER BY es_portada DESC LIMIT 1) as imagen_url
            FROM reserva_detalles rd 
            JOIN productos p ON rd.id_cactus = p.id_producto 
            WHERE rd.id_reserva = ?
        ");
        $stmt_det->execute([$reserva['id_reserva']]);
        $reserva['detalles'] = $stmt_det->fetchAll(PDO::FETCH_ASSOC);
    }

    $stmt_cupones = $pdo->prepare("SELECT * FROM cupones WHERE id_usuario = ? AND usos_actuales < limite_usos AND fecha_vencimiento >= CURDATE() ORDER BY fecha_vencimiento ASC");
    $stmt_cupones->execute([$id_usuario]);
    $cupones = $stmt_cupones->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "usuario" => $usuario, "historial" => $historial, "cupones" => $cupones]);
    exit();
}

if ($accion === 'actualizar_perfil') {
    $nombre = trim($_POST['nombre'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $dni = trim($_POST['dni'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');

    try {
        if (!empty($password)) {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, password=?, dni=?, telefono=? WHERE id_usuario=?");
            $stmt->execute([$nombre, $email, $hash, $dni, $telefono, $id_usuario]);
        } else {
            $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, email=?, dni=?, telefono=? WHERE id_usuario=?");
            $stmt->execute([$nombre, $email, $dni, $telefono, $id_usuario]);
        }
        echo json_encode(["success" => true, "mensaje" => "Perfil actualizado con éxito."]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "mensaje" => "El correo ya está en uso."]);
    }
    exit();
}

if ($accion === 'eliminar_cuenta') {
    try {
        $pdo->prepare("UPDATE reservas SET id_usuario = NULL WHERE id_usuario = ?")->execute([$id_usuario]);
        $pdo->prepare("DELETE FROM cupones WHERE id_usuario = ?")->execute([$id_usuario]);
        $pdo->prepare("DELETE FROM codigos_reseteo WHERE id_usuario_asignado = ?")->execute([$id_usuario]);
        $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = ?")->execute([$id_usuario]);
        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "mensaje" => "Error al eliminar la cuenta."]);
    }
    exit();
}
?>