<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $pagina = $_POST['pagina'] ?? 'Sitio web'; // Nombre de la página
    $entrada = $_POST['entrada'] ?? '';
    $salida = $_POST['salida'] ?? '';
    $adultos = $_POST['adultos'] ?? '';
    $ninos = $_POST['ninos'] ?? '';
    $nombre = $_POST['nombre'] ?? '';
    $email = $_POST['email'] ?? '';
    $telefono = $_POST['telefono'] ?? '';
    $comentarios = $_POST['comentarios'] ?? '';

    // ✅ ASUNTO DINÁMICO según página
    $asunto = "🆕 Reserva $pagina";
    
    $mensaje = "¡Nueva reserva desde $pagina!\n\n";
    $mensaje .= "🏠 PROPIEDAD: $pagina\n";
    $mensaje .= "📅 FECHAS:\n";
    $mensaje .= "Entrada: $entrada\n";
    $mensaje .= "Salida: $salida\n\n";
    $mensaje .= "👥 HUESPÉDES:\n";
    $mensaje .= "Adultos: $adultos | Niños: $ninos\n\n";
    $mensaje .= "👤 CLIENTE:\n";
    $mensaje .= "Nombre: $nombre\n";
    $mensaje .= "Email: $email\n";
    $mensaje .= "Teléfono: $telefono\n\n";
    $mensaje .= "💬 COMENTARIOS:\n";
    $mensaje .= $comentarios ?: "Ninguno";

    // CAMBIA POR TU EMAIL
    $destinatario = "casablavapeniscola@gmail.com";
    $headers = "From: casablavapeniscola@gmail.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    if (mail($destinatario, $asunto, $mensaje, $headers)) {
        echo "OK";
    } else {
        echo "ERROR";
    }
}
?>
