/* eslint-disable react/no-unknown-property */
import * as THREE from 'three'
import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, MeshReflectorMaterial } from '@react-three/drei';
import { Robot } from '../../public/models/Robot';
import UpdateCameraPosition from './UpdateCameraPosition';

// Función para normalizar ángulos
function normalizePi(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

// Constantes de control
const W_MAX = 1;
const V_MAX = 0.4;
const V_MIN = 0.1;
const TOLERANCE_DISTANCE = 0.03

// Clase Robot
class RobotClass {
  constructor(x, y, theta, wheelRadius, wheelDistance) {
    this.x = x;
    this.y = y;
    this.theta = theta * Math.PI / 180; // Convertir grados a radianes
    this.wheelRadius = wheelRadius; // Radio de las ruedas
    this.wheelDistance = wheelDistance; // Distancia entre las ruedas
    this.leftWheelRotation = 0; // Rotación actual de la rueda izquierda en radianes
    this.rightWheelRotation = 0; // Rotación actual de la rueda derecha en radianes
    this.rightWheelSpeed = 0;
    this.leftWheelSpeed = 0;

    this.basketRotation = Math.PI / 2; // Ángulo actual de la cesta en radianes
    this.basketSpeed = 0; // Velocidad del motor de la cesta en rad/s
    this.targetbasketRotation = 0; // Ángulo objetivo de la cesta en radianes
  }

  setSpeed(v, w) {
    if (this.wheelRadius > 0) {
      const mat1 = [
        [1 / this.wheelRadius, this.wheelDistance / (this.wheelRadius * 2)],
        [1 / this.wheelRadius, -this.wheelDistance / (this.wheelRadius * 2)]
      ];

      const mat2 = [v, w];

      const result = [
        mat1[0][0] * mat2[0] + mat1[0][1] * mat2[1],
        mat1[1][0] * mat2[0] + mat1[1][1] * mat2[1]
      ];

      this.rightWheelSpeed = result[0]; // Velocidad de la rueda derecha en rad/s
      this.leftWheelSpeed = result[1]; // Velocidad de la rueda izquierda en rad/s

    }
  }

  setBasketTargetAngle(angle, time) {
    this.targetbasketRotation = angle * Math.PI / 180; // Convertir grados a radianes
    const angleDifference = Math.abs(this.targetbasketRotation - this.basketRotation);
    this.basketSpeed = angleDifference / time; // Calcular la velocidad como distancia angular dividida por el tiempo
  }

  raiseBasket(time) {
    this.setBasketTargetAngle(90, time);
  }

  // Función específica para ajustar la cesta a 180 grados en un tiempo determinado
  lowerBasket(time) {
    this.setBasketTargetAngle(180, time);
  }

  move(v, w, dt) {
    this.setSpeed(v, w);

    const dx = v * Math.cos(this.theta) * dt;
    const dy = v * Math.sin(this.theta) * dt;
    const dth = w * dt;

    this.x += dx;
    this.y += dy;
    this.theta += dth;
    this.theta = normalizePi(this.theta);

    // Actualizar la rotación de las ruedas
    this.leftWheelRotation += this.leftWheelSpeed * dt;
    this.rightWheelRotation += this.rightWheelSpeed * dt;

    // Normalizar las rotaciones de las ruedas
    this.leftWheelRotation = normalizePi(this.leftWheelRotation);
    this.rightWheelRotation = normalizePi(this.rightWheelRotation);

    // Actualizar la rotación de la cesta
    if (this.basketRotation < this.targetbasketRotation) {
      this.basketRotation += this.basketSpeed * dt;
      if (this.basketRotation > this.targetbasketRotation) {
        this.basketRotation = this.targetbasketRotation;
      }
    } else if (this.basketRotation > this.targetbasketRotation) {
      this.basketRotation -= this.basketSpeed * dt;
      if (this.basketRotation < this.targetbasketRotation) {
        this.basketRotation = this.targetbasketRotation;
      }
    }

    this.basketRotation = normalizePi(this.basketRotation);

    return {
      x: this.x,
      y: this.y,
      theta: normalizePi(-this.theta + Math.PI / 2),
      leftWheelRotation: this.leftWheelRotation,
      rightWheelRotation: this.rightWheelRotation,
      basketRotation: this.basketRotation
    };
  }
}

// Clase TrajectoryFollower
class TrajectoryFollower {
  constructor(waypoints, kp, ka, kb) {
    this.waypoints = waypoints;
    this.kp = kp;
    this.ka = ka;
    this.kb = kb;
    this.currentTarget = 0;
    this.finished = false;
  }

  computeControl(robot) {
    if (this.finished) {
      return { v: 0, w: 0 };
    }
    const target = this.waypoints[this.currentTarget];
    const dx = target[0] - robot.x;
    const dy = target[1] - robot.y;
    const rho = Math.sqrt(dx ** 2 + dy ** 2);
    const alpha = normalizePi(Math.atan2(dy, dx) - robot.theta);
    const beta = -normalizePi(target[2] - Math.atan2(dy, dx));

    const v = Math.max(this.kp * rho, V_MIN);
    const w = this.ka * alpha + this.kb * beta;

    if (rho < TOLERANCE_DISTANCE) {
      this.currentTarget += 1;
      if (this.currentTarget >= this.waypoints.length) {
        this.currentTarget = 0;
        this.finished = true;
      }
    }
    return { v, w };
  }
}

// Clase PointFollower
class PointFollower {
  constructor(target, kp, ka, kb) {
    this.target = target;
    this.kp = kp;
    this.ka = ka;
    this.kb = kb;
    this.finished = false;
  }

  computeControl(robot) {
    if (this.finished) {
      return { v: 0, w: 0 };
    }
    const [targetX, targetY, targetTheta] = this.target;
    const dx = targetX - robot.x;
    const dy = targetY - robot.y;
    const rho = Math.sqrt(dx ** 2 + dy ** 2);
    const alpha = normalizePi(Math.atan2(dy, dx) - robot.theta);
    const beta = -normalizePi(targetTheta - Math.atan2(dy, dx));

    const v = this.kp * rho;
    const w = this.ka * alpha + this.kb * beta;

    if (rho < TOLERANCE_DISTANCE) {
      this.finished = true;
    }
    return { v, w };
  }
}

function updateRobotPosition(robotRef, rightWheelRef, leftWheelRef, basketRef, newPosition) {
  robotRef.position.x = newPosition.x * 10;
  robotRef.position.z = newPosition.y * 10;

  // console.log('update robot pos: ' + robotRef.position.x + ' ' + robotRef.position.z);
  robotRef.rotation.y = newPosition.theta;
  // console.log("right: ", newPosition.rightWheelRotation);
  // console.log("left: ", newPosition.leftWheelRotation);
  rightWheelRef.rotation.x = newPosition.rightWheelRotation;
  leftWheelRef.rotation.x = newPosition.leftWheelRotation;
  basketRef.rotation.x = newPosition.basketRotation;
}

const RobotSimulation = () => {
  const init_direction = 90
  const robot = new RobotClass(0, 0, init_direction, 0.12223, 0.02731);
  const robotRefs = useRef({
    robot: null,
    rightWheel: null,
    leftWheel: null,
    basket: null,
  });
  const [controller, setController] = useState(null);
  const [isRunning, setIsRunning] = useState(false);



  const waypoints = [
    [0.4, 0.6, Math.PI / 2],
    [1.2, 0.8, Math.PI / 4],
    [2, 1, -Math.PI / 4],
    [1.4, -0.6, Math.PI],
    [0.4, 0.6, Math.PI / 2]
  ];

  const distancias = waypoints.slice(0, -1).map((wp, i) => {
    const [x1, y1] = wp;
    const [x2, y2] = waypoints[i + 1];
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  });

  const maxDistancia = Math.max(...distancias);
  const kp = V_MAX / maxDistancia;
  const ka = W_MAX / (Math.PI / 4);
  const kb = W_MAX / (Math.PI / 2);

  useEffect(() => {
    let interval;
    if (isRunning && controller) {
      interval = setInterval(() => {
        const { v, w } = controller.computeControl(robot);
        const newPosition = robot.move(v, w, 0.05);

        updateRobotPosition(robotRefs.current.robot, robotRefs.current.rightWheel, robotRefs.current.leftWheel, robotRefs.current.basket, newPosition);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning, controller]);

  useEffect(() => {
    const handleBeforePrint = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const handleKeyDown = (event) => {
      if (event.key === 't') {
        event.preventDefault();
        event.stopPropagation();
        startTrajectory();
      } else if (event.key === 'y') {
        event.preventDefault();
        event.stopPropagation();
        moveToLocation();
      } else if (event.key === 'Enter') {
        robot.lowerBasket(1);
      } else if (event.key === 'Shift') {
        robot.raiseBasket(1);
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  });

  const startTrajectory = () => {
    setController(new TrajectoryFollower(waypoints, kp, ka, kb));
    setIsRunning(true);
  };

  const moveToLocation = () => {
    const targetPoint = [0, 1.2, Math.PI / 2];
    setController(new PointFollower(targetPoint, kp, ka, kb));
    setIsRunning(true);
  };

  return (
    <div>
      {/* <button onClick={startTrajectory}>Start Trajectory</button>
      <button onClick={moveToLocation}>Move to Point</button> */}
      <div className="CanvasContainer" style={{ background: 'black' }}>
        <Canvas
          shadows={true}  // Habilita el cálculo de sombras en el canvas
          camera={{ position: [200, 80, 200], fov: 50, zoom: 1 }} // Ajusta según sea necesario
          near={0.1} far={1000}
        >

          <pointLight castShadow={true} position={[-200, 100, 0]} intensity={35} decay={0.8}
            shadow-bias={-0.005} />
          <pointLight castShadow={true} position={[200, 100, 0]} intensity={35} decay={0.8}
            shadow-bias={-0.005} />
          <pointLight castShadow={true} position={[0, 100, 200]} intensity={35} decay={0.8}
            shadow-bias={-0.005} />
          <pointLight castShadow={true} position={[0, 100, -200]} intensity={35} decay={0.8}
            shadow-bias={-0.005} />

          {/* <OrbitControls /> */}
          <Robot ref={robotRefs} receiveShadow={true} castShadow={true} />
          <UpdateCameraPosition robotRef={robotRefs.current.robot} />
          {/* "Behind" or "Front" or "Static" or "Zenithal" or "Wheel" or "Basket" */}
          {/* <Grid position={[0, 0.1, 0]} cellSize={55} cellColor={"red"} sectionColor={"yellow"} cellThickness={0.1} infiniteGrid={true} fadeDistance={1000}

            width={55} height={555} widthSegments={1} heightSegments={1}
          /> */}
          <Grid position={[0, 0.1, 0]} scale={[4, 1, 4]} args={[16, 8, 1, 1]} infiniteGrid={false} fadeDistance={1000} />
          <mesh scale={999} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={true} castShadow={true}>
            <planeGeometry />
            <meshStandardMaterial color="white" />
            <MeshReflectorMaterial
              blur={[1080, 1080]} // Blur ground reflections (width, height), 0 skips blur
              mixBlur={1} // How much blur mixes with surface roughness (default = 1)
              mixStrength={0.5} // Strength of the reflections
              mixContrast={1} // Contrast of the reflections
              resolution={1080} // Off-buffer resolution, lower=faster, higher=better quality, slower
              mirror={1} // Mirror environment, 0 = texture colors, 1 = pick up env colors
              depthScale={1} // Scale the depth factor (0 = no depth, default = 0)
              minDepthThreshold={0} // Lower edge for the depthTexture interpolation (default = 0)
              maxDepthThreshold={0} // Upper edge for the depthTexture interpolation (default = 0)
              depthToBlurRatioBias={0.1} // Adds a bias factor to the depthTexture before calculating the blur amount [blurFactor = blurTexture * (depthTexture + bias)]. It accepts values between 0 and 1, default is 0.25. An amount > 0 of bias makes sure that the blurTexture is not too sharp because of the multiplication with the depthTexture
              distortion={0} // Amount of distortion based on the distortionMap texture
              distortionMap={null} // The red channel of this texture is used as the distortion map. Default is null
              debug={0}
              reflectorOffset={0} // Offsets the virtual camera that projects the reflection. Useful when the reflective surface is some distance from the object's origin (default = 0)
            />
          </mesh>
        </Canvas>
      </div>
    </div>
  );
};

export default RobotSimulation;
