<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db.php';

$json_crudo = file_get_contents("php://input");
$data = json_decode($json_crudo);

if (empty($data->nombre) || empty($data->email) || empty($data->password)) {
    echo json_encode(["success" => false, "mensaje" => "Faltan datos para el registro."]);
    exit();
}

try {
    $stmt_check = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE email = ?");
    $stmt_check->execute([$data->email]);
    
    if ($stmt_check->rowCount() > 0) {
        echo json_encode(["success" => false, "mensaje" => "Este correo ya está registrado."]);
        exit();
    }
    $password_encriptada = password_hash($data->password, PASSWORD_BCRYPT);

    $stmt_insert = $pdo->prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'cliente')");
    $exito = $stmt_insert->execute([$data->nombre, $data->email, $password_encriptada]);

    if ($exito) {
        echo json_encode(["success" => true, "mensaje" => "¡Cuenta creada con éxito!"]);
    } else {
        echo json_encode(["success" => false, "mensaje" => "No se pudo crear la cuenta."]);
    }

} catch (PDOException $e) {
    echo json_encode(["success" => false, "mensaje" => "Error en BD: " . $e->getMessage()]);
}
?>