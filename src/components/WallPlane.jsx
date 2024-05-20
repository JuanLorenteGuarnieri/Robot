// WallPlane.js
import React from 'react';
import { useThree } from '@react-three/fiber';

const WallPlane = ({ position, rotation, size }) => {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="cyan" side={2} transparent={false} opacity={0.3} />
    </mesh>
  );
};

export default WallPlane;
