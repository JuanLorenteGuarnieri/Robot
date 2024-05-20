// MapComponent.js
import React, { useState, useEffect } from 'react';
import Map2D from './map2d';
import { Grid } from '@react-three/drei';
import CustomGrid from './CustomGrid';
import WallPlane from './WallPlane';

const MapComponent = ({ mapDescriptionFile, map, setMap }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const loadMap = async () => {
      const newMap = new Map2D(mapDescriptionFile);
      await newMap.loadMap(mapDescriptionFile); // Asegúrate de que el método loadMap sea asincrónico
      setMap(newMap);
      setIsMapLoaded(true);
    };

    loadMap();
  }, [mapDescriptionFile]);

  const renderWalls = () => {
    if (!isMapLoaded) return null;

    const walls = [];
    const { connectionMatrix, sizeCell, sizeX, sizeY } = map;
    const wallThickness = 0.04;

    for (let i = 0; i < 2 * sizeX + 1; i++) {
      for (let j = 0; j < 2 * sizeY + 1; j++) {
        if (connectionMatrix[i][j] == 0) {
          let position, rotation, size;

          // Horizontal walls
          if (i % 2 === 1 && j % 2 === 0) {
            position = [
              ((2 * sizeX - i) / 2 - sizeX / 2) * sizeCell / 100 - (sizeX * sizeCell / 200),
              0,
              (j - sizeY) * sizeCell / 100 * 0.5 + (sizeY * sizeCell / 200)
            ];
            rotation = [0, 0, Math.PI / 2];
            size = [sizeCell / 100, sizeCell / 100, wallThickness];
          }

          // Vertical walls
          if (i % 2 === 0 && j % 2 === 1) {
            position = [
              ((2 * sizeX - i) - sizeX) * sizeCell / 100 * 0.5 - (sizeX * sizeCell / 200),
              0,
              (j / 2 - sizeY / 2) * sizeCell / 100 + (sizeY * sizeCell / 200),
            ];
            rotation = [Math.PI / 2, Math.PI / 2, 0];
            size = [sizeCell / 100, sizeCell / 100, wallThickness];
          }

          if (position && rotation && size) {
            walls.push(
              <WallPlane
                key={`${i}-${j}`}
                position={position}
                rotation={rotation}
                size={size}
              />
            );
          }
        }
      }
    }

    return walls;
  };

  return (
    <>
      {isMapLoaded ? (
        <>
          <CustomGrid
            cellSize={map.sizeCell / 100}
            widthCells={map.sizeX}
            heightCells={map.sizeY}
          />
          {renderWalls()}
        </>
      ) : (
        <CustomGrid />
      )}
    </>
  );
};

export default MapComponent;
