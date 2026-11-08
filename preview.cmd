@echo off
chcp 65001 >nul
title La Boutique Cat y Dog - Servidor local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se encontro Node.js.
  echo   Instalalo desde https://nodejs.org y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

rem Si el servidor ya esta andando, no lo volvemos a levantar
curl -s -o NUL http://127.0.0.1:8080/ && goto abrir

echo Levantando el servidor local (Node.js)...
start "Servidor - La Boutique (dejar abierto)" /min cmd /c "set NO_OPEN=1&& node tools\serve.js . 8080"

set /a intentos=0

:esperar
ping -n 2 127.0.0.1 >nul
curl -s -o NUL http://127.0.0.1:8080/ && goto abrir
set /a intentos+=1
if %intentos% lss 12 goto esperar

echo.
echo No se pudo levantar el servidor.
echo Fijate que Node.js este instalado (https://nodejs.org) y volve a intentar.
pause
exit /b 1

:abrir
start "" "http://localhost:8080/"
start "" "http://localhost:8080/admin/editor.html"
echo.
echo Web:    http://localhost:8080/
echo Panel:  http://localhost:8080/admin/editor.html
echo (Desde la web tambien podes entrar al panel con el icono de usuario,
echo  arriba a la derecha.)
echo (Deja abierta la ventanita "Servidor - La Boutique" mientras lo usas.)
pause
