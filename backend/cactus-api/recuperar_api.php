<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db.php';

$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);
$accion = $data['accion'] ?? '';

date_default_timezone_set('America/Lima');

if ($accion === 'solicitar_codigo') {
    $email = trim($data['email'] ?? '');
    if (!$email) { echo json_encode(["success" => false, "mensaje" => "Correo no proporcionado."]); exit(); }

    $stmt = $pdo->prepare("SELECT id_usuario, nombre FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$usuario) {
        echo json_encode(["success" => false, "mensaje" => "Si el correo existe, se ha enviado un código."]);
        exit();
    }

    $codigo = sprintf("%06d", mt_rand(100000, 999999));
    $expira_en = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $pdo->prepare("DELETE FROM codigos_reseteo WHERE email = ?")->execute([$email]);
    
    $stmt_insert = $pdo->prepare("INSERT INTO codigos_reseteo (email, codigo, expira_en) VALUES (?, ?, ?)");
    $stmt_insert->execute([$email, $codigo, $expira_en]);

    $asunto = "Código de Recuperación - Cactus Museum";
    $mensaje = "Hola " . $usuario['nombre'] . ",\n\nTu código de recuperación es: " . $codigo . "\n\nEste código expira en 15 minutos. Si no solicitaste esto, ignora este mensaje.";
    $headers = "From: noreply@cactusmuseum.com";

    $correo_enviado = @mail($email, $asunto, $mensaje, $headers);

    echo json_encode([
        "success" => true, 
        "mensaje" => "Si el correo existe, se ha enviado un código.",
        "codigo_debug" => $codigo // Eliminamos esta línea cuando ya se suba al hosting, no te olvides de eso Yasmin
    ]);
    exit();
}

if ($accion === 'cambiar_password') {
    $email = trim($data['email'] ?? '');
    $codigo_ingresado = trim($data['codigo'] ?? '');
    $nueva_password = trim($data['nueva_password'] ?? '');

    if (!$email || !$codigo_ingresado || !$nueva_password) {
        echo json_encode(["success" => false, "mensaje" => "Faltan datos."]); exit();
    }

    $stmt = $pdo->prepare("SELECT * FROM codigos_reseteo WHERE email = ? AND codigo = ? AND expira_en > NOW()");
    $stmt->execute([$email, $codigo_ingresado]);
    $registro = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$registro) {
        echo json_encode(["success" => false, "mensaje" => "El código es incorrecto o ha expirado."]);
        exit();
    }

    $hash = password_hash($nueva_password, PASSWORD_DEFAULT);

    $stmt_update = $pdo->prepare("UPDATE usuarios SET password = ? WHERE email = ?");
    $stmt_update->execute([$hash, $email]);

    $pdo->prepare("DELETE FROM codigos_reseteo WHERE email = ?")->execute([$email]);

    echo json_encode(["success" => true, "mensaje" => "Contraseña actualizada con éxito."]);
    exit();
}

echo json_encode(["success" => false, "mensaje" => "Acción no válida."]);
?>