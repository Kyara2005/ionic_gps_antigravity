# Ionic GPS - Antigravity

Aplicación desarrollada con Ionic + Angular y Capacitor para obtener la ubicación del dispositivo utilizando el servicio Antigravity GPS, permitiendo registrar coordenadas y realizar seguimiento de la ubicación en dispositivos Android.
<p align="center">
  <img width="30%" alt="icon" src="https://github.com/user-attachments/assets/5c6a04a1-95ef-434a-99f2-39a7e7eaf259" />
</p>

## Video demostrativo

El video cuenta con una duración de 3 minutos y se encuentra subido en la red social de Tiktok:

**Video:**
https://vt.tiktok.com/ZSCDfdtyR/
---

## Ejecutar

```bash
npm install

ionic serve

# Ejecutar en Android
ionic cap add android
ionic cap sync android
ionic cap run android

# Generar APK Debug
cd android
En build/ Generate App bundles o APK 
Generar APKS
```

APK generado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Prueba en teléfono Android

1. Instala el APK en un teléfono físico con el GPS activado.
2. Abre la aplicación.
3. Concede los permisos de ubicación solicitados por Android.
4. Si el dispositivo utiliza Android 11 o superior, selecciona **Permitir todo el tiempo** cuando el sistema lo solicite.
5. Presiona el botón **Iniciar seguimiento**.
6. Verifica que la aplicación comience a mostrar la ubicación actual.
7. Camina o desplázate al menos 10 metros para comprobar que las coordenadas cambian correctamente.
8. Si la aplicación utiliza seguimiento continuo, minimízala durante unos minutos y verifica que continúe registrando la ubicación.
9. Regresa a la aplicación y revisa el historial o listado de ubicaciones registradas.

--------------------------

# Capturas del funcionamiento

--------------------------

## Pantalla de inicio
<p align="center">
  <img width="30%" alt="image" src="https://github.com/user-attachments/assets/91e13c02-b0e4-4b6b-b408-4c4a33a6e425" />
  <img width="30%" alt="image" src="https://github.com/user-attachments/assets/cb24cf68-273a-45fe-b3c1-84d6cdd62bc7" />
</p>

La pantalla principal permite iniciar el seguimiento GPS y visualizar el estado actual del servicio.

---

## Solicitud de permisos

<p align="center">
  <img width="30%" src="https://github.com/user-attachments/assets/8658597b-c116-4bad-a270-4066fcbfae17" />
</p>

Durante el primer inicio, la aplicación solicita los permisos de ubicación necesarios para acceder al GPS del dispositivo.

---

## Obtención de ubicación

<img width="30%" alt="image" src="https://github.com/user-attachments/assets/a3b7187d-6ff7-4e03-a396-428f78eb0812" />

Una vez concedidos los permisos, la aplicación obtiene la ubicación actual mostrando información como:

- Latitud
- Longitud
- Precisión
- Fecha y hora del registro

---

## Seguimiento GPS

<img width="30%" alt="image" src="https://github.com/user-attachments/assets/54832aaa-d96f-42a8-9922-f714e7905497" />

La aplicación actualiza continuamente la ubicación del dispositivo mientras el seguimiento permanece activo.

---

---

## Segundo plano

<img width="30%" alt="image" src="https://github.com/user-attachments/assets/a528a0f5-a305-4d61-b5df-8c8037d45b68" />

La aplicación puede registrar la ubicacion en segundo plano cada 30 segundos de inactividad.

---

## Historial de ubicaciones

<img width="30%" alt="image" src="https://github.com/user-attachments/assets/e72bc2f5-1ade-4a5d-a789-045e5298724c" />

Se almacenan las ubicaciones obtenidas para consultar posteriormente el recorrido realizado.

---

## Modificación de distancia

<img width="30%" alt="image" src="https://github.com/user-attachments/assets/34b76ff9-1a84-470a-bd77-021290e85efc" />

---

## Tecnologías utilizadas

- Ionic Framework
- Angular
- Capacitor
- Antigravity GPS
- TypeScript
- Android Studio
