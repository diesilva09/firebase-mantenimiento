-- Script para agregar el nuevo usuario INVITADO
-- Este script agrega al usuario con UID: iRFE7y982AOTUBZPYJ3OAfDjmb42
-- y correo: solicitudesmantenimiento2@gmail.com con el rol INVITADO

INSERT INTO usuarios (id, email, rol, activo, nombre) 
VALUES (
  'iRFE7y982AOTUBZPYJ3OAfDjmb42',
  'solicitudesmantenimiento2@gmail.com',
  'INVITADO',
  true,
  'solicitudesmantenimiento2'
)
ON CONFLICT (id) DO UPDATE 
SET rol = 'INVITADO', email = 'solicitudesmantenimiento2@gmail.com';
