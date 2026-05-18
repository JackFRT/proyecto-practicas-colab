<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

require_once 'db.php';

$json_crudo = file_get_contents("php://input");
$data = json_decode($json_crudo);

$correo_recibido = $data->email ?? $data->correo ?? '';

if (empty($correo_recibido) || empty($data->password)) {
    echo json_encode(["success" => false, "mensaje" => "Faltan datos de correo o contraseña."]);
    exit();
}

$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
$stmt->execute([$correo_recibido]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(["success" => false, "mensaje" => "Este correo no está registrado."]);
    exit();
}

if (password_verify($data->password, $user['password'])) {
    unset($user['password']);
    echo json_encode([
        "success" => true, 
        "mensaje" => "Bienvenido " . $user['nombre'],
        "usuario" => $user
    ]);
} else {
    echo json_encode(["success" => false, "mensaje" => "La contraseña es incorrecta."]);
}
?>