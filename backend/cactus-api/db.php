<?php
$host = 'localhost';
$dbname = 'db_cactus_museum';
$username = 'root';
$password = ''; 

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
} catch(PDOException $e) {
    die(json_encode(["error" => "Error de conexión a la base de datos: " . $e->getMessage()]));
}
?>