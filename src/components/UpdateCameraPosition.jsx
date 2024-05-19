import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";


// Función para normalizar ángulos
function normalizePi(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

const UpdateCameraPosition = ({ robotRef }) => {
  const { camera } = useThree();
  const [robotPosition, setRobotPosition] = useState({ x: 0, y: 0, z: 0 });
  const [robotRotation, setRobotRotation] = useState({ y: 0 });
  const [typeCamera, setTypeCamera] = useState("Behind");
  const prevRobotState = useRef({ position: robotPosition, rotation: robotRotation });

  useEffect(() => {
    const updateRobotState = () => {
      const { x, y, z } = robotRef.position;
      const rotationY = robotRef.rotation.y;

      const positionChanged = x !== prevRobotState.current.position.x ||
        y !== prevRobotState.current.position.y ||
        z !== prevRobotState.current.position.z;

      const rotationChanged = rotationY !== prevRobotState.current.rotation.y;

      if ((positionChanged && rotationChanged) ||
        (positionChanged && !rotationChanged) ||
        (!positionChanged && rotationChanged)) {
        setRobotPosition({ x, y, z });
        setRobotRotation({ y: rotationY });
        prevRobotState.current = { position: { x, y, z }, rotation: { y: rotationY } };
      }
    };

    const interval = setInterval(updateRobotState, 50); // Ajusta el intervalo según tus necesidades
    return () => clearInterval(interval);
  }, [robotRef]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        setTypeCamera((prevType) => {
          const types = ["Behind", "Front", "Zenithal", "Wheel", "Basket"];
          const currentIndex = types.indexOf(prevType);
          return types[(currentIndex + 1) % types.length];
        });
      } else if (event.key === "ArrowRight") {
        setTypeCamera((prevType) => {
          const types = ["Behind", "Front", "Zenithal", "Wheel", "Basket"];
          const currentIndex = types.indexOf(prevType);
          return types[(currentIndex - 1 + types.length) % types.length];
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {

    if (typeCamera === "Behind") {
      const radius = 3.5; // Define el radio de la órbita
      const th = normalizePi(robotRotation.y + Math.PI);
      const x = radius * Math.sin(th);
      const z = radius * Math.cos(th);
      camera.position.set(x + robotPosition.x, 2.5, z + robotPosition.z);
      camera.lookAt(robotPosition.x, 2.0, robotPosition.z);
    } else if (typeCamera === "Front") {
      const radius = 0.7; // Define el radio de la órbita
      const distance_from_floor = 0.7;
      const th = robotRotation.y;
      const x = radius * Math.sin(th);
      const z = radius * Math.cos(th);
      camera.position.set(x + robotPosition.x, distance_from_floor - 0.1, z + robotPosition.z);
      camera.lookAt(x * 5 + robotPosition.x, distance_from_floor, z * 5 + robotPosition.z);
    } else if (typeCamera === "Zenithal") {
      camera.position.set(0, 40, 0);
      camera.lookAt(0, 0, 0);
    } else if (typeCamera === "Wheel") {
      const radius = 1.4; // Define el radio de la órbita
      const distance_from_floor = 0.6;
      const th = normalizePi(robotRotation.y + Math.PI / 1.4);
      const th_look = robotRotation.y;
      const x_pos = radius * Math.sin(th);
      const z_pos = radius * Math.cos(th);
      const x_look = radius * 4 * Math.sin(th_look);
      const z_look = radius * 4 * Math.cos(th_look);
      camera.position.set(x_pos + robotPosition.x, distance_from_floor, z_pos + robotPosition.z);
      camera.lookAt(x_look + robotPosition.x, distance_from_floor, z_look + robotPosition.z);
    } else if (typeCamera === "Basket") {
      const radius = 2.5; // Define el radio de la órbita
      const distance_from_floor = 0.9;
      const th = normalizePi(robotRotation.y + Math.PI / 12);
      const x_pos = radius * Math.sin(th);
      const z_pos = radius * Math.cos(th);
      camera.position.set(x_pos + robotPosition.x, distance_from_floor, z_pos + robotPosition.z);
      camera.lookAt(robotPosition.x, distance_from_floor - 0.1, robotPosition.z);
    }
  }, [robotPosition, robotRotation, typeCamera]);

  return;
};

export default UpdateCameraPosition;
