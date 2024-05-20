// map2d.js
// import * as d3 from 'd3';
// import * as math from 'mathjs';

class Map2D {
  constructor(mapDescriptionFile) {
    this.mapLineStyle = 'red';
    this.costValueStyle = 'green';
    this.verbose = false;
    this.currentAx = null;

    this.sizeX = 0;
    this.sizeY = 0;
    this.sizeCell = 0;

    this.connectionMatrix = null;
    this.costMatrix = null;
    this.currentPath = null;
    this.paredesEliminadas = [];

    this.loadMap(mapDescriptionFile);
  }

  initConnections(initValue = 0) {
    this.connectionMatrix = Array.from({ length: 2 * this.sizeX + 1 }, () => Array(2 * this.sizeY + 1).fill(initValue));
  }

  initCostMatrix(initValue = -2) {
    this.costMatrix = Array.from({ length: this.sizeX }, () => Array(this.sizeY).fill(initValue));
  }

  async loadMap(mapFileName) {
    try {
      const response = await fetch(mapFileName);
      const data = await response.text();
      const lines = data.split('\n');
      const header = lines[0].trim().split(' ').map(Number);

      if (header.length === 3) {
        [this.sizeX, this.sizeY, this.sizeCell] = header;
      } else {
        console.error('Wrong header in map file:', header);
        return false;
      }

      this.initConnections();
      this.initCostMatrix();

      lines.slice(1).forEach((line, indx) => {
        const currentRow = this.connectionMatrix[0].length - 1 - indx;
        const parsedLine = line.trim().split(' ').map(Number);

        if (parsedLine.length === this.connectionMatrix.length) {
          this.connectionMatrix.forEach((_, colIdx) => {
            this.connectionMatrix[colIdx][currentRow] = parsedLine[colIdx];
          });
        }
        // else if (parsedLine.length) {
        //   console.log(this.connectionMatrix);
        //   console.error('Wrong connectionMatrix row data:', parsedLine);
        //   return false;
        // }
      });
      console.log(this.connectionMatrix);

      return true;
    } catch (e) {
      console.error('ERROR:', e);
      return false;
    }
  }

  cell2connCoord(cellX, cellY, numNeigh) {
    const connX = 2 * cellX + 1;
    const connY = 2 * cellY + 1;

    const directions = {
      0: [connX, connY + 1],
      1: [connX + 1, connY + 1],
      2: [connX + 1, connY],
      3: [connX + 1, connY - 1],
      4: [connX, connY - 1],
      5: [connX - 1, connY - 1],
      6: [connX - 1, connY],
      7: [connX - 1, connY + 1],
    };

    return directions[numNeigh];
  }

  pos2cell(x_mm, y_mm) {
    const xCell = Math.floor(x_mm / this.sizeCell);
    const yCell = Math.floor(y_mm / this.sizeCell);
    return [xCell, yCell];
  }

  cell2pos(x_cell, y_cell) {
    const x_m = x_cell * 0.4 + 0.2;
    const y_m = y_cell * 0.4 + 0.2;
    return [x_m, y_m];
  }

  setConnection(cellX, cellY, numNeigh) {
    const [connX, connY] = this.cell2connCoord(cellX, cellY, numNeigh);
    const posiblePared = [connX, connY, cellX, cellY, numNeigh];
    this.connectionMatrix[connX][connY] = 1;

    if (this.connectionMatrix[connX][connY] !== 1 && this.paredesEliminadas.includes(posiblePared)) {
      this.paredesEliminadas = this.paredesEliminadas.filter(p => p !== posiblePared);
      this.connectionMatrix[connX][connY] = 1;
    }
  }

  deleteConnection(cellX, cellY, numNeigh) {
    const [connX, connY] = this.cell2connCoord(cellX, cellY, numNeigh);
    if (this.connectionMatrix[connX][connY] !== 0) {
      this.paredesEliminadas.push([connX, connY, cellX, cellY, numNeigh]);
      this.connectionMatrix[connX][connY] = 0;
    }
  }

  isConnected(cellX, cellY, numNeigh) {
    const [connX, connY] = this.cell2connCoord(cellX, cellY, numNeigh);
    return this.connectionMatrix[connX][connY] === 1;
  }

  fillCostMatrix(xIni, yIni, xGoal, yGoal) {
    this.costMatrix = Array.from({ length: this.sizeX }, () => Array(this.sizeY).fill(-Infinity));
    this.costMatrix[xGoal][yGoal] = 0;

    const directions = [
      [0, 1, 0],
      [1, 0, 2],
      [0, -1, 4],
      [-1, 0, 6],
    ];

    const queue = [[xGoal, yGoal]];

    while (queue.length && this.costMatrix[xIni][yIni] === -Infinity) {
      const [x, y] = queue.shift();

      directions.forEach(([dx, dy, neigh]) => {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.sizeX && ny >= 0 && ny < this.sizeY && this.isConnected(x, y, neigh) && this.costMatrix[nx][ny] === -Infinity) {
          this.costMatrix[nx][ny] = this.costMatrix[x][y] + 1;
          queue.push([nx, ny]);
        }
      });
    }
  }

  findPath(xIni, yIni, xGoal, yGoal) {
    this.fillCostMatrix(xIni, yIni, xGoal, yGoal);

    const directions = [
      [0, 1, 0],
      [1, 0, 2],
      [0, -1, 4],
      [-1, 0, 6],
    ];

    const path = [];
    let currentPos = [xIni, yIni];

    while (currentPos[0] !== xGoal || currentPos[1] !== yGoal) {
      path.push(currentPos);
      const [cx, cy] = currentPos;

      const validNeighbors = directions
        .map(([dx, dy, celda]) => [cx + dx, cy + dy, celda])
        .filter(
          ([nx, ny, celda]) =>
            nx >= 0 &&
            nx < this.sizeX &&
            ny >= 0 &&
            ny < this.sizeY &&
            this.isConnected(cx, cy, celda) &&
            this.costMatrix[nx][ny] !== -Infinity &&
            !path.includes([nx, ny])
        );

      if (!validNeighbors.length) {
        return [];
      }

      validNeighbors.sort((a, b) => this.costMatrix[a[0]][a[1]] - this.costMatrix[b[0]][b[1]]);
      currentPos = [validNeighbors[0][0], validNeighbors[0][1]];
    }

    path.push([xGoal, yGoal]);
    return path;
  }

  drawMap() {
    // Implement the logic to draw the map using d3 or another library
  }
}

export default Map2D;
