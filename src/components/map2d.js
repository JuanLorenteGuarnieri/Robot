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

  // TODO draw functions

  drawCostMatrixColors(self, x_ini, y_ini, x_end, y_end) {
    // TODO
  }

  drawRobot(self, loc_x_y_th = [0, 0, 0], robotPlotStyle = 'b', small = False) {
    // TODO
  }

  findPath(point_ini, point_end) {
    return this.planPath(point_ini[0], point_ini[1], point_end[0], point_end[1]);
  }

  fillCostMatrix(x_ini, y_ini, x_goal, y_goal) {
    // Inicializa la matriz de costos con valores infinitos negativos para todas las celdas.
    this.costMatrix = Array.from({ length: this.sizeX }, () => Array(this.sizeY).fill(-Infinity));
    // Establece el costo de la celda objetivo a 0, ya que es el punto de partida para el cálculo de costos.
    this.costMatrix[x_goal][y_goal] = 0;

    // Lista las direcciones cardinales y su codificación correspondiente para el seguimiento de conexiones.
    const directions = [
      [0, 1, 0],
      [1, 0, 2],
      [0, -1, 4],
      [-1, 0, 6]
    ];
    // Inicializa la cola con la posición de la celda objetivo.
    let queue = [[x_goal, y_goal]];

    // Procesa la cola hasta que se llene la matriz de costos o se alcance la celda inicial.
    while (queue.length && this.costMatrix[x_ini][y_ini] === -Infinity) {
      const [x, y] = queue.shift(); // Extrae la primera celda de la cola.

      // Itera sobre cada dirección posible desde la celda actual.
      for (const [dx, dy, neigh] of directions) {
        const nx = x + dx;
        const ny = y + dy; // Calcula la nueva posición basada en la dirección actual.

        // Verifica si la nueva posición está dentro de los límites y si hay conexión directa.
        if (
          nx >= 0 && nx < this.sizeX &&
          ny >= 0 && ny < this.sizeY &&
          this.isConnected(x, y, neigh) &&
          this.costMatrix[nx][ny] === -Infinity
        ) {
          // Establece el costo de la celda vecina incrementando el costo de la celda actual por 1.
          this.costMatrix[nx][ny] = this.costMatrix[x][y] + 1;
          // Añade la nueva celda a la cola para su posterior procesamiento.
          queue.push([nx, ny]);
        }
      }
    }
  }

  checkPared(x_ini, y_ini, pared) {
    const [connX, connY, cellX, cellY, numNeigh] = pared;
    this.fillCostMatrix(x_ini, y_ini, cellX, cellY);
    // console.log(this.costMatrix);

    let path = [];
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0]
    ]; // Movimientos en cuatro direcciones
    let current_pos = [x_ini, y_ini];
    while (current_pos[0] !== cellX || current_pos[1] !== cellY) {
      // Agrega la posición actual a la ruta
      path.push(current_pos);

      // Inicializa una lista para almacenar los vecinos válidos
      let valid_neighbors = [];
      let celda = 0;
      // Itera sobre los vecinos posibles
      for (const [dx, dy] of directions) {
        // Calcula la posición del vecino
        let nx = current_pos[0] + dx;
        let ny = current_pos[1] + dy;
        if (nx < 0 || nx >= this.sizeX) nx = current_pos[0];
        if (ny < 0 || ny >= this.sizeY) ny = current_pos[1];

        // Verifica si el vecino está dentro de los límites del mapa y si es accesible
        if (
          nx >= 0 && nx < this.sizeX &&
          ny >= 0 && ny < this.sizeY &&
          this.isConnected(current_pos[0], current_pos[1], celda) &&
          !path.includes([nx, ny])
        ) {
          // Si el vecino no ha sido visitado y tiene un costo asignado, lo agrega a la lista de vecinos válidos
          if (!valid_neighbors.some(v => v[0] === nx && v[1] === ny) && this.costMatrix[nx][ny] !== -Infinity) {
            valid_neighbors.push([[nx, ny], this.costMatrix[nx][ny]]);
          }
        }
        celda += 2;
      }

      // Ordena los vecinos válidos por el costo
      valid_neighbors.sort((a, b) => a[1] - b[1]);
      if (!valid_neighbors.length) {
        return [false, []];
      } else {
        current_pos = valid_neighbors[0][0];
      }
    }

    if (path.length > 0) {
      path.push([cellX, cellY]);
    }

    console.log("Check path: ", path);
    return [true, path];
  }

  planPath(x_ini, y_ini, x_goal, y_goal, is_BFS = false) {
    if (is_BFS) {
      return this.planPath_BFS(x_ini, y_ini, x_goal, y_goal);
    } else {
      return this.planPath_NF1(x_ini, y_ini, x_goal, y_goal);
    }
  }

  planPath_NF1(x_ini, y_ini, x_goal, y_goal) {
    this.fillCostMatrix(x_ini, y_ini, x_goal, y_goal);

    let path = [];
    const directions = [
      [0, 1, 0],
      [1, 0, 2],
      [0, -1, 4],
      [-1, 0, 6]
    ];
    let current_pos = [x_ini, y_ini];
    console.log("Posición inicial: ", x_ini, y_ini);

    while (current_pos[0] !== x_goal || current_pos[1] !== y_goal) {
      path.push(current_pos);

      let valid_neighbors = [];
      for (const [dx, dy, celda] of directions) {
        const nx = current_pos[0] + dx;
        const ny = current_pos[1] + dy;
        if (
          nx >= 0 && nx < this.sizeX &&
          ny >= 0 && ny < this.sizeY &&
          this.isConnected(current_pos[0], current_pos[1], celda) &&
          !path.includes([nx, ny])
        ) {
          if (!valid_neighbors.some(v => v[0] === nx && v[1] === ny) && this.costMatrix[nx][ny] !== -Infinity) {
            valid_neighbors.push([[nx, ny], this.costMatrix[nx][ny]]);
          }
        }
      }
      valid_neighbors.sort((a, b) => a[1] - b[1]);
      if (!valid_neighbors.length) {
        return [];
      }
      current_pos = valid_neighbors[0][0];
    }

    path.push([x_goal, y_goal]);
    return path;
  }

  planPath_BFS(x_ini, y_ini, x_goal, y_goal) {
    const queue = [[x_ini, y_ini, [[x_ini, y_ini, 0, 0]], null]];
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0]
    ];
    let shortest_paths = [];
    let min_length = Infinity;
    let new_path = null;

    while (queue.length) {
      const [x, y, path, last_dir] = queue.shift();

      if (x === x_goal && y === y_goal) {
        if (path.length < min_length) {
          min_length = path.length;
          shortest_paths = [path];
        } else if (path.length === min_length) {
          shortest_paths.push(path);
        }
        continue;
      }

      for (let i = 0; i < directions.length; i++) {
        const [dx, dy] = directions[i];
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 && nx < this.sizeX &&
          ny >= 0 && ny < this.sizeY &&
          this.isConnected(x, y, i * 2) &&
          !path.some(p => p[0] === nx && p[1] === ny)
        ) {
          new_path = [...path];
          let left_count = path[path.length - 1][2];
          let turn_count = path[path.length - 1][3];
          if (this.isConnected(x, y, (i * 2 + 2) % 8)) left_count++;
          if (last_dir !== null && last_dir !== i) turn_count++;
          new_path.push([nx, ny, left_count, turn_count]);
          queue.push([nx, ny, new_path, i]);
        }
      }
    }

    const sorted_paths = shortest_paths.sort((a, b) => b[b.length - 1][2] - a[a.length - 1][2]);
    const max_left_count = sorted_paths.length ? sorted_paths[0][sorted_paths[0].length - 1][2] : 0;
    const paths_with_max_left = sorted_paths.filter(path => path[path.length - 1][2] === max_left_count);
    const paths_with_max_left_and_min_turns = paths_with_max_left.sort((a, b) => a[a.length - 1][3] - b[b.length - 1][3]);
    const min_turns = paths_with_max_left_and_min_turns.length ? paths_with_max_left_and_min_turns[0][paths_with_max_left_and_min_turns[0].length - 1][3] : 0;
    const final_paths = paths_with_max_left_and_min_turns.filter(path => path[path.length - 1][3] === min_turns);

    const formatted_paths = final_paths.map(path => path.map(([x, y]) => [x, y]));

    if (formatted_paths.length === 0) return [];
    return formatted_paths[0];
  }

  replanPath(x_ini, y_ini, x_goal, y_goal) {
    let path = this.planPath(x_ini, y_ini, x_goal, y_goal);
    while (path.length === 0) {
      console.log("Elimino una barrera e intento ir por ahí");
      this.paredesEliminadas.sort((a, b) => this.costMatrix[a[2]][a[3]] - this.costMatrix[b[2]][b[3]]);
      const [kk, kk2, cellX, cellY, neigh] = this.paredesEliminadas.shift();
      this.setConnection(cellX, cellY, neigh);
      path = this.planPath(x_ini, y_ini, x_goal, y_goal);
    }
    return path;
  }

  addObstacle(cellX, cellY, th) {
    th = (th * 180) / Math.PI;
    let rounded_th = Math.round(th / 90) * 90;
    rounded_th = (rounded_th % 360 + 360) % 360;

    const neighbor_directions = {
      0: 2,
      90: 0,
      180: 6,
      270: 4,
      '-90': 4,
      '-180': 6,
      '-270': 0
    };

    this.deleteConnection(cellX, cellY, neighbor_directions[rounded_th]);
  }

  deleteObstacle(cellX, cellY, th) {
    th = (th * 180) / Math.PI;
    let rounded_th = Math.round(th / 90) * 90;
    rounded_th = (rounded_th % 360 + 360) % 360;

    const neighbor_directions = {
      0: 2,
      90: 0,
      180: 6,
      270: 4,
      '-90': 4,
      '-180': 6,
      '-270': 0
    };

    this.setConnection(cellX, cellY, neighbor_directions[rounded_th]);
  }

}

export default Map2D;
