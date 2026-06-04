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

if ($accion === 'cargar') {
    try {
        $stmt_usuarios = $pdo->query("SELECT id_usuario, nombre, email, rol, visitas_presenciales, dni, telefono FROM usuarios ORDER BY id_usuario DESC");
        $usuarios = $stmt_usuarios->fetchAll(PDO::FETCH_ASSOC);

        $stmt_ventas = $pdo->query("
            SELECT r.id_reserva, r.fecha_reserva, r.total_pagado, r.tipo_comprobante, r.comprobante_pago, 
                   u.nombre as cliente, emp.nombre as empleado_nombre 
            FROM reservas r 
            LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario 
            LEFT JOIN usuarios emp ON r.atendido_por = emp.id_usuario 
            WHERE r.estado = 'recogido' 
            ORDER BY r.fecha_reserva DESC
        ");$stmt_ventas = $pdo->query("
            SELECT r.id_reserva, r.fecha_reserva, r.total_pagado, r.tipo_comprobante, r.comprobante_pago, 
                   u.nombre as cliente, emp.nombre as empleado_nombre 
            FROM reservas r 
            LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario 
            LEFT JOIN usuarios emp ON r.atendido_por = emp.id_usuario 
            WHERE r.estado = 'recogido' 
            ORDER BY r.fecha_reserva DESC
        ");
        $ventas = $stmt_ventas->fetchAll(PDO::FETCH_ASSOC);

        foreach ($ventas as &$venta) {
            $stmt_det = $pdo->prepare("
                SELECT p.nombre_comun, rd.cantidad 
                FROM reserva_detalles rd 
                JOIN productos p ON rd.id_cactus = p.id_producto 
                WHERE rd.id_reserva = ?
            ");
            $stmt_det->execute([$venta['id_reserva']]);
            $venta['detalles'] = $stmt_det->fetchAll(PDO::FETCH_ASSOC);
        }

        $stmt_total = $pdo->query("SELECT SUM(total_pagado) FROM reservas WHERE estado = 'recogido'");
        $ingresos_totales = $stmt_total->fetchColumn() ?: 0;

        echo json_encode(["success" => true, "usuarios" => $usuarios, "ventas" => $ventas, "ingresos_totales" => $ingresos_totales]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "mensaje" => "Error al cargar la base de datos: " . $e->getMessage()]);
    }
    exit();
}

if ($accion === 'cambiar_rol' || $accion === 'resetear_ruleta') {
    $id_admin = intval($_POST['id_admin'] ?? 0);
    $admin_password = trim($_POST['admin_password'] ?? '');
    $id_usuario_objetivo = intval($_POST['id_usuario_objetivo'] ?? 0);

    if (!$id_admin || !$admin_password || !$id_usuario_objetivo) {
        echo json_encode(["success" => false, "mensaje" => "Faltan datos para la validación de seguridad."]);
        exit();
    }

    try {
        $stmt_admin = $pdo->prepare("SELECT password FROM usuarios WHERE id_usuario = ? AND rol = 'admin'");
        $stmt_admin->execute([$id_admin]);
        $admin_hash = $stmt_admin->fetchColumn();

        if (!$admin_hash || !password_verify($admin_password, $admin_hash)) {
            echo json_encode(["success" => false, "mensaje" => "Contraseña de administrador incorrecta. Acción denegada."]);
            exit();
        }

        if ($accion === 'cambiar_rol') {
            $nuevo_rol = $_POST['nuevo_rol'];
            $pdo->prepare("UPDATE usuarios SET rol = ? WHERE id_usuario = ?")->execute([$nuevo_rol, $id_usuario_objetivo]);
            echo json_encode(["success" => true, "mensaje" => "Rol actualizado correctamente."]);
        } 
        elseif ($accion === 'resetear_ruleta') {
            $pdo->prepare("UPDATE usuarios SET fecha_ultimo_giro = NULL WHERE id_usuario = ?")->execute([$id_usuario_objetivo]);
            echo json_encode(["success" => true, "mensaje" => "Ruleta reseteada. El usuario puede girar hoy."]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "mensaje" => "Error en la base de datos."]);
    }
    exit();
}
?>