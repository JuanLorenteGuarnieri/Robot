// CustomGrid.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

const CustomGrid = ({
  cellSize = 4,
  widthCells = 1,
  heightCells = 1,
  color = 'blue',
  lineThickness = 1,
  centered = false
}) => {
  const gridRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    const halfWidth = (widthCells * cellSize) / 2;
    const halfHeight = (heightCells * cellSize) / 2;

    const startX = centered ? -halfWidth : -2 * halfWidth;
    const startZ = centered ? -halfHeight : 0;

    const gridHelper = new THREE.Group();

    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: lineThickness,
    });

    // Vertical lines
    for (let i = 0; i <= widthCells; i++) {
      const points = [];
      points.push(new THREE.Vector3(startX + i * cellSize, 0.01, startZ));
      points.push(new THREE.Vector3(startX + i * cellSize, 0.01, startZ + heightCells * cellSize));

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      gridHelper.add(line);
    }

    // Horizontal lines
    for (let j = 0; j <= heightCells; j++) {
      const points = [];
      points.push(new THREE.Vector3(startX, 0, startZ + j * cellSize));
      points.push(new THREE.Vector3(startX + widthCells * cellSize, 0, startZ + j * cellSize));

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      gridHelper.add(line);
    }

    gridRef.current = gridHelper;
    scene.add(gridHelper);

    return () => {
      scene.remove(gridHelper);
    };
  }, [cellSize, widthCells, heightCells, color, lineThickness, centered, scene]);

  return null;
};

export default CustomGrid;
